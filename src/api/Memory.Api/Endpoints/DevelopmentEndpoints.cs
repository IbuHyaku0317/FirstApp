using Memory.Application;

namespace Memory.Api.Endpoints;

/// <summary>一年後の表示などを待たずに確認するための、開発環境専用APIです。</summary>
public static class DevelopmentEndpoints
{
    public static IEndpointRouteBuilder MapDevelopmentEndpoints(this IEndpointRouteBuilder routes)
    {
        var clock = routes.MapGroup("/development/clock").RequireAuthorization();
        clock.MapGet("/", (IAppClock appClock) => Results.Ok(new { utcNow = appClock.UtcNow, adjustable = appClock.IsAdjustable }));
        clock.MapPut("/", (ClockRequest request, IAppClock appClock) =>
        {
            appClock.SetUtcNow(request.UtcNow);
            return Results.Ok(new { utcNow = appClock.UtcNow, adjustable = appClock.IsAdjustable });
        });
        clock.MapDelete("/", (IAppClock appClock) =>
        {
            appClock.SetUtcNow(null);
            return Results.Ok(new { utcNow = appClock.UtcNow, adjustable = appClock.IsAdjustable });
        });
        return routes;
    }

    public sealed record ClockRequest(DateTimeOffset UtcNow);
}
