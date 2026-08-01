using System.Text;
using Memory.Domain;

namespace Memory.Application;

/// <summary>投稿、フィード、カレンダー、記念日表示を扱う投稿ユースケース。</summary>
public sealed class PostApplicationService(IPostRepository posts, IUnitOfWork unitOfWork, IMediaStorage storage)
{
    public async Task<PostDto> CreateAsync(CreatePostCommand command, CancellationToken ct)
    {
        var stored = await storage.PutAsync(command.Content, command.ContentType, command.Extension, ct);
        try
        {
            var post = new Post(command.UserId, command.Caption, command.OccurredOn);
            post.AddMedia(new MediaAsset(post.Id, command.ContentType.StartsWith("video/") ? MediaKind.Video : MediaKind.Image, stored.StorageKey, command.ContentType, stored.ByteSize));
            posts.Add(post);
            await unitOfWork.SaveChangesAsync(ct);
            return await MapAsync(post, ct);
        }
        catch
        {
            // DBとオブジェクトストレージは同一トランザクションにできない。
            // DB保存に失敗した場合は、先に保存したファイルを補償削除する。
            try
            {
                await storage.DeleteAsync(stored.StorageKey, ct);
            }
            catch
            {
                // 孤立ファイル清掃ジョブで後から回収する。
            }
            throw;
        }
    }
    public async Task<PageDto<PostDto>> ListAsync(Guid userId, int limit, string? cursor, CancellationToken ct)
    {
        var take = Math.Clamp(limit, 1, 50);
        var decoded = DecodeCursor(cursor);
        var rows = (await posts.ListAsync(userId, take + 1, decoded?.Time, decoded?.Id, ct)).ToList();
        var more = rows.Count > take;
        if (more)
        {
            rows.RemoveAt(take);
        }

        var items = new List<PostDto>();
        foreach (var row in rows)
        {
            items.Add(await MapAsync(row, ct));
        }

        return new(items, more && rows.Count > 0 ? EncodeCursor(rows[^1]) : null);
    }

    public async Task<PostDto?> GetAsync(Guid postId, Guid userId, CancellationToken ct)
    {
        var post = await posts.FindOwnedAsync(postId, userId, ct);
        return post is null ? null : await MapAsync(post, ct);
    }

    public async Task<bool> DeleteAsync(Guid postId, Guid userId, CancellationToken ct)
    {
        var post = await posts.FindOwnedAsync(postId, userId, ct);
        if (post is null)
        {
            return false;
        }

        post.Delete();
        await unitOfWork.SaveChangesAsync(ct);
        return true;
    }

    public Task<IReadOnlyList<CalendarDayDto>> CalendarAsync(Guid userId, int year, int month, CancellationToken ct)
    {
        var start = new DateOnly(year, month, 1);
        return posts.CalendarAsync(userId, start, start.AddMonths(1), ct);
    }

    public async Task<IReadOnlyList<PostDto>> MemoriesAsync(Guid userId, DateOnly today, int yearsAgo, CancellationToken ct)
    {
        var anniversary = AnniversaryPolicy.DateYearsAgo(today, yearsAgo);
        var rows = await posts.OnDateAsync(userId, anniversary, ct);
        var result = new List<PostDto>();

        foreach (var row in rows)
        {
            result.Add(await MapAsync(row, ct));
        }

        return result;
    }

    private async Task<PostDto> MapAsync(Post post, CancellationToken ct)
    {
        var media = new List<MediaDto>();
        foreach (var item in post.Media)
        {
            var readUri = await storage.GetReadUriAsync(item.StorageKey, TimeSpan.FromMinutes(15), ct);
            media.Add(new(item.Id, item.Kind.ToString().ToLowerInvariant(), item.ContentType, item.ByteSize, readUri.ToString()));
        }

        return new(post.Id, post.Caption, post.OccurredOn, post.CreatedAt, media);
    }
    // createdAtが同じ投稿でも順序が安定するよう、IDを第2ソートキーに含める。
    private static string EncodeCursor(Post post) => Convert.ToBase64String(Encoding.UTF8.GetBytes($"{post.CreatedAt:O}|{post.Id}"));
    private static (DateTimeOffset Time, Guid Id)? DecodeCursor(string? value)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(value));
            var parts = decoded.Split('|');
            return (DateTimeOffset.Parse(parts[0]), Guid.Parse(parts[1]));
        }
        catch
        {
            return null;
        }
    }
}
