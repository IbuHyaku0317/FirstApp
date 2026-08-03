using System.Buffers.Binary;
using System.Text;

namespace Memory.Api.Endpoints;

/// <summary>MIME申告だけを信用せず、ファイル署名とMP4の実時間を検査する。</summary>
internal static class MediaFileInspector
{
    internal static bool MatchesContentType(Stream stream, string contentType)
    {
        if (!stream.CanSeek) return false;
        var original = stream.Position;
        Span<byte> header = stackalloc byte[12];
        var read = stream.Read(header);
        stream.Position = original;
        return contentType.ToLowerInvariant() switch
        {
            "image/jpeg" => read >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            "image/png" => read >= 8 && header[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            "image/webp" => read >= 12 && Encoding.ASCII.GetString(header[..4]) == "RIFF" && Encoding.ASCII.GetString(header[8..12]) == "WEBP",
            "video/mp4" => read >= 12 && Encoding.ASCII.GetString(header[4..8]) == "ftyp",
            _ => false,
        };
    }

    internal static double? ReadMp4DurationSeconds(Stream stream)
    {
        if (!stream.CanSeek) return null;
        var original = stream.Position;
        try { return FindMovieHeader(stream, 0, stream.Length, 0); }
        finally { stream.Position = original; }
    }

    private static double? FindMovieHeader(Stream stream, long start, long end, int depth)
    {
        if (depth > 2) return null;
        stream.Position = start;
        Span<byte> header = stackalloc byte[16];
        while (stream.Position + 8 <= end)
        {
            var boxStart = stream.Position;
            if (stream.Read(header[..8]) != 8) return null;
            ulong size = BinaryPrimitives.ReadUInt32BigEndian(header[..4]);
            var type = Encoding.ASCII.GetString(header[4..8]);
            var headerSize = 8L;
            if (size == 1)
            {
                if (stream.Read(header[..8]) != 8) return null;
                size = BinaryPrimitives.ReadUInt64BigEndian(header[..8]);
                headerSize = 16;
            }
            else if (size == 0) size = (ulong)(end - boxStart);

            if (size < (ulong)headerSize || size > (ulong)(end - boxStart)) return null;
            var dataStart = boxStart + headerSize;
            var boxEnd = boxStart + (long)size;
            if (type == "mvhd") return ReadMovieHeader(stream, dataStart, boxEnd);
            if (type == "moov")
            {
                var duration = FindMovieHeader(stream, dataStart, boxEnd, depth + 1);
                if (duration is not null) return duration;
            }
            stream.Position = boxEnd;
        }
        return null;
    }

    private static double? ReadMovieHeader(Stream stream, long start, long end)
    {
        stream.Position = start;
        Span<byte> prefix = stackalloc byte[4];
        if (stream.Read(prefix) != 4) return null;
        var version = prefix[0];
        var skip = version == 1 ? 16 : version == 0 ? 8 : -1;
        if (skip < 0 || stream.Position + skip + 8 > end) return null;
        stream.Position += skip;
        Span<byte> values = stackalloc byte[12];
        var required = version == 1 ? 12 : 8;
        if (stream.Read(values[..required]) != required) return null;
        var timescale = BinaryPrimitives.ReadUInt32BigEndian(values[..4]);
        if (timescale == 0) return null;
        var duration = version == 1
            ? BinaryPrimitives.ReadUInt64BigEndian(values[4..12])
            : BinaryPrimitives.ReadUInt32BigEndian(values[4..8]);
        return duration / (double)timescale;
    }
}
