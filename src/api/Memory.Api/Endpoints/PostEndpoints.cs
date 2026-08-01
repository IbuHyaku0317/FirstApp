using System.Security.Claims;
using Memory.Application;

namespace Memory.Api.Endpoints;

public static class PostEndpoints
{
    public static IEndpointRouteBuilder MapPostEndpoints(this IEndpointRouteBuilder routes)
    {
        var posts = routes.MapGroup("/posts").RequireAuthorization();
        posts.MapPost("/", CreateAsync).DisableAntiforgery().RequireRateLimiting("sensitive");
        posts.MapGet("/", ListAsync);
        posts.MapGet("/today/status", TodayStatusAsync);
        posts.MapGet("/{id:guid}", GetAsync);
        posts.MapDelete("/{id:guid}", CancelAsync);
        routes.MapGet("/calendar/{year:int}/{month:int}", CalendarAsync).RequireAuthorization();
        routes.MapGet("/calendar/{date}", CalendarDayAsync).RequireAuthorization();
        routes.MapGet("/memories/on-this-day", MemoriesAsync).RequireAuthorization();
        routes.MapGet("/media/{**key}", OpenMediaAsync).RequireAuthorization();
        return routes;
    }

    private static async Task<IResult> CreateAsync(HttpRequest request, ClaimsPrincipal principal, PostApplicationService service, CancellationToken ct)
    {
        if (!request.HasFormContentType) return Results.Json(EndpointSupport.Problem(EndpointSupport.Text(request.HttpContext, "multipart/form-data が必要です。", "multipart/form-data is required."), 415), statusCode: 415);
        var form = await request.ReadFormAsync(ct);
        var file = form.Files.GetFile("media");
        if (file is null || file.Length == 0) return Results.ValidationProblem(new Dictionary<string, string[]> { ["media"] = [EndpointSupport.Text(request.HttpContext, "写真または動画を選択してください。", "Choose an image or video.")] });
        if (file.Length > 100L * 1024 * 1024) return Results.Json(EndpointSupport.Problem(EndpointSupport.Text(request.HttpContext, "ファイルは100MB以下にしてください。", "The file must be 100 MB or smaller."), 413), statusCode: 413);
        var allowed = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) { ["image/jpeg"] = ".jpg", ["image/png"] = ".png", ["image/webp"] = ".webp", ["video/mp4"] = ".mp4" };
        if (!allowed.TryGetValue(file.ContentType, out var extension)) return Results.Json(EndpointSupport.Problem(EndpointSupport.Text(request.HttpContext, "対応していないメディア形式です。", "This media format is not supported."), 415), statusCode: 415);
        var caption = form["caption"].ToString();
        if (caption.Length > 2000) return Results.ValidationProblem(new Dictionary<string, string[]> { ["caption"] = [EndpointSupport.Text(request.HttpContext, "メッセージは2000文字以下にしてください。", "The message must be 2,000 characters or fewer.")] });
        try
        {
            await using var stream = file.OpenReadStream();
            if (!MediaFileInspector.MatchesContentType(stream, file.ContentType))
                return Results.Json(EndpointSupport.Problem(EndpointSupport.Text(request.HttpContext, "ファイルの内容と形式が一致しません。", "The file contents do not match its media type."), 415), statusCode: 415);
            if (file.ContentType.Equals("video/mp4", StringComparison.OrdinalIgnoreCase))
            {
                var duration = MediaFileInspector.ReadMp4DurationSeconds(stream);
                if (duration is null || duration > 60.0)
                    return Results.ValidationProblem(new Dictionary<string, string[]> { ["media"] = [EndpointSupport.Text(request.HttpContext, "動画は60秒以下のMP4にしてください。", "The MP4 video must be 60 seconds or shorter.")] });
            }
            stream.Position = 0;
            var post = await service.CreateAsync(new(EndpointSupport.UserId(principal), string.IsNullOrWhiteSpace(caption) ? null : caption, stream, file.ContentType, extension), ct);
            return Results.Created($"/api/v1/posts/{post.Id}", post);
        }
        catch (BusinessRuleException exception) { return EndpointSupport.BusinessProblem(request.HttpContext, exception); }
    }

    private static async Task<IResult> TodayStatusAsync(ClaimsPrincipal principal, PostApplicationService service, HttpContext http, CancellationToken ct)
    {
        try { return Results.Ok(await service.TodayStatusAsync(EndpointSupport.UserId(principal), ct)); }
        catch (BusinessRuleException exception) { return EndpointSupport.BusinessProblem(http, exception); }
    }
    private static async Task<IResult> GetAsync(Guid id, ClaimsPrincipal principal, PostApplicationService service, CancellationToken ct) => await service.GetAsync(id, EndpointSupport.UserId(principal), ct) is { } post ? Results.Ok(post) : Results.NotFound();
    private static async Task<IResult> CancelAsync(Guid id, ClaimsPrincipal principal, PostApplicationService service, HttpContext http, CancellationToken ct)
    {
        try { return await service.CancelAsync(id, EndpointSupport.UserId(principal), ct) ? Results.NoContent() : Results.NotFound(); }
        catch (BusinessRuleException exception) { return EndpointSupport.BusinessProblem(http, exception); }
    }
    private static async Task<IResult> ListAsync(int? limit, string? cursor, ClaimsPrincipal principal, PostApplicationService service, CancellationToken ct) => Results.Ok(await service.ListAsync(EndpointSupport.UserId(principal), limit ?? 20, cursor, ct));
    private static async Task<IResult> CalendarAsync(int year, int month, ClaimsPrincipal principal, PostApplicationService service, CancellationToken ct) => month is < 1 or > 12 ? Results.BadRequest() : Results.Ok(await service.CalendarAsync(EndpointSupport.UserId(principal), year, month, ct));
    private static async Task<IResult> CalendarDayAsync(string date, ClaimsPrincipal principal, PostApplicationService service, CancellationToken ct) => DateOnly.TryParse(date, out var parsed) ? Results.Ok(await service.CalendarDayAsync(EndpointSupport.UserId(principal), parsed, ct)) : Results.BadRequest();
    private static async Task<IResult> MemoriesAsync(DateOnly? date, ClaimsPrincipal principal, PostApplicationService service, CancellationToken ct) => Results.Ok(await service.CalendarDayAsync(EndpointSupport.UserId(principal), date ?? DateOnly.FromDateTime(DateTime.UtcNow), ct));
    private static async Task<IResult> OpenMediaAsync(string key, ClaimsPrincipal principal, IUserRepository users, IPostRepository posts, IMediaStorage storage, CancellationToken ct)
    {
        var userId = EndpointSupport.UserId(principal);
        var user = await users.FindByIdAsync(userId, ct);
        if (user is null) return Results.NotFound();
        var now = DateTimeOffset.UtcNow;
        var visibleOn = AuthApplicationService.UserLocalDate(now, user.Timezone);
        if (!await posts.CanReadStorageKeyAsync(userId, key, visibleOn, now, ct)) return Results.NotFound();
        try { return Results.Stream(await storage.OpenReadAsync(key, ct)); }
        catch (FileNotFoundException) { return Results.NotFound(); }
    }
}
