using Memory.Application;
using Memory.Domain;
using Microsoft.EntityFrameworkCore;

namespace Memory.Infrastructure;

/// <summary>
/// Application層のRepositoryポートをEF Coreで実装するアダプター。
/// 全投稿クエリは必ずuserIdで所有者を限定する。
/// </summary>
public sealed class MemoryRepository(MemoryDbContext db) : IUserRepository, IPostRepository, IUnitOfWork
{
    public Task<bool> EmailExistsAsync(string email, CancellationToken ct) => db.Users.AnyAsync(x => x.NormalizedEmail == email, ct);
    public Task<User?> FindByEmailAsync(string email, CancellationToken ct) => db.Users.SingleOrDefaultAsync(x => x.NormalizedEmail == email, ct);
    public Task<User?> FindByIdAsync(Guid id, CancellationToken ct) => db.Users.SingleOrDefaultAsync(x => x.Id == id, ct);
    public void Add(User user) => db.Users.Add(user);
    void IPostRepository.Add(Post post) => db.Posts.Add(post);
    public Task<Post?> FindOwnedAsync(Guid postId, Guid userId, CancellationToken ct) => db.Posts.Include(x => x.Media).SingleOrDefaultAsync(x => x.Id == postId && x.UserId == userId, ct);
    public async Task<IReadOnlyList<Post>> ListAsync(Guid userId, int take, DateTimeOffset? beforeTime, Guid? beforeId, CancellationToken ct)
    {
        var query = db.Posts.Include(x => x.Media).Where(x => x.UserId == userId);
        if (beforeTime is { } time && beforeId is { } id) query = query.Where(x => x.CreatedAt < time || x.CreatedAt == time && x.Id.CompareTo(id) < 0);
        return await query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Take(take).ToListAsync(ct);
    }
    public async Task<IReadOnlyList<Post>> OnDateAsync(Guid userId, DateOnly date, CancellationToken ct) => await db.Posts.Include(x => x.Media).Where(x => x.UserId == userId && x.OccurredOn == date).OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
    public async Task<IReadOnlyList<CalendarDayDto>> CalendarAsync(Guid userId, DateOnly start, DateOnly end, CancellationToken ct) => await db.Posts.Where(x => x.UserId == userId && x.OccurredOn >= start && x.OccurredOn < end).GroupBy(x => x.OccurredOn).Select(group => new CalendarDayDto(group.Key, group.Count())).ToListAsync(ct);
    public async Task SaveChangesAsync(CancellationToken ct) => await db.SaveChangesAsync(ct);
}
