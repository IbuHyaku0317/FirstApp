using Memory.Application;
using Microsoft.Extensions.Options;

namespace Memory.Infrastructure;

public sealed class MediaOptions
{
    public string Provider { get; set; } = "Local";
    public string LocalRoot { get; set; } = "App_Data/media";
}

public sealed class LocalMediaStorage(IOptions<MediaOptions> options) : IMediaStorage
{
    private readonly string root = Path.GetFullPath(options.Value.LocalRoot);
    public async Task<StoredMedia> PutAsync(Stream content, string contentType, string extension, CancellationToken ct)
    {
        var key = $"{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}{extension}";
        var path = Resolve(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        await using var output = File.Create(path);
        await content.CopyToAsync(output, ct);
        return new(key, output.Length);
    }
    public Task<Stream> OpenReadAsync(string key, CancellationToken ct) => Task.FromResult<Stream>(File.OpenRead(Resolve(key)));
    public Task DeleteAsync(string key, CancellationToken ct)
    {
        File.Delete(Resolve(key));
        return Task.CompletedTask;
    }
    public Task<Uri> GetReadUriAsync(string key, TimeSpan lifetime, CancellationToken ct)
    {
        // キー全体をエスケープすると区切りの '/' まで %2F になり、Catch-allルートで
        // DB上のstorage_keyと一致しない。各パス要素だけを安全にエスケープする。
        var escapedKey = string.Join('/', key.Split('/').Select(Uri.EscapeDataString));
        return Task.FromResult(new Uri($"/api/v1/media/{escapedKey}", UriKind.Relative));
    }
    private string Resolve(string key)
    {
        var relativePath = key.Replace('/', Path.DirectorySeparatorChar);
        var path = Path.GetFullPath(Path.Combine(root, relativePath));

        if (!path.StartsWith(root, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid storage key.");
        }

        return path;
    }
}
