using Memory.Application;

namespace Memory.Infrastructure;

/// <summary>
/// 本番の業務ルールを変更せず、待ち時間や課金接続が必要な機能をローカルで確認するための設定。
/// ASP.NET CoreのDevelopment環境で起動した場合だけ有効になる。
/// </summary>
public sealed class DevelopmentFeatures(bool enabled) : IDevelopmentFeatures
{
    public bool AllowFreeVideoPosts { get; } = enabled;
}
