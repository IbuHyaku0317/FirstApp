using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Memory.Application;
using Memory.Domain;
using Memory.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var jwt = builder.Configuration.GetSection("Jwt");
var signingKey = jwt["SigningKey"] ?? throw new InvalidOperationException("Jwt:SigningKey is required.");
builder.Services.AddProblemDetails();
builder.Services.Configure<MediaOptions>(builder.Configuration.GetSection("Media"));
builder.Services.AddDbContext<MemoryDbContext>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Database")));
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<IMediaStorage, LocalMediaStorage>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o => o.TokenValidationParameters = new()
{
    ValidIssuer = jwt["Issuer"],
    ValidAudience = jwt["Audience"],
    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
    ValidateIssuer = true,
    ValidateAudience = true,
    ValidateIssuerSigningKey = true,
    ValidateLifetime = true,
    ClockSkew = TimeSpan.FromSeconds(30)
});
builder.Services.AddAuthorization(o => o.AddPolicy("PremiumMember", p => p.RequireClaim("membership", "premium")));
builder.Services.AddRateLimiter(o => { o.RejectionStatusCode = 429; o.AddFixedWindowLimiter("sensitive", x => { x.PermitLimit = 10; x.Window = TimeSpan.FromMinutes(1); }); });
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();
app.UseExceptionHandler(); app.UseStatusCodePages(); app.UseCors(); app.UseRateLimiter(); app.UseAuthentication(); app.UseAuthorization();

var api = app.MapGroup("/api/v1");
var auth = api.MapGroup("/auth").RequireRateLimiting("sensitive");

auth.MapPost("/register", async ([FromBody] RegisterRequest req, MemoryDbContext db, IPasswordHasher<User> hasher, TokenService tokens, HttpContext http, CancellationToken ct) =>
{
    var email = req.Email.Trim().ToLowerInvariant();
    if (string.IsNullOrWhiteSpace(req.DisplayName) || req.DisplayName.Length > 80 || !email.Contains('@') || req.Password.Length < 10)
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["request"] = ["表示名、メールアドレス、10文字以上のパスワードを確認してください。"] });
    if (await db.Users.AnyAsync(x => x.NormalizedEmail == email, ct)) return Results.Conflict(Problem("このメールアドレスは使用できません。", 409));
    var user = new User { DisplayName = req.DisplayName.Trim(), Email = email, NormalizedEmail = email, PasswordHash = "pending", Timezone = req.Timezone ?? "Asia/Tokyo" };
    user.PasswordHash = hasher.HashPassword(user, req.Password); db.Users.Add(user); await db.SaveChangesAsync(ct);
    var result = await tokens.IssueAsync(user, req.Device, ct); SetRefreshCookie(http, result.RefreshToken, result.ExpiresAt.AddDays(30));
    return Results.Created("/api/v1/me", new { result.AccessToken, result.ExpiresAt, user = ToUser(user) });
});

auth.MapPost("/login", async ([FromBody] LoginRequest req, MemoryDbContext db, IPasswordHasher<User> hasher, TokenService tokens, HttpContext http, CancellationToken ct) =>
{
    var user = await db.Users.SingleOrDefaultAsync(x => x.NormalizedEmail == req.Email.Trim().ToLower(), ct);
    if (user is null || hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password) == PasswordVerificationResult.Failed)
        return Results.Json(Problem("メールアドレスまたはパスワードが正しくありません。", 401), statusCode: 401);
    var result = await tokens.IssueAsync(user, req.Device, ct); SetRefreshCookie(http, result.RefreshToken, DateTimeOffset.UtcNow.AddDays(30));
    return Results.Ok(new { result.AccessToken, result.ExpiresAt, user = ToUser(user) });
});

auth.MapPost("/refresh", async (HttpContext http, TokenService tokens, CancellationToken ct) =>
{
    if (!http.Request.Cookies.TryGetValue("refresh_token", out var raw)) return Results.Unauthorized();
    var result = await tokens.RotateAsync(raw, ct); if (result is null) { DeleteRefreshCookie(http); return Results.Unauthorized(); }
    SetRefreshCookie(http, result.RefreshToken, DateTimeOffset.UtcNow.AddDays(30)); return Results.Ok(new { result.AccessToken, result.ExpiresAt });
});

auth.MapPost("/logout", async (HttpContext http, TokenService tokens, CancellationToken ct) => { if (http.Request.Cookies.TryGetValue("refresh_token", out var raw)) await tokens.RevokeAsync(raw, ct); DeleteRefreshCookie(http); return Results.NoContent(); });

api.MapGet("/me", async (ClaimsPrincipal principal, MemoryDbContext db, CancellationToken ct) =>
{
    var userId = UserId(principal);
    return ToUser(await db.Users.SingleAsync(x => x.Id == userId, ct));
}).RequireAuthorization();

var posts = api.MapGroup("/posts").RequireAuthorization();
posts.MapPost("/", async (HttpRequest request, ClaimsPrincipal principal, MemoryDbContext db, IMediaStorage storage, CancellationToken ct) =>
{
    if (!request.HasFormContentType) return Results.Json(Problem("multipart/form-data が必要です。", 415), statusCode: 415);
    var form = await request.ReadFormAsync(ct); var file = form.Files.GetFile("media");
    if (file is null || file.Length == 0) return Results.ValidationProblem(new Dictionary<string, string[]> { ["media"] = ["画像または動画が必要です。"] });
    if (file.Length > 25 * 1024 * 1024) return Results.Json(Problem("ファイルは25MB以下にしてください。", 413), statusCode: 413);
    var allowed = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) { ["image/jpeg"] = ".jpg", ["image/png"] = ".png", ["image/webp"] = ".webp", ["video/mp4"] = ".mp4" };
    if (!allowed.TryGetValue(file.ContentType, out var ext)) return Results.Json(Problem("対応していないメディア形式です。", 415), statusCode: 415);
    if (file.ContentType.StartsWith("video/") && principal.FindFirstValue("membership") != "premium") return Results.Forbid();
    if (!DateOnly.TryParse(form["occurredOn"], out var occurredOn)) return Results.ValidationProblem(new Dictionary<string, string[]> { ["occurredOn"] = ["日付はYYYY-MM-DD形式です。"] });
    var caption = form["caption"].ToString(); if (caption.Length > 2000) return Results.ValidationProblem(new Dictionary<string, string[]> { ["caption"] = ["2000文字以下にしてください。"] });
    await using var stream = file.OpenReadStream(); var stored = await storage.PutAsync(stream, file.ContentType, ext, ct);
    try { var post = new Post { UserId = UserId(principal), Caption = string.IsNullOrWhiteSpace(caption) ? null : caption, OccurredOn = occurredOn }; post.Media.Add(new MediaAsset { PostId = post.Id, Kind = file.ContentType.StartsWith("video/") ? MediaKind.Video : MediaKind.Image, StorageKey = stored.StorageKey, ContentType = file.ContentType, ByteSize = stored.ByteSize }); db.Posts.Add(post); await db.SaveChangesAsync(ct); return Results.Created($"/api/v1/posts/{post.Id}", await ToPost(post, storage, ct)); }
    catch { try { await storage.DeleteAsync(stored.StorageKey, ct); } catch { } throw; }
}).DisableAntiforgery().RequireRateLimiting("sensitive");

posts.MapGet("/", async (int? limit, string? cursor, ClaimsPrincipal principal, MemoryDbContext db, IMediaStorage storage, CancellationToken ct) =>
{
    var userId = UserId(principal);
    var take = Math.Clamp(limit ?? 20, 1, 50); var query = db.Posts.Include(x => x.Media).Where(x => x.UserId == userId);
    if (DecodeCursor(cursor) is { } c) query = query.Where(x => x.CreatedAt < c.Time || x.CreatedAt == c.Time && x.Id.CompareTo(c.Id) < 0);
    var rows = await query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Take(take + 1).ToListAsync(ct); var more = rows.Count > take; if (more) rows.RemoveAt(take);
    var items = new List<PostDto>(); foreach (var row in rows) items.Add(await ToPost(row, storage, ct));
    return Results.Ok(new PageDto<PostDto>(items, more && rows.Count > 0 ? EncodeCursor(rows[^1]) : null));
});

posts.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, MemoryDbContext db, IMediaStorage storage, CancellationToken ct) => { var userId = UserId(principal); var p = await db.Posts.Include(x => x.Media).SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct); return p is null ? Results.NotFound() : Results.Ok(await ToPost(p, storage, ct)); });
posts.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, MemoryDbContext db, CancellationToken ct) => { var userId = UserId(principal); var p = await db.Posts.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct); if (p is null) return Results.NotFound(); p.DeletedAt = DateTimeOffset.UtcNow; await db.SaveChangesAsync(ct); return Results.NoContent(); });

api.MapGet("/calendar/{year:int}/{month:int}", async (int year, int month, ClaimsPrincipal principal, MemoryDbContext db, CancellationToken ct) => { if (month is < 1 or > 12) return Results.BadRequest(); var userId = UserId(principal); var start = new DateOnly(year, month, 1); var end = start.AddMonths(1); var days = await db.Posts.Where(x => x.UserId == userId && x.OccurredOn >= start && x.OccurredOn < end).GroupBy(x => x.OccurredOn).Select(g => new { date = g.Key, count = g.Count() }).ToListAsync(ct); return Results.Ok(days); }).RequireAuthorization();
api.MapGet("/memories/on-this-day", async (DateOnly? date, int? yearsAgo, ClaimsPrincipal principal, MemoryDbContext db, IMediaStorage storage, CancellationToken ct) => { var userId = UserId(principal); var target = AnniversaryRule.DateYearsAgo(date ?? DateOnly.FromDateTime(DateTime.UtcNow), Math.Clamp(yearsAgo ?? 1, 1, 100)); var rows = await db.Posts.Include(x => x.Media).Where(x => x.UserId == userId && x.OccurredOn == target).OrderByDescending(x => x.CreatedAt).ToListAsync(ct); var result = new List<PostDto>(); foreach (var row in rows) result.Add(await ToPost(row, storage, ct)); return Results.Ok(result); }).RequireAuthorization();
api.MapGet("/media/{**key}", async (string key, IMediaStorage storage, CancellationToken ct) => { try { var stream = await storage.OpenReadAsync(key, ct); return Results.Stream(stream); } catch (FileNotFoundException) { return Results.NotFound(); } }).RequireAuthorization();
api.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.Run();

static Guid UserId(ClaimsPrincipal p) => Guid.Parse(p.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? p.FindFirstValue(ClaimTypes.NameIdentifier)!);
static UserDto ToUser(User u) => new(u.Id, u.DisplayName, u.Email, u.Membership.ToString().ToLowerInvariant(), u.Timezone);
static async Task<PostDto> ToPost(Post p, IMediaStorage s, CancellationToken ct) { var media = new List<MediaDto>(); foreach (var m in p.Media) media.Add(new(m.Id, m.Kind.ToString().ToLowerInvariant(), m.ContentType, m.ByteSize, (await s.GetReadUriAsync(m.StorageKey, TimeSpan.FromMinutes(15), ct)).ToString())); return new(p.Id, p.Caption, p.OccurredOn, p.CreatedAt, media); }
static object Problem(string detail, int status) => new { type = "https://memory.local/problems/request", title = "Request failed", status, detail };
static void SetRefreshCookie(HttpContext h, string value, DateTimeOffset expires) => h.Response.Cookies.Append("refresh_token", value, new() { HttpOnly = true, Secure = !h.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment(), SameSite = SameSiteMode.Lax, Expires = expires, Path = "/api/v1/auth" });
static void DeleteRefreshCookie(HttpContext h) => h.Response.Cookies.Delete("refresh_token", new() { Path = "/api/v1/auth" });
static string EncodeCursor(Post p) => Convert.ToBase64String(Encoding.UTF8.GetBytes($"{p.CreatedAt:O}|{p.Id}"));
static (DateTimeOffset Time, Guid Id)? DecodeCursor(string? value) { try { if (string.IsNullOrWhiteSpace(value)) return null; var parts = Encoding.UTF8.GetString(Convert.FromBase64String(value)).Split('|'); return (DateTimeOffset.Parse(parts[0]), Guid.Parse(parts[1])); } catch { return null; } }

record RegisterRequest(string DisplayName, string Email, string Password, string? Timezone, string? Device);
record LoginRequest(string Email, string Password, string? Device);

public sealed class TokenService(MemoryDbContext db, IConfiguration config)
{
    public async Task<AuthResult> IssueAsync(User user, string? device, CancellationToken ct) { var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)); db.RefreshTokens.Add(new() { UserId = user.Id, TokenHash = Hash(raw), ExpiresAt = DateTimeOffset.UtcNow.AddDays(30), Device = device }); await db.SaveChangesAsync(ct); return Access(user, raw); }
    public async Task<AuthResult?> RotateAsync(string raw, CancellationToken ct) { var current = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == Hash(raw), ct); if (current is null || current.ExpiresAt <= DateTimeOffset.UtcNow || current.RevokedAt is not null) return null; var user = await db.Users.SingleAsync(x => x.Id == current.UserId, ct); current.RevokedAt = DateTimeOffset.UtcNow; var nextRaw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)); var next = new RefreshToken { UserId = user.Id, TokenHash = Hash(nextRaw), ExpiresAt = DateTimeOffset.UtcNow.AddDays(30), Device = current.Device }; current.ReplacedByTokenId = next.Id; db.RefreshTokens.Add(next); await db.SaveChangesAsync(ct); return Access(user, nextRaw); }
    public async Task RevokeAsync(string raw, CancellationToken ct) { var token = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == Hash(raw), ct); if (token is not null) { token.RevokedAt = DateTimeOffset.UtcNow; await db.SaveChangesAsync(ct); } }
    private AuthResult Access(User u, string refresh) { var now = DateTimeOffset.UtcNow; var expires = now.AddMinutes(10); var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:SigningKey"]!)); var jwt = new JwtSecurityToken(config["Jwt:Issuer"], config["Jwt:Audience"], [new(JwtRegisteredClaimNames.Sub, u.Id.ToString()), new("membership", u.Membership.ToString().ToLowerInvariant())], now.UtcDateTime, expires.UtcDateTime, new SigningCredentials(key, SecurityAlgorithms.HmacSha256)); return new(new JwtSecurityTokenHandler().WriteToken(jwt), expires, refresh); }
    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
