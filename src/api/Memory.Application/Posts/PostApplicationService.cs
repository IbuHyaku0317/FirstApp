using System.Text;
using Memory.Domain;

namespace Memory.Application;

/// <summary>投稿枠、解禁、取消、カレンダー表示を調整するユースケース。</summary>
public sealed class PostApplicationService(IPostRepository posts, IUserRepository users, IAnniversaryRepository anniversaries, IUnitOfWork unitOfWork, IMediaStorage storage, IAppClock clock)
{
    public async Task<PostDto> CreateAsync(CreatePostCommand command, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(command.UserId, ct) ?? throw new BusinessRuleException("USER_NOT_FOUND", "User not found.");
        var now = clock.UtcNow;
        var today = AuthApplicationService.UserLocalDate(now, user.Timezone);
        var anniversary = await anniversaries.FindCurrentAsync(user.Id, ct);
        var isAnniversary = anniversary?.IsOn(today) == true;
        var used = await posts.CountOnAsync(user.Id, today, ct);
        var limit = isAnniversary ? 2 : 1;
        if (used >= limit) throw new BusinessRuleException("POST_DAILY_LIMIT_REACHED", "No more posts can be created today.");

        var kind = command.ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase) ? MediaKind.Video : MediaKind.Image;
        if (kind == MediaKind.Video && user.Membership != Membership.Premium) throw new BusinessRuleException("PREMIUM_REQUIRED", "A premium membership is required for video posts.");

        var stored = await storage.PutAsync(command.Content, command.ContentType, command.Extension, ct);
        try
        {
            var post = new Post(user.Id, command.Caption, today, now, used + 1, isAnniversary ? anniversary!.Id : null);
            post.AddMedia(new MediaAsset(post.Id, kind, stored.StorageKey, command.ContentType, stored.ByteSize, now));
            posts.Add(post);
            await unitOfWork.SaveChangesAsync(ct);
            return await MapAsync(post, includeContent: true, ct);
        }
        catch
        {
            try { await storage.DeleteAsync(stored.StorageKey, ct); } catch { /* 孤立ファイル回収ジョブが再試行する。 */ }
            throw;
        }
    }

    public async Task<TodayStatusDto> TodayStatusAsync(Guid userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct) ?? throw new BusinessRuleException("USER_NOT_FOUND", "User not found.");
        var now = clock.UtcNow;
        var today = AuthApplicationService.UserLocalDate(now, user.Timezone);
        var anniversary = await anniversaries.FindCurrentAsync(userId, ct);
        var isAnniversary = anniversary?.IsOn(today) == true;
        var cancelable = new List<PostDto>();
        foreach (var post in await posts.OnOccurredDateAsync(userId, today, ct))
        {
            if (post.CanCancel(now)) cancelable.Add(await MapAsync(post, true, ct));
        }
        return new(today, await posts.CountOnAsync(userId, today, ct), isAnniversary ? 2 : 1, isAnniversary, cancelable);
    }

    public async Task<PageDto<PostDto>> ListAsync(Guid userId, int limit, string? cursor, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct) ?? throw new BusinessRuleException("USER_NOT_FOUND", "User not found.");
        var visibleOn = AuthApplicationService.UserLocalDate(clock.UtcNow, user.Timezone);
        var take = Math.Clamp(limit, 1, 50);
        var decoded = DecodeCursor(cursor);
        var rows = (await posts.ListAsync(userId, visibleOn, take + 1, decoded?.Time, decoded?.Id, ct)).ToList();
        var more = rows.Count > take;
        if (more) rows.RemoveAt(take);
        var items = new List<PostDto>();
        foreach (var row in rows) items.Add(await MapAsync(row, true, ct));
        return new(items, more && rows.Count > 0 ? EncodeCursor(rows[^1]) : null);
    }

    public async Task<PostDto?> GetAsync(Guid postId, Guid userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct);
        var post = await posts.FindOwnedAsync(postId, userId, ct);
        if (user is null || post is null) return null;
        var today = AuthApplicationService.UserLocalDate(clock.UtcNow, user.Timezone);
        if (post.UnlockOn > today || post.SuppressionReason is not null) return null;
        return await MapAsync(post, true, ct);
    }

    public async Task<bool> CancelAsync(Guid postId, Guid userId, CancellationToken ct)
    {
        var post = await posts.FindOwnedAsync(postId, userId, ct);
        if (post is null) return false;
        var now = clock.UtcNow;
        if (!post.CanCancel(now)) throw new BusinessRuleException("POST_CANCEL_WINDOW_ENDED", "The 10-minute cancellation period has ended.");
        post.Cancel(now);
        await unitOfWork.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<CalendarDayDto>> CalendarAsync(Guid userId, int year, int month, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct) ?? throw new BusinessRuleException("USER_NOT_FOUND", "User not found.");
        var visibleOn = AuthApplicationService.UserLocalDate(clock.UtcNow, user.Timezone);
        var start = new DateOnly(year, month, 1);
        return await posts.CalendarAsync(userId, start, start.AddMonths(1), visibleOn, ct);
    }

    public async Task<IReadOnlyList<PostDto>> CalendarDayAsync(Guid userId, DateOnly date, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct) ?? throw new BusinessRuleException("USER_NOT_FOUND", "User not found.");
        var today = AuthApplicationService.UserLocalDate(clock.UtcNow, user.Timezone);
        if (date > today) return [];
        var result = new List<PostDto>();
        foreach (var row in await posts.OnUnlockDateAsync(userId, date, ct)) result.Add(await MapAsync(row, true, ct));
        return result;
    }

    public async Task<IReadOnlyList<PostDto>> MemoriesAsync(Guid userId, DateOnly today, int yearsAgo, CancellationToken ct) =>
        await CalendarDayAsync(userId, today, ct);

    private async Task<PostDto> MapAsync(Post post, bool includeContent, CancellationToken ct)
    {
        var media = new List<MediaDto>();
        if (includeContent)
        {
            foreach (var item in post.Media)
            {
                var readUri = await storage.GetReadUriAsync(item.StorageKey, TimeSpan.FromMinutes(15), ct);
                media.Add(new(item.Id, item.Kind.ToString().ToLowerInvariant(), item.ContentType, item.ByteSize, readUri.ToString()));
            }
        }
        return new(post.Id, includeContent ? post.Caption : null, post.OccurredOn, post.UnlockOn, post.DailySequence, post.CreatedAt, post.CancelableUntil, media);
    }

    private static string EncodeCursor(Post post) => Convert.ToBase64String(Encoding.UTF8.GetBytes($"{post.CreatedAt:O}|{post.Id}"));
    private static (DateTimeOffset Time, Guid Id)? DecodeCursor(string? value)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            var parts = Encoding.UTF8.GetString(Convert.FromBase64String(value)).Split('|');
            return (DateTimeOffset.Parse(parts[0]), Guid.Parse(parts[1]));
        }
        catch { return null; }
    }
}
