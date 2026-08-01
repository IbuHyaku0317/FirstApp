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
        posts.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, PostApplicationService service, CancellationToken ct) => (await service.GetAsync(id, EndpointSupport.UserId(principal), ct)) is { } post ? Results.Ok(post) : Results.NotFound());
        posts.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, PostApplicationService service, CancellationToken ct) => await service.DeleteAsync(id, EndpointSupport.UserId(principal), ct) ? Results.NoContent() : Results.NotFound());
        routes.MapGet("/calendar/{year:int}/{month:int}", async (int year, int month, ClaimsPrincipal principal, PostApplicationService service, CancellationToken ct) => month is < 1 or > 12 ? Results.BadRequest() : Results.Ok(await service.CalendarAsync(EndpointSupport.UserId(principal), year, month, ct))).RequireAuthorization();
        routes.MapGet("/memories/on-this-day", async (DateOnly? date, int? yearsAgo, ClaimsPrincipal principal, PostApplicationService service, CancellationToken ct) => Results.Ok(await service.MemoriesAsync(EndpointSupport.UserId(principal), date ?? DateOnly.FromDateTime(DateTime.UtcNow), Math.Clamp(yearsAgo ?? 1, 1, 100), ct))).RequireAuthorization();
        routes.MapGet("/media/{**key}", OpenMediaAsync).RequireAuthorization();
        return routes;
    }

    private static async Task<IResult> OpenMediaAsync(string key, IMediaStorage storage, CancellationToken ct)
    {
        try
        {
            return Results.Stream(await storage.OpenReadAsync(key, ct));
        }
        catch (FileNotFoundException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreateAsync(HttpRequest request, ClaimsPrincipal principal, PostApplicationService service, CancellationToken ct)
    {
        if (!request.HasFormContentType)
        {
            var message = EndpointSupport.Text(request.HttpContext, "multipart/form-data が必要です。", "multipart/form-data is required.");
            return Results.Json(EndpointSupport.Problem(message, 415), statusCode: 415);
        }
        var form = await request.ReadFormAsync(ct);
        var file = form.Files.GetFile("media");
        if (file is null || file.Length == 0)
        {
            var message = EndpointSupport.Text(request.HttpContext, "画像または動画が必要です。", "Choose an image or video.");
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["media"] = [message] });
        }
        if (file.Length > 25 * 1024 * 1024)
        {
            var message = EndpointSupport.Text(request.HttpContext, "ファイルは25MB以下にしてください。", "The file must be 25 MB or smaller.");
            return Results.Json(EndpointSupport.Problem(message, 413), statusCode: 413);
        }
        var allowed = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) { ["image/jpeg"] = ".jpg", ["image/png"] = ".png", ["image/webp"] = ".webp", ["video/mp4"] = ".mp4" };
        if (!allowed.TryGetValue(file.ContentType, out var extension))
        {
            var message = EndpointSupport.Text(request.HttpContext, "対応していないメディア形式です。", "This media format is not supported.");
            return Results.Json(EndpointSupport.Problem(message, 415), statusCode: 415);
        }
        if (file.ContentType.StartsWith("video/") && principal.FindFirstValue("membership") != "premium") return Results.Forbid();
        if (!DateOnly.TryParse(form["occurredOn"], out var occurredOn))
        {
            var message = EndpointSupport.Text(request.HttpContext, "日付はYYYY-MM-DD形式です。", "The date must use YYYY-MM-DD format.");
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["occurredOn"] = [message] });
        }
        var caption = form["caption"].ToString();
        if (caption.Length > 2000)
        {
            var message = EndpointSupport.Text(request.HttpContext, "2000文字以下にしてください。", "The caption must be 2,000 characters or fewer.");
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["caption"] = [message] });
        }
        await using var stream = file.OpenReadStream();
        var post = await service.CreateAsync(new(EndpointSupport.UserId(principal), string.IsNullOrWhiteSpace(caption) ? null : caption, occurredOn, stream, file.ContentType, extension), ct);
        return Results.Created($"/api/v1/posts/{post.Id}", post);
    }
    private static async Task<IResult> ListAsync(int? limit, string? cursor, ClaimsPrincipal principal, PostApplicationService service, CancellationToken ct) => Results.Ok(await service.ListAsync(EndpointSupport.UserId(principal), limit ?? 20, cursor, ct));
}
