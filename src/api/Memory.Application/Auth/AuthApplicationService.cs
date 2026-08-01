using Memory.Domain;

namespace Memory.Application;

/// <summary>
/// 登録・ログイン・プロフィール取得を調整する認証ユースケース。
/// HTTPやEF Coreの型には依存しない。
/// </summary>
public sealed class AuthApplicationService(IUserRepository users, IPasswordService passwords, ITokenService tokens, IUnitOfWork unitOfWork)
{
    public async Task<AuthenticatedUserDto?> RegisterAsync(string displayName, string email, string password, string timezone, string? device, CancellationToken ct)
    {
        // 大文字・小文字違いによる重複登録を防ぐため、検索と保存には正規化値を使う。
        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (await users.EmailExistsAsync(normalizedEmail, ct)) return null;
        var user = new User(displayName.Trim(), normalizedEmail, normalizedEmail, timezone);
        user.SetPasswordHash(passwords.Hash(user, password));
        users.Add(user);
        await unitOfWork.SaveChangesAsync(ct);
        var auth = await tokens.IssueAsync(user, device, ct);
        return new(auth.AccessToken, auth.ExpiresAt, auth.RefreshToken, Map(user));
    }
    public async Task<AuthenticatedUserDto?> LoginAsync(string email, string password, string? device, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(email.Trim().ToLowerInvariant(), ct);
        if (user is null || !passwords.Verify(user, password)) return null;
        var auth = await tokens.IssueAsync(user, device, ct);
        return new(auth.AccessToken, auth.ExpiresAt, auth.RefreshToken, Map(user));
    }
    public async Task<UserDto?> GetUserAsync(Guid userId, CancellationToken ct) => (await users.FindByIdAsync(userId, ct)) is { } user ? Map(user) : null;
    private static UserDto Map(User user) => new(user.Id, user.DisplayName, user.Email, user.Membership.ToString().ToLowerInvariant(), user.Timezone);
}
