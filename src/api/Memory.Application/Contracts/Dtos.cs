namespace Memory.Application;

public sealed record StoredMedia(string StorageKey, long ByteSize);
public sealed record AuthResult(string AccessToken, DateTimeOffset ExpiresAt, string RefreshToken);
public sealed record AuthenticatedUserDto(string AccessToken, DateTimeOffset ExpiresAt, string RefreshToken, UserDto User);
public sealed record UserDto(Guid Id, string DisplayName, string Email, string Membership, string Timezone);
public sealed record MediaDto(Guid Id, string Kind, string ContentType, long ByteSize, string Url);
public sealed record PostDto(Guid Id, string? Caption, DateOnly OccurredOn, DateTimeOffset CreatedAt, IReadOnlyList<MediaDto> Media);
public sealed record PageDto<T>(IReadOnlyList<T> Items, string? NextCursor);
public sealed record CalendarDayDto(DateOnly Date, int Count);
public sealed record CreatePostCommand(Guid UserId, string? Caption, DateOnly OccurredOn, Stream Content, string ContentType, string Extension);
