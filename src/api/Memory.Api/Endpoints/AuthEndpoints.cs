using System.Security.Claims;
using System.Net.Mail;
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
        routes.MapGet("/me", async (ClaimsPrincipal principal, AuthApplicationService service, CancellationToken ct) => (await service.GetUserAsync(EndpointSupport.UserId(principal), ct)) is { } user ? Results.Ok(user) : Results.NotFound()).RequireAuthorization();
        return routes;
    }
    private static async Task<IResult> RegisterAsync([FromBody] RegisterRequest request, AuthApplicationService service, HttpContext http, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var validEmail = MailAddress.TryCreate(email, out var parsedEmail)
            && parsedEmail.Address.Equals(email, StringComparison.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(request.DisplayName)
            || request.DisplayName.Length > 80
            || !validEmail
            || request.Password.Length < 10)
        {
            var message = EndpointSupport.Text(
                http,
                "表示名、メールアドレス、10文字以上のパスワードを確認してください。",
                "Check your display name, email address, and password of at least 10 characters.");
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["request"] = [message] });
        }
        var result = await service.RegisterAsync(request.DisplayName, email, request.Password, request.Timezone ?? "Asia/Tokyo", request.Device, ct);
        if (result is null)
        {
            var message = EndpointSupport.Text(http, "このメールアドレスは使用できません。", "This email address is not available.");
            return Results.Conflict(EndpointSupport.Problem(message, 409));
        }
        EndpointSupport.SetRefreshCookie(http, result.RefreshToken);
        return Results.Created("/api/v1/me", new { result.AccessToken, result.ExpiresAt, result.User });
    }
    private static async Task<IResult> LoginAsync([FromBody] LoginRequest request, AuthApplicationService service, HttpContext http, CancellationToken ct)
    {
        var result = await service.LoginAsync(request.Email, request.Password, request.Device, ct);
        if (result is null)
        {
            var message = EndpointSupport.Text(
                http,
                "メールアドレスまたはパスワードが正しくありません。",
                "The email address or password is incorrect.");
            return Results.Json(EndpointSupport.Problem(message, 401), statusCode: 401);
        }
        EndpointSupport.SetRefreshCookie(http, result.RefreshToken);
        return Results.Ok(new { result.AccessToken, result.ExpiresAt, result.User });
    }
    private static async Task<IResult> RefreshAsync(HttpContext http, ITokenService tokens, CancellationToken ct)
    {
        if (!http.Request.Cookies.TryGetValue("refresh_token", out var raw)) return Results.Unauthorized();
        var result = await tokens.RotateAsync(raw, ct);
        if (result is null)
        {
            EndpointSupport.DeleteRefreshCookie(http);
            return Results.Unauthorized();
        }

        EndpointSupport.SetRefreshCookie(http, result.RefreshToken);
        return Results.Ok(new { result.AccessToken, result.ExpiresAt });
    }

    private static async Task<IResult> LogoutAsync(HttpContext http, ITokenService tokens, CancellationToken ct)
    {
        if (http.Request.Cookies.TryGetValue("refresh_token", out var raw))
        {
            await tokens.RevokeAsync(raw, ct);
        }

        EndpointSupport.DeleteRefreshCookie(http);
        return Results.NoContent();
    }
    private sealed record RegisterRequest(string DisplayName, string Email, string Password, string? Timezone, string? Device);
    private sealed record LoginRequest(string Email, string Password, string? Device);
}
