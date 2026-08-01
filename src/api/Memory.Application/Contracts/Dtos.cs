namespace Memory.Application;

public sealed record StoredMedia(string StorageKey, long ByteSize);
public sealed record AuthResult(string AccessToken, DateTimeOffset ExpiresAt, string RefreshToken);
public sealed record AuthenticatedUserDto(string AccessToken, DateTimeOffset ExpiresAt, string RefreshToken, UserDto User);
public sealed record AnniversaryDto(string Name, int Month, int Day, DateOnly? NextChangeAllowedOn);
public sealed record UserDto(Guid Id, string DisplayName, string Email, string Membership, string Timezone, string PreferredLanguage, bool AnniversarySetupCompleted, AnniversaryDto? Anniversary);
public sealed record MediaDto(Guid Id, string Kind, string ContentType, long ByteSize, string Url);
public sealed record PostDto(Guid Id, string? Caption, DateOnly OccurredOn, DateOnly UnlockOn, int DailySequence, DateTimeOffset CreatedAt, DateTimeOffset CancelableUntil, IReadOnlyList<MediaDto> Media);
public sealed record PageDto<T>(IReadOnlyList<T> Items, string? NextCursor);
public sealed record CalendarDayDto(DateOnly Date, int Count);
public sealed record TodayStatusDto(DateOnly OccurredOn, int Used, int Limit, bool IsAnniversary, DateTimeOffset ServerNow, IReadOnlyList<PostDto> CancelablePosts);
public sealed record CreatePostCommand(Guid UserId, string? Caption, Stream Content, string ContentType, string Extension);

public sealed class BusinessRuleException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}
