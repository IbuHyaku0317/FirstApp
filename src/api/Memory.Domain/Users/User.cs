namespace Memory.Domain;

/// <summary>
/// ユーザー集約。プロフィールと会員区分に関する状態変更を自身のメソッドで管理する。
/// </summary>
public sealed class User
{
    private User() { }
    public User(string displayName, string email, string normalizedEmail, string timezone)
    {
        Id = Guid.NewGuid();
        DisplayName = displayName;
        Email = email;
        NormalizedEmail = normalizedEmail;
        Timezone = timezone;
        PasswordHash = "pending";
        CreatedAt = UpdatedAt = DateTimeOffset.UtcNow;
    }
    public Guid Id { get; private init; }
    public string DisplayName { get; private set; } = null!;
    public string Email { get; private set; } = null!;
    public string NormalizedEmail { get; private set; } = null!;
    public string PasswordHash { get; private set; } = null!;
    public Membership Membership { get; private set; } = Membership.Free;
    public string Timezone { get; private set; } = "Asia/Tokyo";
    public DateTimeOffset CreatedAt { get; private init; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public void SetPasswordHash(string hash)
    {
        PasswordHash = hash;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void ChangeMembership(Membership membership)
    {
        Membership = membership;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
