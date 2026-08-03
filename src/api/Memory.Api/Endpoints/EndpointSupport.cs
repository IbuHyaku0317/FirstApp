using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Memory.Application;

namespace Memory.Api.Endpoints;

internal static class EndpointSupport
{
    internal static string Text(HttpContext context, string japanese, string english) =>
        context.Request.Headers.AcceptLanguage.ToString().StartsWith("en", StringComparison.OrdinalIgnoreCase) ? english : japanese;

    internal static Guid UserId(ClaimsPrincipal principal) => Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
    internal static object Problem(string detail, int status) => new { type = "https://memory.local/problems/request", title = "Request failed", status, detail };
    internal static IResult BusinessProblem(HttpContext http, BusinessRuleException exception)
    {
        var status = exception.Code switch { "PREMIUM_REQUIRED" => 403, "USER_NOT_FOUND" => 404, _ => 409 };
        return Results.Json(new { type = $"https://memory.local/problems/{exception.Code.ToLowerInvariant().Replace('_', '-')}", title = exception.Message, detail = exception.Message, status, code = exception.Code, traceId = http.TraceIdentifier }, statusCode: status, contentType: "application/problem+json");
    }
    internal static void SetRefreshCookie(HttpContext context, string value) => context.Response.Cookies.Append("refresh_token", value, new() { HttpOnly = true, Secure = !context.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment(), SameSite = SameSiteMode.Lax, Expires = DateTimeOffset.UtcNow.AddDays(30), Path = "/api/v1/auth" });
    internal static void DeleteRefreshCookie(HttpContext context) => context.Response.Cookies.Delete("refresh_token", new() { Path = "/api/v1/auth" });
}
