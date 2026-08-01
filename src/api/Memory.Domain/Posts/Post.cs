namespace Memory.Domain;

/// <summary>
/// 投稿集約ルート。MediaAssetは必ずPostを経由して追加・管理する。
/// </summary>
public sealed class Post
{
    private Post() { }
    public Post(Guid userId, string? caption, DateOnly occurredOn)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        Caption = caption;
        OccurredOn = occurredOn;
        CreatedAt = UpdatedAt = DateTimeOffset.UtcNow;
    }
    public Guid Id { get; private init; }
    public Guid UserId { get; private init; }
    public User User { get; private init; } = null!;
    public string? Caption { get; private set; }
    public DateOnly OccurredOn { get; private init; }
    public DateTimeOffset CreatedAt { get; private init; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public List<MediaAsset> Media { get; private init; } = [];
    public void AddMedia(MediaAsset media) => Media.Add(media);
    public void Delete()
    {
        DeletedAt = DateTimeOffset.UtcNow;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}

public sealed class MediaAsset
{
    private MediaAsset() { }
    public MediaAsset(Guid postId, MediaKind kind, string storageKey, string contentType, long byteSize)
    {
        Id = Guid.NewGuid();
        PostId = postId;
        Kind = kind;
        StorageKey = storageKey;
        ContentType = contentType;
        ByteSize = byteSize;
        CreatedAt = DateTimeOffset.UtcNow;
    }
    public Guid Id { get; private init; }
    public Guid PostId { get; private init; }
    public Post Post { get; private init; } = null!;
    public MediaKind Kind { get; private init; }
    public string StorageKey { get; private init; } = null!;
    public string ContentType { get; private init; } = null!;
    public long ByteSize { get; private init; }
    public MediaStatus Status { get; private set; } = MediaStatus.Ready;
    public DateTimeOffset CreatedAt { get; private init; }
    public void MarkFailed() => Status = MediaStatus.Failed;
}
