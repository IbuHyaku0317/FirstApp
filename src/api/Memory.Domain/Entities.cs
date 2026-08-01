namespace Memory.Domain;

public enum Membership { Free, Premium }
public enum MediaKind { Image, Video }
public enum MediaStatus { Pending, Ready, Failed }

public sealed class User
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string DisplayName { get; set; }
    public required string Email { get; set; }
    public required string NormalizedEmail { get; set; }
    public required string PasswordHash { get; set; }
    public Membership Membership { get; set; } = Membership.Free;
    public string Timezone { get; set; } = "Asia/Tokyo";
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? DeletedAt { get; set; }
}

public sealed class Post
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid UserId { get; init; }
    public User User { get; init; } = null!;
    public string? Caption { get; set; }
    public DateOnly OccurredOn { get; init; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? DeletedAt { get; set; }
    public List<MediaAsset> Media { get; init; } = [];
}

public sealed class MediaAsset
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid PostId { get; init; }
    public Post Post { get; init; } = null!;
    public MediaKind Kind { get; init; }
    public required string StorageKey { get; init; }
    public required string ContentType { get; init; }
    public long ByteSize { get; init; }
    public MediaStatus Status { get; set; } = MediaStatus.Ready;
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}

public sealed class RefreshToken
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid UserId { get; init; }
    public required string TokenHash { get; init; }
    public DateTimeOffset ExpiresAt { get; init; }
    public DateTimeOffset? RevokedAt { get; set; }
    public Guid? ReplacedByTokenId { get; set; }
    public string? Device { get; init; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
