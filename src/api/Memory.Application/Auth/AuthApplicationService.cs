using Memory.Domain;

namespace Memory.Application;

public sealed class AuthApplicationService(IUserRepository users, IAnniversaryRepository anniversaries, IPasswordService passwords, ITokenService tokens, IUnitOfWork unitOfWork, IAppClock clock)
{
    public async Task<AuthenticatedUserDto?> RegisterAsync(string displayName, string email, string password, string timezone, string preferredLanguage, string? device, CancellationToken ct)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (await users.EmailExistsAsync(normalizedEmail, ct)) return null;
        _ = UserLocalDate(clock.UtcNow, timezone);
        var user = new User(displayName.Trim(), normalizedEmail, normalizedEmail, timezone, preferredLanguage, clock.UtcNow);
        user.SetPasswordHash(passwords.Hash(user, password));
        users.Add(user);
        await unitOfWork.SaveChangesAsync(ct);
        var auth = await tokens.IssueAsync(user, device, ct);
        return new(auth.AccessToken, auth.ExpiresAt, auth.RefreshToken, await MapAsync(user, ct));
    }

    public async Task<AuthenticatedUserDto?> LoginAsync(string email, string password, string? device, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(email.Trim().ToLowerInvariant(), ct);
        if (user is null || !passwords.Verify(user, password)) return null;
        var auth = await tokens.IssueAsync(user, device, ct);
        return new(auth.AccessToken, auth.ExpiresAt, auth.RefreshToken, await MapAsync(user, ct));
    }

    public async Task<UserDto?> GetUserAsync(Guid userId, CancellationToken ct) =>
        await users.FindByIdAsync(userId, ct) is { } user ? await MapAsync(user, ct) : null;

    public async Task<UserDto> UpdateProfileAsync(Guid userId, string displayName, string preferredLanguage, string timezone, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct) ?? throw new BusinessRuleException("USER_NOT_FOUND", "User not found.");
        _ = UserLocalDate(clock.UtcNow, timezone);
        user.UpdateProfile(displayName, preferredLanguage, timezone, clock.UtcNow);
        await unitOfWork.SaveChangesAsync(ct);
        return await MapAsync(user, ct);
    }

    public async Task DeleteAccountAsync(Guid userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct) ?? throw new BusinessRuleException("USER_NOT_FOUND", "User not found.");
        user.RequestDeletion(clock.UtcNow);
        await tokens.RevokeAllAsync(userId, ct);
        await unitOfWork.SaveChangesAsync(ct);
    }

    public async Task<UserDto> MapAsync(User user, CancellationToken ct)
    {
        var setting = await anniversaries.FindCurrentAsync(user.Id, ct);
        var anniversary = setting is null ? null : new AnniversaryDto(setting.Name, setting.Month, setting.Day,
            user.LastAnniversaryChangedAt is { } changed ? DateOnly.FromDateTime(UserLocalTime(changed.AddDays(14), user.Timezone).DateTime) : null);
        return new(user.Id, user.DisplayName, user.Email, user.Membership.ToString().ToLowerInvariant(), user.Timezone,
            user.PreferredLanguage, user.AnniversarySetupCompleted, anniversary);
    }

    public static DateTimeOffset UserLocalTime(DateTimeOffset instant, string timezone) => TimeZoneInfo.ConvertTime(instant, TimeZoneInfo.FindSystemTimeZoneById(timezone));
    public static DateOnly UserLocalDate(DateTimeOffset instant, string timezone) => DateOnly.FromDateTime(UserLocalTime(instant, timezone).DateTime);
}
