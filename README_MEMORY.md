# Memory SNS

写真と動画を個人で記録し、カレンダーや「一年前の今日」から振り返るSNSのMVPです。既存のSpring Boot/Reactコードとは分離し、新規実装は `src/api` と `src/web` に配置しています。

## 必要な環境

- .NET 10 SDK
- Node.js 22+ と pnpm 10+
- Docker Desktop（PostgreSQL用）

## 起動

```powershell
docker compose up -d
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate --project src/api/Memory.Infrastructure --startup-project src/api/Memory.Api
dotnet ef database update --project src/api/Memory.Infrastructure --startup-project src/api/Memory.Api
dotnet run --project src/api/Memory.Api
```

別のターミナルで:

```powershell
cd src/web
pnpm install
pnpm dev
```

Webは `http://localhost:5173`、APIは `http://localhost:5080` です。PostgreSQLは既存環境との競合を避けるためホストの `55432` 番ポートを使用します。本番では `Jwt__SigningKey` をSecret Manager等から与え、開発用キーを使用しないでください。

## 現在の実装範囲

- 登録、ログイン、JWT更新、ログアウト
- HttpOnly Cookieのローテーション式リフレッシュトークン
- 所有者スコープ付き投稿CRUDとカーソルページング
- ローカルメディア保存（`IMediaStorage` 抽象化）
- 無料会員の動画投稿拒否
- 月別カレンダーと「一年前の今日」
- Reactの主要7画面とレスポンシブUI

R2アダプター、画像シグネチャ検査、サムネイル生成、Outbox/孤立ファイル定期清掃、統合テストは次の実装段階です。

## アーキテクチャ

FEはAtomic Designで構成しています。

```text
src/web/src/
  components/
    atoms/        最小UI要素
    molecules/    入力項目・状態表示などの組み合わせ
    organisms/    ヘッダー・フォーム・投稿カード
    templates/    ページ共通レイアウト
  pages/          ルート単位の画面
  providers/      セッションなどの横断状態
  shared/         APIクライアントと共有型
  app/            ルーティングとアプリケーション構成
```

BEはDDDを取り入れたOnion Architectureです。依存方向は常に内側を向きます。

```text
Memory.Api              HTTP・認証・エンドポイント（Presentation）
    ↓
Memory.Application      ユースケース・DTO・ポート
    ↓
Memory.Domain           集約・エンティティ・ドメインポリシー

Memory.Infrastructure   EF Core・PostgreSQL・JWT・ストレージ
    ↓
Memory.Application / Memory.Domain
```

API層はEF Coreの `MemoryDbContext` を直接利用せず、Application層のユースケースを呼び出します。Infrastructure層はApplication層で定義したポートを実装します。
