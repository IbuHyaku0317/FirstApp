using Memory.Application;
using Memory.Domain;
using Microsoft.EntityFrameworkCore;

namespace Memory.Infrastructure;

/// <summary>すべての投稿クエリを認証ユーザーIDで制限するEF Coreアダプター。</summary>
public sealed class MemoryRepository(MemoryDbContext db) : IUserRepository, IAnniversaryRepository, IPostRepository, IUnitOfWork
{
    public Task<bool> EmailExistsAsync(string email, CancellationToken ct) => db.Users.AnyAsync(x => x.NormalizedEmail == email, ct);
    public Task<User?> FindByEmailAsync(string email, CancellationToken ct) => db.Users.SingleOrDefaultAsync(x => x.NormalizedEmail == email, ct);
    public Task<User?> FindByIdAsync(Guid id, CancellationToken ct) => db.Users.SingleOrDefaultAsync(x => x.Id == id, ct);
    public void Add(User user) => db.Users.Add(user);

    public Task<AnniversarySetting?> FindCurrentAsync(Guid userId, CancellationToken ct) =>
        db.AnniversarySettings.SingleOrDefaultAsync(x => x.UserId == userId && x.EffectiveTo == null, ct);
    void IAnniversaryRepository.Add(AnniversarySetting setting) => db.AnniversarySettings.Add(setting);

    void IPostRepository.Add(Post post) => db.Posts.Add(post);
    public Task<Post?> FindOwnedAsync(Guid postId, Guid userId, CancellationToken ct) =>
        db.Posts.Include(x => x.Media).SingleOrDefaultAsync(x => x.Id == postId && x.UserId == userId, ct);
    public Task<int> CountOnAsync(Guid userId, DateOnly occurredOn, CancellationToken ct) =>
        db.Posts.CountAsync(x => x.UserId == userId && x.OccurredOn == occurredOn, ct);
    public async Task<IReadOnlyList<Post>> OnOccurredDateAsync(Guid userId, DateOnly date, CancellationToken ct) =>
        await db.Posts.Include(x => x.Media).Where(x => x.UserId == userId && x.OccurredOn == date).OrderBy(x => x.DailySequence).ToListAsync(ct);

    public async Task<IReadOnlyList<Post>> ListAsync(Guid userId, DateOnly visibleOn, int take, DateTimeOffset? beforeTime, Guid? beforeId, CancellationToken ct)
    {
        var query = db.Posts.Include(x => x.Media)
            .Where(x => x.UserId == userId && x.UnlockOn <= visibleOn && x.SuppressionReason == null);
        if (beforeTime is { } time && beforeId is { } id)
            query = query.Where(x => x.CreatedAt < time || x.CreatedAt == time && x.Id.CompareTo(id) < 0);
        return await query.OrderByDescending(x => x.UnlockOn).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Take(take).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Post>> OnUnlockDateAsync(Guid userId, DateOnly date, CancellationToken ct) =>
        await db.Posts.Include(x => x.Media)
            .Where(x => x.UserId == userId && x.UnlockOn == date && x.SuppressionReason == null)
            .OrderBy(x => x.DailySequence).ToListAsync(ct);

    public async Task<IReadOnlyList<Post>> LockedSecondPostsAsync(Guid userId, Guid anniversarySettingId, DateOnly after, CancellationToken ct) =>
        await db.Posts.Where(x => x.UserId == userId && x.AnniversarySettingId == anniversarySettingId && x.DailySequence == 2 && x.UnlockOn > after && x.SuppressionReason == null).ToListAsync(ct);

    public Task<bool> CanReadStorageKeyAsync(Guid userId, string storageKey, DateOnly visibleOn, DateTimeOffset now, CancellationToken ct) =>
        db.MediaAssets.AnyAsync(x =>
            x.Post.UserId == userId &&
            x.StorageKey == storageKey &&
            x.Post.SuppressionReason == null &&
            (x.Post.UnlockOn <= visibleOn || now <= x.Post.CancelableUntil), ct);

    public async Task<IReadOnlyList<CalendarDayDto>> CalendarAsync(Guid userId, DateOnly start, DateOnly end, DateOnly visibleOn, CancellationToken ct) =>
        await db.Posts
            .Where(x => x.UserId == userId && x.UnlockOn >= start && x.UnlockOn < end && x.UnlockOn <= visibleOn && x.SuppressionReason == null)
            .GroupBy(x => x.UnlockOn)
            .Select(group => new CalendarDayDto(group.Key, group.Count()))
            .ToListAsync(ct);

    public async Task SaveChangesAsync(CancellationToken ct) => await db.SaveChangesAsync(ct);
}
