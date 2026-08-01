using System.Net.Mail;
using System.Security.Claims;
using Memory.Application;
using Microsoft.AspNetCore.Mvc;

namespace Memory.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder routes)
    {
        var auth = routes.MapGroup("/auth").RequireRateLimiting("sensitive");
        auth.MapPost("/register", RegisterAsync);
        auth.MapPost("/login", LoginAsync);
        auth.MapPost("/refresh", RefreshAsync);
        auth.MapPost("/logout", LogoutAsync);
        routes.MapGet("/me", async (ClaimsPrincipal principal, AuthApplicationService service, CancellationToken ct) =>
            await service.GetUserAsync(EndpointSupport.UserId(principal), ct) is { } user ? Results.Ok(user) : Results.NotFound()).RequireAuthorization();
        routes.MapPut("/me/anniversary", SetAnniversaryAsync).RequireAuthorization();
        routes.MapGet("/me/anniversary/change-impact", async (ClaimsPrincipal principal, AnniversaryApplicationService service, CancellationToken ct) =>
            Results.Ok(new { affectedLockedSecondPosts = await service.ChangeImpactAsync(EndpointSupport.UserId(principal), ct) })).RequireAuthorization();
        return routes;
    }

    private static async Task<IResult> RegisterAsync([FromBody] RegisterRequest request, AuthApplicationService service, HttpContext http, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var validEmail = MailAddress.TryCreate(email, out var parsedEmail) && parsedEmail.Address.Equals(email, StringComparison.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(request.DisplayName) || request.DisplayName.Length > 80 || !validEmail || request.Password.Length < 10)
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["request"] = [EndpointSupport.Text(http, "表示名、メールアドレス、10文字以上のパスワードを確認してください。", "Check your display name, email address, and password of at least 10 characters.")] });

        try
        {
            var result = await service.RegisterAsync(request.DisplayName, email, request.Password, request.Timezone ?? "Asia/Tokyo", request.PreferredLanguage ?? "ja", request.Device, ct);
            if (result is null) return Results.Conflict(EndpointSupport.Problem(EndpointSupport.Text(http, "このメールアドレスは使用できません。", "This email address is not available."), 409));
            EndpointSupport.SetRefreshCookie(http, result.RefreshToken);
            return Results.Created("/api/v1/me", new { result.AccessToken, result.ExpiresAt, result.RefreshToken, result.User });
        }
        catch (TimeZoneNotFoundException)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["timezone"] = [EndpointSupport.Text(http, "タイムゾーンが正しくありません。", "The timezone is invalid.")] });
        }
    }

    private static async Task<IResult> LoginAsync([FromBody] LoginRequest request, AuthApplicationService service, HttpContext http, CancellationToken ct)
    {
        var result = await service.LoginAsync(request.Email, request.Password, request.Device, ct);
        if (result is null) return Results.Json(EndpointSupport.Problem(EndpointSupport.Text(http, "メールアドレスまたはパスワードが正しくありません。", "The email address or password is incorrect."), 401), statusCode: 401);
        EndpointSupport.SetRefreshCookie(http, result.RefreshToken);
        return Results.Ok(new { result.AccessToken, result.ExpiresAt, result.RefreshToken, result.User });
    }

    private static async Task<IResult> RefreshAsync([FromBody] TokenRequest? request, HttpContext http, ITokenService tokens, CancellationToken ct)
    {
        var raw = request?.RefreshToken;
        if (string.IsNullOrWhiteSpace(raw)) http.Request.Cookies.TryGetValue("refresh_token", out raw);
        if (string.IsNullOrWhiteSpace(raw)) return Results.Unauthorized();
        var result = await tokens.RotateAsync(raw, ct);
        if (result is null) { EndpointSupport.DeleteRefreshCookie(http); return Results.Unauthorized(); }
        EndpointSupport.SetRefreshCookie(http, result.RefreshToken);
        return Results.Ok(new { result.AccessToken, result.ExpiresAt, result.RefreshToken });
    }

    private static async Task<IResult> LogoutAsync([FromBody] TokenRequest? request, HttpContext http, ITokenService tokens, CancellationToken ct)
    {
        var raw = request?.RefreshToken;
        if (string.IsNullOrWhiteSpace(raw)) http.Request.Cookies.TryGetValue("refresh_token", out raw);
        if (!string.IsNullOrWhiteSpace(raw)) await tokens.RevokeAsync(raw, ct);
        EndpointSupport.DeleteRefreshCookie(http);
        return Results.NoContent();
    }

    private static async Task<IResult> SetAnniversaryAsync([FromBody] AnniversaryRequest request, ClaimsPrincipal principal, AnniversaryApplicationService service, HttpContext http, CancellationToken ct)
    {
        try { return Results.Ok(await service.SetAsync(EndpointSupport.UserId(principal), request.Name, request.Month, request.Day, request.Skip, ct)); }
        catch (BusinessRuleException exception) { return EndpointSupport.BusinessProblem(http, exception); }
        catch (ArgumentException) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["anniversary"] = [EndpointSupport.Text(http, "正しい記念日を入力してください。", "Enter a valid anniversary.")] }); }
    }

    private sealed record RegisterRequest(string DisplayName, string Email, string Password, string? Timezone, string? PreferredLanguage, string? Device);
    private sealed record LoginRequest(string Email, string Password, string? Device);
    private sealed record TokenRequest(string? RefreshToken);
    private sealed record AnniversaryRequest(string? Name, int? Month, int? Day, bool Skip = false);
}
