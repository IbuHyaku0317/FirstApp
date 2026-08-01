# BEソース構成

DDDを取り入れたOnion Architectureです。依存関係は外側から内側へだけ向けます。

- `Memory.Domain`: 集約、エンティティ、ドメインポリシー。フレームワークに依存しない
- `Memory.Application`: ユースケース、DTO、Repositoryやストレージのポート
- `Memory.Infrastructure`: EF Core、PostgreSQL、JWT、パスワード、メディア保存のアダプター
- `Memory.Api`: HTTP入力、認証、Cookie、レスポンスへの変換

処理の流れは基本的に次のとおりです。

```text
HTTP Endpoint
  → Application Service（ユースケース）
    → Domain（業務ルール）
    → Port（インターフェース）
      → Infrastructure Adapter（DB・JWT・ストレージ）
```

API層から `MemoryDbContext` を直接参照しないこと、Domain層へASP.NET CoreやEF Coreの依存を追加しないことを守ります。
