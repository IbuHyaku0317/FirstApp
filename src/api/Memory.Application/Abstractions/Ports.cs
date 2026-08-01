using Memory.Domain;

namespace Memory.Application;

// Application層が必要とする機能を「ポート」として定義する。
// 実装はInfrastructure層に置き、ユースケースをDBや外部サービスから独立させる。
public interface IUserRepository
{
    Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken ct);
    Task<User?> FindByEmailAsync(string normalizedEmail, CancellationToken ct);
    Task<User?> FindByIdAsync(Guid id, CancellationToken ct);
    void Add(User user);
}
public interface IPostRepository
{
    void Add(Post post);
    Task<Post?> FindOwnedAsync(Guid postId, Guid userId, CancellationToken ct);
    Task<IReadOnlyList<Post>> ListAsync(Guid userId, int take, DateTimeOffset? beforeTime, Guid? beforeId, CancellationToken ct);
    Task<IReadOnlyList<Post>> OnDateAsync(Guid userId, DateOnly date, CancellationToken ct);
    Task<IReadOnlyList<CalendarDayDto>> CalendarAsync(Guid userId, DateOnly start, DateOnly end, CancellationToken ct);
}
public interface IUnitOfWork
{
    Task SaveChangesAsync(CancellationToken ct);
}

public interface IPasswordService
{
    string Hash(User user, string password);
    bool Verify(User user, string password);
}
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
