namespace Memory.Domain;

/// <summary>1つのメディアとメッセージを1年後まで保護する投稿集約。</summary>
public sealed class Post
{
    private Post() { }

    public Post(Guid userId, string? caption, DateOnly occurredOn, int dailySequence = 1, Guid? anniversarySettingId = null)
    {
        if (dailySequence is < 1 or > 2) throw new ArgumentOutOfRangeException(nameof(dailySequence));
        Id = Guid.NewGuid();
        UserId = userId;
        Caption = caption;
        OccurredOn = occurredOn;
        UnlockOn = AnniversaryPolicy.DateNextYear(occurredOn);
        DailySequence = dailySequence;
        AnniversarySettingId = anniversarySettingId;
        CreatedAt = UpdatedAt = DateTimeOffset.UtcNow;
        CancelableUntil = CreatedAt.AddMinutes(10);
    }

    public Guid Id { get; private init; }
    public Guid UserId { get; private init; }
    public User User { get; private init; } = null!;
    public Guid? AnniversarySettingId { get; private init; }
    public AnniversarySetting? AnniversarySetting { get; private init; }
    public string? Caption { get; private set; }
    public DateOnly OccurredOn { get; private init; }
    public DateOnly UnlockOn { get; private init; }
    public int DailySequence { get; private init; }
    public string? SuppressionReason { get; private set; }
    public DateTimeOffset CancelableUntil { get; private init; }
    public DateTimeOffset CreatedAt { get; private init; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public List<MediaAsset> Media { get; private init; } = [];

    public void AddMedia(MediaAsset media) => Media.Add(media);
    public bool CanCancel(DateTimeOffset now) => DeletedAt is null && now <= CancelableUntil;
    public void Cancel(DateTimeOffset now)
    {
        if (!CanCancel(now)) throw new InvalidOperationException("The cancellation period has ended.");
        DeletedAt = UpdatedAt = now;
    }
    public void SuppressBecauseAnniversaryChanged()
    {
        if (DailySequence == 2) SuppressionReason = "anniversary_changed_before_unlock";
    }
}

public sealed class MediaAsset
{
    private MediaAsset() { }
    public MediaAsset(Guid postId, MediaKind kind, string storageKey, string contentType, long byteSize)
    {
        Id = Guid.NewGuid(); PostId = postId; Kind = kind; StorageKey = storageKey;
        ContentType = contentType; ByteSize = byteSize; CreatedAt = DateTimeOffset.UtcNow;
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
