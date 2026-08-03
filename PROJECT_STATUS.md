# 開発休止時点の状態と再開手順

最終更新日：2026-08-03  
対象アプリ：一年後の自分へ（To Myself in 1 Year）  
AndroidパッケージID：`com.ibuhyaku.tomyselfin1year`

## 1. この文書の目的

本書は、開発を一時休止した時点の実装状況と、再開時に最初に行う作業を記録するための引き継ぎ資料である。

再開時は、古い作業ブランチではなく、次の順序で参照する。

1. `master` に休止用PRがマージ済みか確認する。
2. 未マージの場合は `codex/pause-checkpoint-2026-08-03` を最新の基準とする。
3. 本書と `docs/GOOGLE_PLAY_RELEASE_CHECKLIST.md` を読む。
4. Google Play Billingの実装から再開する。

## 2. Gitの休止チェックポイント

- 休止用統合ブランチ：`codex/pause-checkpoint-2026-08-03`
- 統合元の最新Androidブランチ：`codex/android-release-identity`
- 統合元の最新仕様書ブランチ：`codex/docs-premium-survey-policy`
- 休止用ブランチには、Android実装、実機修正、正式なアプリ識別情報、Premium方針の設計書を統合済み。
- 休止用ブランチをリモートへPushした後、ユーザーがPRを作成して `master` へマージする。

再開時の確認コマンド：

```powershell
git status
git branch -vv
git log -5 --oneline --decorate
```

作業を再開するときは、マージ後の `master` を更新して新しい作業ブランチを作る。

```powershell
git switch master
git pull --ff-only
git switch -c codex/android-google-play-billing
```

## 3. 確定済みの製品方針

- 初回リリースはAndroidを優先し、その後同じReact Native基盤からiOS版を整備する。
- 初回公開地域は日本、対応言語は日本語と英語、対象年齢は13歳以上。
- 広告、位置情報、他ユーザーとの共有は初回版に含めない。
- 最初に表示する主要画面はカレンダーで、下部ナビゲーションはカレンダー、投稿、プロフィールとする。
- 通常日は写真または動画のどちらか1件だけ投稿できる。
- 記念日は2件投稿でき、記念日は14日に1回だけ変更できる。当日の変更はできない。
- 投稿は10分以内だけ取り消せる。
- 投稿内容は原則として1年後に解禁する。
- Premiumは月額300円または年額3,000円で、どちらも動画投稿を提供する。
- 無料トライアルは設けない。
- Premium失効後も、契約中に投稿した写真・動画は削除せず、予定どおり1年後に閲覧できる。
- メモリー動画の販売、申込み、決済、作成は初回版に含めない。将来の需要調査用アンケートのみ検討する。

詳細は以下を参照する。

- `docs/MOBILE_FRONTEND_DESIGN.md`
- `docs/BACKEND_DESIGN.md`
- `docs/DATABASE_DESIGN.md`
- `docs/TECH_STACK.md`

## 4. 実装済み

### 4.1 Androidモバイルアプリ

- Expo／React Nativeのアプリ基盤
- 新規登録、ログイン、ログアウト、JWT更新
- サインアップ後の記念日設定
- カレンダー、投稿、プロフィール画面
- 写真投稿と動画投稿
- 写真・動画の投稿前プレビュー
- 1日1件、記念日2件の投稿制御
- 10分間の投稿取り消しと残り時間表示
- 開発用時計の日、月、年単位の移動
- 1年後のカレンダー表示
- カレンダーの写真・動画サムネイル
- 投稿詳細画面での写真表示、動画再生、メッセージ、投稿時刻表示
- 詳細画面から元の年月日を選択したカレンダーへ戻る処理
- 写真・動画の端末ギャラリー保存
- 日本語・英語切り替えと全画面の切り替え導線
- 無料会員向けの鍵付き動画導線とPremium案内
- Development環境だけで使用できる無料動画投稿導線
- Android Emulatorと同一Wi-Fi上の実機に応じた開発API接続先の自動判定
- 正式なアプリ名、アイコン設定、パッケージID、URL scheme、バージョン番号

### 4.2 バックエンド

- ASP.NET CoreとDDD／Onion Architectureの基本構成
- PostgreSQLとEF Coreマイグレーション
- JWTアクセストークンとローテーション式リフレッシュトークン
- ユーザー単位のデータ分離
- 記念日変更と投稿上限のドメインルール
- 写真・動画アップロード、認可付きメディア取得
- `IMediaStorage` による保存先の抽象化
- ローカルメディア保存
- RFC 9457 Problem Detailsを使用するエラー応答
- Development環境だけで有効になる開発用時計と動画投稿機能

### 4.3 実機で確認済みの主な項目

- 登録、ログイン
- 写真投稿と1年後の表示
- 動画投稿、サムネイル、詳細画面での再生
- 写真・動画の端末ギャラリー保存
- カレンダーから詳細画面への遷移と戻る操作
- 開発用時計の相対移動
- Android実機からPC上のAPIへの接続

詳細なテスト項目と未確認項目は `docs/ANDROID_DEVICE_TEST_PLAN.md` を参照する。

## 5. 未実装・公開前の必須作業

### 5.1 最初に再開する作業：Google Play Billing

Premiumを初回公開へ含めるため、次を実装する。

1. Play Consoleでサブスクリプション商品を作る。
2. 商品ID候補を `premium_video`、Base Plan ID候補を `monthly` と `annual` として最終確認する。
3. 月額300円、年額3,000円、無料トライアルなし、日本向けとして設定する。
4. アプリでPlayから商品と価格を取得して表示する。
5. 購入、購入復元、サブスクリプション管理画面への導線を実装する。
6. 購入トークンをバックエンドへ送信する。
7. バックエンドからGoogle Play Developer APIで購入を検証する。
8. 検証成功後だけPremium権限を付与する。
9. 更新、解約、猶予、保留、停止、期限切れ、返金を同期する。
10. Real-time developer notificationsを冪等に処理する。
11. ライセンステスターで購入状態を確認する。

現時点のPremium画面は説明用であり、実際の購入処理には未接続である。

### 5.2 本番環境

- Production用PostgreSQL
- Production用HTTPS API
- Cloudflare R2の非公開バケット
- `IMediaStorage` のR2実装
- DB、JWT、R2キーのSecret Manager管理
- DBバックアップと復元確認
- 孤立ファイル回収、削除再試行、基本監視
- Production用API URLを使用したAndroidビルド

### 5.3 アカウントとメール

- メールアドレス確認
- パスワード再設定
- 日本語・英語のメールテンプレート
- アカウント削除時の個人データ、投稿、メディア、トークンの実削除
- アプリ外から使用できるアカウント削除申請Webページ

現時点のアカウント削除は完全な物理削除ではないため、本番公開条件を満たしていない。

### 5.4 法務とGoogle Play公開

- 正式な利用規約とプライバシーポリシー
- 日本語版と英語版の公開HTTPS URL
- Data safety、App access、対象年齢、コンテンツレーティング等の申告
- 審査専用アカウントと1年後機能の審査手順
- Android 16／API 36以上を対象にした署名済みAAB
- Productionビルドから開発用時計と無料動画投稿が除外されていることの確認
- 内部テスト
- 12人が14日間連続で参加するクローズドテスト
- 本番アクセス申請とGoogle Play審査

全チェックリストは `docs/GOOGLE_PLAY_RELEASE_CHECKLIST.md` を使用する。

### 5.5 その他

- 一年後の解禁通知は未実装。
- モバイルのコンポーネントテスト、E2Eテストは不足している。
- UIの細部調整は主要機能と公開条件の完了後に行う方針。
- GoogleフォームのアンケートURLと設問は未確定で、初回リリースの必須機能ではない。

## 6. ローカル開発環境の起動方法

前提：Docker Desktop、.NET 10 SDK、Node.js、Android Studio／Android EmulatorまたはAndroid実機。

### 6.0 休止直前の自動検証結果

2026-08-03に次を確認した。

- `dotnet build Memory.slnx`：成功。エラー0件。統合テスト内のCancellationTokenに関する警告17件あり。
- `Memory.UnitTests`：6件すべて合格。
- `npm run typecheck`：成功。
- `npm run export:android`：成功。Android向けHermes bundleを生成できた。
- `Memory.IntegrationTests`：Docker Desktopが停止していたため未実行。再開時にDockerを起動して実行する。

### 6.1 PostgreSQL

リポジトリのルートで実行する。

```powershell
docker compose up -d
docker compose ps
```

PostgreSQLはホストの `55432` 番ポートを使用する。

データを保持したまま停止する場合：

```powershell
docker compose down
```

`docker compose down -v` はDBボリュームを削除するため、テストデータを残したい場合は使用しない。

### 6.2 DBマイグレーション

必要な場合は次を実行する。

```powershell
dotnet ef database update --project src/api/Memory.Infrastructure --startup-project src/api/Memory.Api
```

`dotnet ef` がない場合：

```powershell
dotnet tool install --global dotnet-ef
```

### 6.3 API

Android実機から接続する場合は、localhostだけでなくLANから到達できるように起動する。

```powershell
$env:ASPNETCORE_URLS="http://0.0.0.0:5080"
dotnet run --project src/api/Memory.Api
```

ヘルスチェック：`http://localhost:5080/api/v1/health`

### 6.4 Androidモバイルアプリ

別のPowerShellで実行する。

```powershell
cd src/mobile
npm install
npm run start
```

- Android Emulatorは通常 `10.0.2.2:5080` へ接続する。
- 同一Wi-Fi上の実機ではMetroの配信元からPCのLAN IPを自動判定する。
- 明示的に指定する場合は、Metro起動前に次を設定する。

```powershell
$env:EXPO_PUBLIC_API_URL="http://<PCのLAN IP>:5080/api/v1"
npm run start
```

実機とPCは同じネットワークへ接続し、Windows Firewallで必要なポートだけを許可する。

## 7. 開発用設定と秘密情報

開発用の設定名は以下のとおり。

- `ConnectionStrings__Database`
- `Jwt__SigningKey`
- `Media__Provider`
- `EXPO_PUBLIC_API_URL`
- `ASPNETCORE_URLS`

例は `.env.example` を参照する。`.env`、本番DBパスワード、JWT署名鍵、R2アクセスキー、Google Playサービスアカウント鍵はGitへコミットしない。

現在の `appsettings.json` はローカル開発用であり、本番へそのまま使用しない。

## 8. 検証コマンド

### 8.1 バックエンド

```powershell
dotnet test
```

統合テストはDockerを使用するため、Docker Desktopを先に起動する。

### 8.2 モバイル

```powershell
cd src/mobile
npm ci
npm run typecheck
npm run export:android
```

### 8.3 再開時の初回確認

1. Gitがクリーンであることを確認する。
2. PostgreSQLを起動する。
3. マイグレーションを適用する。
4. APIのヘルスチェックが200になることを確認する。
5. Expoを起動する。
6. テスト専用アカウントでログインする。
7. 写真投稿、開発用動画投稿、1年後の表示、端末保存を確認する。
8. `docs/GOOGLE_PLAY_RELEASE_CHECKLIST.md` のGoogle Play Billing章から作業を再開する。

## 9. 再開時にユーザーが確認する情報

- Play Consoleのデベロッパー登録と本人確認が完了しているか。
- Android実機によるアカウント確認が完了しているか。
- 支払いプロファイル、受取口座、税務情報の状態。
- デベロッパー名とサポート用メールアドレス。
- Play Consoleでアプリを作成済みか。
- 12人・14日間のクローズドテスト要件がダッシュボードに表示されているか。
- 月額・年額Premiumの商品IDをまだ作成していないこと。
- Cloudflare R2、Production DB、APIホスティング、メール配信サービスの契約状況。

## 10. 休止中の注意

- 作業ブランチとDockerボリュームを削除しない。
- Play Console、Cloudflare、ホスティング等の認証情報をGitへ保存しない。
- 長期間休止した場合は、再開時にExpo SDK、React Native、.NET、PostgreSQL、Google Play Billing、target API要件の更新を確認する。
- API 36以降の要件やGoogle Playポリシーは変更される可能性があるため、公開直前に公式情報を再確認する。
- 実データを保存し始める前に、バックアップと削除手順を完成させる。
