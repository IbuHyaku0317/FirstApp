using Memory.Domain;

namespace Memory.Application;

public sealed class AnniversaryApplicationService(IUserRepository users, IAnniversaryRepository anniversaries, IPostRepository posts, IUnitOfWork unitOfWork, AuthApplicationService auth, IAppClock clock)
{
    public async Task<int> ChangeImpactAsync(Guid userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct) ?? throw new BusinessRuleException("USER_NOT_FOUND", "User not found.");
        var current = await anniversaries.FindCurrentAsync(userId, ct);
        if (current is null) return 0;
        var today = AuthApplicationService.UserLocalDate(clock.UtcNow, user.Timezone);
        return (await posts.LockedSecondPostsAsync(userId, current.Id, today, ct)).Count;
    }

    public async Task<UserDto> SetAsync(Guid userId, string? name, int? month, int? day, bool skip, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct) ?? throw new BusinessRuleException("USER_NOT_FOUND", "User not found.");
        var now = clock.UtcNow;
        var today = AuthApplicationService.UserLocalDate(now, user.Timezone);
        var current = await anniversaries.FindCurrentAsync(userId, ct);

        if (skip)
        {
            if (current is not null) throw new BusinessRuleException("ANNIVERSARY_SKIP_NOT_ALLOWED", "An existing anniversary cannot be skipped.");
            user.CompleteAnniversarySetup(now, false);
            await unitOfWork.SaveChangesAsync(ct);
            return await auth.MapAsync(user, ct);
        }

        if (month is null || day is null || string.IsNullOrWhiteSpace(name)) throw new BusinessRuleException("ANNIVERSARY_INVALID", "Enter a valid anniversary.");
        var candidate = new AnniversarySetting(userId, name, month.Value, day.Value, now);
        // 当日変更の禁止は既存設定の「変更」にだけ適用する。初回登録が記念日当日でも登録できる。
        if (current is not null && (current.IsOn(today) || candidate.IsOn(today))) throw new BusinessRuleException("ANNIVERSARY_CHANGE_TODAY", "The anniversary cannot be changed on that day.");
        if (current is not null && user.LastAnniversaryChangedAt is { } last && now < last.AddDays(14)) throw new BusinessRuleException("ANNIVERSARY_CHANGE_TOO_SOON", "The anniversary can be changed once every 14 days.");

        if (current is not null)
        {
            current.Close(now);
            foreach (var post in await posts.LockedSecondPostsAsync(userId, current.Id, today, ct)) post.SuppressBecauseAnniversaryChanged();
        }
        anniversaries.Add(candidate);
        user.CompleteAnniversarySetup(now, true);
        await unitOfWork.SaveChangesAsync(ct);
        return await auth.MapAsync(user, ct);
    }
}
