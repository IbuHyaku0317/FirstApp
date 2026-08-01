using Memory.Domain;

namespace Memory.Application;

public interface IMediaStorage
{
    Task<StoredMedia> PutAsync(Stream content, string contentType, string extension, CancellationToken ct);
    Task<Stream> OpenReadAsync(string storageKey, CancellationToken ct);
    Task DeleteAsync(string storageKey, CancellationToken ct);
    Task<Uri> GetReadUriAsync(string storageKey, TimeSpan lifetime, CancellationToken ct);
}

public sealed record StoredMedia(string StorageKey, long ByteSize);
public sealed record AuthResult(string AccessToken, DateTimeOffset ExpiresAt, string RefreshToken);
public sealed record UserDto(Guid Id, string DisplayName, string Email, string Membership, string Timezone);
public sealed record MediaDto(Guid Id, string Kind, string ContentType, long ByteSize, string Url);
public sealed record PostDto(Guid Id, string? Caption, DateOnly OccurredOn, DateTimeOffset CreatedAt, IReadOnlyList<MediaDto> Media);
public sealed record PageDto<T>(IReadOnlyList<T> Items, string? NextCursor);

public static class AnniversaryRule
{
    public static DateOnly DateYearsAgo(DateOnly today, int yearsAgo)
    {
        var year = today.Year - yearsAgo;
        if (today.Month == 2 && today.Day == 28 && DateTime.IsLeapYear(year)) return new(year, 2, 29);
        return new(year, today.Month, today.Day);
    }
}
