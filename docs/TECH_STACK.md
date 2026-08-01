# 利用技術・環境設計書

## 1. 文書の目的

本書は、iPhone／Android向けアプリとバックエンドを新規構築・運用するための技術スタックおよび環境方針を定義する。
各製品の細かなバージョン番号は実装開始時に安定版を再確認し、lockファイル、SDK設定、コンテナイメージで固定する。

## 2. 全体構成

| 領域 | 採用技術 | 用途 |
| --- | --- | --- |
| Mobile | React Native＋Expo＋TypeScript | iOS／Android共通アプリ |
| Navigation | Expo Router | 画面遷移、Deep Link |
| Server State | TanStack Query | APIキャッシュ、再取得、Mutation |
| Form | React Hook Form＋Zod | 入力管理、クライアント検証 |
| Localization | i18next系 | 日本語／英語 |
| Secure Storage | Expo SecureStore | リフレッシュトークン保護 |
| Backend | C#／ASP.NET Core Web API | REST API、認証、業務処理 |
| Architecture | DDD＋Onion Architecture | ドメイン分離と依存方向管理 |
| ORM | Entity Framework Core | PostgreSQLアクセス、Migration |
| Database | PostgreSQL | 永続データ |
| Media Storage | Cloudflare R2 | 非公開の写真・動画保存 |
| Local Storage Adapter | ローカルファイル保存 | 開発環境用、`IMediaStorage` 実装 |
| Cache／Job補助 | Redis（必要になった段階） | 分散ロック、ジョブ、レート制限 |
| Push | Expo Notifications＋APNs／FCM | 解禁通知 |
| API Contract | OpenAPI | モバイル向け型生成、仕様共有 |
| Containers | Docker／Docker Compose | ローカルDBと周辺サービス |
| CI/CD | GitHub Actions | テスト、ビルド、配布 |
| Observability | OpenTelemetry＋Sentry等 | ログ、トレース、例外監視 |

## 3. モバイル技術方針

### 3.1 React Native＋Expoを採用する理由

- iOSとAndroidで大部分のTypeScriptコードを共有できる。
- カメラ、写真選択、SecureStore、通知、Deep Linkを統一的に扱える。
- EAS Build／Submitを利用して署名済みアプリの配布工程を標準化できる。
- 必要になった場合はDevelopment Buildやネイティブモジュールを追加できる。

Expo Goだけを本番前提にせず、課金・通知・実機権限を含む検証ではDevelopment Buildを使用する。

### 3.2 推奨パッケージ領域

- Expo Router：Stack／TabsとDeep Link
- TanStack Query：APIサーバー状態
- React Hook Form＋Zod：フォーム
- Expo Image Picker／Camera：写真・動画取得
- Expo File System：アップロード前処理
- Expo SecureStore：秘密情報
- Expo Notifications：Push通知
- React Native Testing Library：コンポーネントテスト
- MaestroまたはDetox：E2E

ライブラリは実装開始時のExpo SDK互換表を基準に選び、独立して最新版へ上げない。

## 4. バックエンド技術方針

### 4.1 .NET

- 実装開始時のサポート対象LTS版.NETを基本とする。
- ASP.NET Core Web APIのControllerまたはEndpoint Groupをモジュール単位で構成する。
- Domain、Application、Infrastructure、APIをプロジェクト分離する。
- Nullable Reference Typesと警告の厳格化を有効にする。
- OpenAPIをCIで生成し、破壊的変更を検査する。

### 4.2 主なバックエンド要素

- EF Core＋Npgsql
- JWTアクセストークン
- ローテーション式リフレッシュトークン
- RFC 9457 Problem Details
- FluentValidation相当の入力検証（採用ライブラリは実装開始時に決定）
- `IMediaStorage` によるローカル保存／Cloudflare R2切り替え
- BackgroundServiceまたは外部ジョブ基盤による通知・クリーンアップ

## 5. 課金

- iOSのデジタル機能はApple App Storeのアプリ内課金を利用する。
- AndroidはGoogle Play Billingを利用する。
- バックエンドで購入情報とサーバー通知を検証し、Premium権限を確定する。
- Stripeによるアプリ内デジタル機能の直接決済は初期モバイル版の前提にしない。
- 無料／有料の判定はAPIが保持するSubscription状態を正とする。

有料会員が利用できる初期機能は、最大60秒・100MBの動画投稿とする。価格、無料体験、返金時の扱いは別途プロダクト／ストア審査方針で決定する。

## 6. メディア構成

### 開発環境

- `IMediaStorage = LocalMediaStorage`
- ワークスペース外の専用データディレクトリまたはDocker Volumeへ保存
- 開発用ファイルも認証なしで公開しない。

### ステージング／本番

- `IMediaStorage = R2MediaStorage`
- Cloudflare R2の非公開バケットを利用
- DBには `storage_key` だけを保存
- 閲覧時はAPI認可後に短期署名URLを発行するか、APIからストリームする。
- CORS、署名URL期限、Content-Type、Content-Dispositionを制限する。
- ストレージライフサイクルだけで業務データを自動削除しない。

将来的に大容量化した場合は、署名付きアップロード、マルチパート、動画トランスコード、サムネイル生成を段階導入する。

## 7. 環境一覧

| 環境 | 用途 | DB | メディア | モバイル配布 |
| --- | --- | --- | --- | --- |
| Local | 開発者の実装・単体確認 | Docker PostgreSQL | LocalMediaStorage | Simulator／Emulator／実機Development Build |
| CI | 自動テスト | 一時PostgreSQLコンテナ | Fakeまたは一時領域 | 静的検査、必要に応じてビルド |
| Development | チーム結合確認 | 管理PostgreSQL | 開発用R2バケット | Internal Distribution |
| Staging | 本番相当・受入試験 | 本番分離DB | ステージングR2 | TestFlight／Google Play Internal Testing |
| Production | 利用者向け | HA・バックアップ有効DB | 本番R2 | App Store／Google Play |

環境間でDB、R2バケット、JWT鍵、課金資格情報、Push資格情報を共有しない。

## 8. ローカル開発環境

### 必須ツール

- Git
- Node.jsのプロジェクト指定LTS版
- npmまたはpnpmのいずれかに統一
- .NET SDKの `global.json` 指定版
- Docker Desktop
- iOS：macOS、Xcode、CocoaPods（iOSネイティブビルド時）
- Android：Android Studio、Android SDK、JDK

WindowsではAndroid開発は可能だが、iOSのローカルネイティブビルドにはmacOSが必要である。Windows中心で開発する場合は、EAS BuildのmacOSビルダーまたはCI用Macを利用する。

### Docker Compose

初期構成：

- PostgreSQL
- 必要になった段階でRedis
- APIはホスト実行とコンテナ実行の両方を許可する。

秘密情報をComposeファイルやGitへ直接記載しない。

## 9. 設定と秘密情報

- Local：`.env.local`、dotnet user-secrets等。Git管理しない。
- CI：GitHub Actions SecretsまたはOIDC。
- Staging／Production：クラウドのSecret Managerを使用する。
- JWT署名鍵、DB接続文字列、R2キー、Apple／Google資格情報を環境ごとに分離する。
- モバイルアプリへ格納する値は公開されても問題ない設定に限定する。
- API秘密鍵をアプリへ埋め込まない。

## 10. CI/CD

### Pull Request

- TypeScript lint、format、typecheck
- モバイル単体・コンポーネントテスト
- .NET format、build、unit／integration test
- PostgreSQLを利用したMigration検証
- OpenAPIの破壊的変更検査
- 依存関係と秘密情報のスキャン

### Main branch

- Development環境へAPIを自動デプロイ
- EASの内部配布用ビルドを必要に応じて生成
- Migrationは専用ジョブとして実行

### Release

- StagingでTestFlight／Google Play Internal Testing
- 承認後に本番APIとストア版を段階リリース
- APIは最低1世代前のモバイル版と互換性を維持する。

## 11. 監視とログ

- 構造化ログにTrace ID、User IDの非可逆識別子、エラーコードを含める。
- 投稿本文、メールアドレス、トークン、署名URLをログへ出さない。
- OpenTelemetryでHTTP、DB、ストレージ、ジョブを追跡する。
- 主要メトリクス：APIエラー率、アップロード失敗率、通知成功率、孤立ファイル数、課金検証遅延。
- クライアント例外は個人情報を除去して監視サービスへ送る。

## 12. セキュリティ・品質基準

- 通信はTLS 1.2以上。
- R2バケットは非公開。
- 依存パッケージをlockし、自動脆弱性検査を行う。
- OWASP ASVSおよびMobile Application Securityの主要項目を参考にする。
- アップロードは拡張子だけでなくMIME、マジックバイト、容量、動画時間を検証する。
- バックアップ復元試験を定期実施する。
- App Store／Google Playのプライバシー申告とアカウント削除要件を満たす。

## 13. バージョン管理方針

- モバイル、API、DB Migrationは同一リポジトリで開始するモノレポを推奨する。
- APIは `/api/v1` のようにバージョンを明示する。
- DB Migrationは適用順をGitで管理する。
- Node、.NET、Dockerイメージは設定ファイルで固定する。
- ライブラリ更新は動作確認とMigration互換性確認を伴うPull Requestで行う。

## 14. 実装順序

1. モノレポ、CI、ローカルPostgreSQLの基盤
2. Identity、Profile、初回記念日設定
3. 写真投稿、10分取消、非公開メディア保存
4. カレンダーと1年後の解禁制御
5. 記念日の2投稿と変更履歴・非表示規則
6. プッシュ通知
7. App Store／Google Play課金検証
8. 有料動画投稿
9. ステージング実機試験とストア申請
10. 共有機能は初期リリース後のTODOとして別途設計

位置情報API、ジオコーディング、地図SDKは初期リリースの技術スタックに含めない。ユーザー要望を確認してから、任意機能として追加を判断する。
