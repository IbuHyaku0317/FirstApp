using Memory.Domain;

namespace Memory.Application;

public interface IUserRepository
{
    Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken ct);
    Task<User?> FindByEmailAsync(string normalizedEmail, CancellationToken ct);
    Task<User?> FindByIdAsync(Guid id, CancellationToken ct);
    void Add(User user);
}

public interface IAnniversaryRepository
{
    Task<AnniversarySetting?> FindCurrentAsync(Guid userId, CancellationToken ct);
    void Add(AnniversarySetting setting);
}

public interface IPostRepository
{
    void Add(Post post);
    Task<Post?> FindOwnedAsync(Guid postId, Guid userId, CancellationToken ct);
    Task<int> CountOnAsync(Guid userId, DateOnly occurredOn, CancellationToken ct);
    Task<IReadOnlyList<Post>> OnOccurredDateAsync(Guid userId, DateOnly date, CancellationToken ct);
    Task<IReadOnlyList<Post>> ListAsync(Guid userId, DateOnly visibleOn, int take, DateTimeOffset? beforeTime, Guid? beforeId, CancellationToken ct);
    Task<IReadOnlyList<Post>> OnUnlockDateAsync(Guid userId, DateOnly date, CancellationToken ct);
    Task<IReadOnlyList<Post>> LockedSecondPostsAsync(Guid userId, Guid anniversarySettingId, DateOnly after, CancellationToken ct);
    Task<bool> CanReadStorageKeyAsync(Guid userId, string storageKey, DateOnly visibleOn, DateTimeOffset now, CancellationToken ct);
    Task<IReadOnlyList<CalendarDayDto>> CalendarAsync(Guid userId, DateOnly start, DateOnly end, DateOnly visibleOn, CancellationToken ct);
}

public interface IUnitOfWork { Task SaveChangesAsync(CancellationToken ct); }
public interface IPasswordService { string Hash(User user, string password); bool Verify(User user, string password); }
public interface ITokenService
{
    Task<AuthResult> IssueAsync(User user, string? device, CancellationToken ct);
    Task<AuthResult?> RotateAsync(string rawToken, CancellationToken ct);
    Task RevokeAsync(string rawToken, CancellationToken ct);
}
public interface IMediaStorage
{
    Task<StoredMedia> PutAsync(Stream content, string contentType, string extension, CancellationToken ct);
    Task<Stream> OpenReadAsync(string storageKey, CancellationToken ct);
    Task DeleteAsync(string storageKey, CancellationToken ct);
    Task<Uri> GetReadUriAsync(string storageKey, TimeSpan lifetime, CancellationToken ct);
}
