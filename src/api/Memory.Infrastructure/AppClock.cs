using Memory.Application;

namespace Memory.Infrastructure;

/// <summary>
/// 業務ルールで使う現在時刻です。開発環境では、一年後の表示などを実機で確認するために
/// 任意の日時へ進められます。本番環境では常に実際のUTC時刻を返します。
/// </summary>
public sealed class AppClock(bool isDevelopment) : IAppClock
{
    private readonly object sync = new();
    private DateTimeOffset? simulatedUtcNow;
    private DateTimeOffset simulatedAtRealUtc;

    public bool IsAdjustable => isDevelopment;

    public DateTimeOffset UtcNow
    {
        get
        {
            lock (sync)
            {
                var realUtcNow = DateTimeOffset.UtcNow;
                return simulatedUtcNow is { } value
                    ? value + (realUtcNow - simulatedAtRealUtc)
                    : realUtcNow;
            }
        }
    }

    public void SetUtcNow(DateTimeOffset? utcNow)
    {
        if (!IsAdjustable) throw new InvalidOperationException("The application clock cannot be changed outside Development.");
        lock (sync)
        {
            simulatedUtcNow = utcNow?.ToUniversalTime();
            simulatedAtRealUtc = DateTimeOffset.UtcNow;
        }
    }
}
