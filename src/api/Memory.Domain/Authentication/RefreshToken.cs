namespace Memory.Domain;

/// <summary>
/// ローテーション可能なリフレッシュトークン。
/// DBには生トークンではなくハッシュ値だけを保存する。
/// </summary>
public sealed class RefreshToken
{
    private RefreshToken() { }
    public RefreshToken(Guid userId, string tokenHash, DateTimeOffset expiresAt, string? device)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        TokenHash = tokenHash;
        ExpiresAt = expiresAt;
        Device = device;
        CreatedAt = DateTimeOffset.UtcNow;
    }
    public Guid Id { get; private init; }
    public Guid UserId { get; private init; }
    public string TokenHash { get; private init; } = null!;
    public DateTimeOffset ExpiresAt { get; private init; }
    public DateTimeOffset? RevokedAt { get; private set; }
    public Guid? ReplacedByTokenId { get; private set; }
    public string? Device { get; private init; }
    public DateTimeOffset CreatedAt { get; private init; }
    public bool IsActive(DateTimeOffset now) => RevokedAt is null && ExpiresAt > now;
    public void Revoke(Guid? replacementId = null)
    {
        RevokedAt = DateTimeOffset.UtcNow;
        ReplacedByTokenId = replacementId;
    }
}
