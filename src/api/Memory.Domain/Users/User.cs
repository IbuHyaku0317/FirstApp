namespace Memory.Domain;

/// <summary>認証情報、プロフィール、記念日変更制限を管理するユーザー集約。</summary>
public sealed class User
{
    private User() { }

    public User(string displayName, string email, string normalizedEmail, string timezone, string preferredLanguage = "ja", DateTimeOffset? now = null)
    {
        Id = Guid.NewGuid();
        DisplayName = displayName;
        Email = email;
        NormalizedEmail = normalizedEmail;
        Timezone = timezone;
        PreferredLanguage = preferredLanguage is "en" ? "en" : "ja";
        PasswordHash = "pending";
        CreatedAt = UpdatedAt = now ?? DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private init; }
    public string DisplayName { get; private set; } = null!;
    public string Email { get; private set; } = null!;
    public string NormalizedEmail { get; private set; } = null!;
    public string PasswordHash { get; private set; } = null!;
    public Membership Membership { get; private set; } = Membership.Free;
    public string Timezone { get; private set; } = "Asia/Tokyo";
    public string PreferredLanguage { get; private set; } = "ja";
    public bool AnniversarySetupCompleted { get; private set; }
    public DateTimeOffset? LastAnniversaryChangedAt { get; private set; }
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

    public void CompleteAnniversarySetup(DateTimeOffset now, bool changed)
    {
        AnniversarySetupCompleted = true;
        if (changed)
        {
            LastAnniversaryChangedAt = now;
        }
        UpdatedAt = now;
    }

    public void UpdateProfile(string displayName, string preferredLanguage, string timezone, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(displayName) || displayName.Trim().Length > 80)
            throw new ArgumentException("Display name is required and must be 80 characters or fewer.", nameof(displayName));
        DisplayName = displayName.Trim();
        PreferredLanguage = preferredLanguage is "en" ? "en" : "ja";
        Timezone = timezone;
        UpdatedAt = now;
    }

    public void RequestDeletion(DateTimeOffset now)
    {
        DeletedAt = now;
        UpdatedAt = now;
    }
}
