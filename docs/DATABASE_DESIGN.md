# テーブル定義書

## 1. 文書の目的

本書は、iOS／Android向けアプリのPostgreSQL論理テーブル設計を定義する。
物理名は `snake_case`、主キーはUUID、瞬間を表す日時は `timestamptz`、ユーザーの暦日は `date` を使用する。

## 2. 共通方針

- UUIDはアプリケーションまたはPostgreSQLで生成する。
- 原則として全テーブルに `created_at`、更新されるテーブルに `updated_at` を持つ。
- メールアドレスは正規化列に一意制約を設定する。
- 投稿メディアはDBへ格納せず、ストレージキーだけを保存する。
- 外部公開URLや有効期限付き署名URLは保存しない。
- 投稿と記念日の履歴は業務判定に必要なため物理削除しない。
- 監査・復旧の必要性と個人情報削除要件を両立する保持期間を運用規程で定める。

## 3. ER概要

```text
users
 ├─< refresh_sessions
 ├─< anniversary_settings
 ├─< posts >─ media_objects
 ├─< subscriptions
 ├─< device_installations
 ├─< notification_deliveries
 └─< email_deliveries

anniversary_settings
 └─< posts

```

## 4. テーブル定義

### 4.1 users

| カラム | 型 | NULL | 制約・説明 |
| --- | --- | --- | --- |
| id | uuid | NO | PK |
| email | varchar(320) | NO | 入力された表示用メールアドレス |
| normalized_email | varchar(320) | NO | UNIQUE、検索・認証用 |
| password_hash | text | NO | パスワードハッシュ |
| display_name | varchar(80) | NO | 表示名 |
| preferred_language | varchar(10) | NO | `ja` または `en` |
| time_zone_id | varchar(100) | NO | IANA Time Zone ID |
| status | varchar(20) | NO | `active`, `suspended`, `deletion_pending`, `deleted` |
| email_verified_at | timestamptz | YES | メール確認日時 |
| last_anniversary_changed_at | timestamptz | YES | 14日制限の基準。初回設定も含む |
| created_at | timestamptz | NO | 作成日時 |
| updated_at | timestamptz | NO | 更新日時 |

インデックス：

- `uq_users_normalized_email (normalized_email)` UNIQUE
- `ix_users_status (status)`

### 4.2 anniversary_settings

記念日の変更履歴を保持する。1ユーザーにつき `effective_to IS NULL` の行は最大1件とする。

| カラム | 型 | NULL | 制約・説明 |
| --- | --- | --- | --- |
| id | uuid | NO | PK |
| user_id | uuid | NO | FK → users.id |
| name | varchar(80) | NO | 記念日名 |
| month | smallint | NO | 1〜12 |
| day | smallint | NO | 月に対して有効な日。2月29日を許可 |
| effective_from | timestamptz | NO | 即時反映の開始時刻 |
| effective_to | timestamptz | YES | 変更により無効になった時刻 |
| created_at | timestamptz | NO | 作成日時 |

制約・インデックス：

- `ck_anniversary_month`：1〜12
- `ck_anniversary_day`：有効な月日
- `ix_anniversary_user_history (user_id, effective_from DESC)`
- `uq_anniversary_current_user (user_id) WHERE effective_to IS NULL` UNIQUE

### 4.3 posts

1行が「1ファイル＋メッセージ」の1投稿を表す。記念日の2枚は2行として保存する。

| カラム | 型 | NULL | 制約・説明 |
| --- | --- | --- | --- |
| id | uuid | NO | PK |
| user_id | uuid | NO | FK → users.id |
| anniversary_setting_id | uuid | YES | FK → anniversary_settings.id。通常日はNULL |
| occurred_on | date | NO | 投稿時のユーザー現地日付 |
| unlock_on | date | NO | 閲覧解禁日 |
| daily_sequence | smallint | NO | 1または2 |
| message | varchar(2000) | YES | メッセージ |
| media_object_id | uuid | NO | FK → media_objects.id |
| status | varchar(20) | NO | `active`, `canceled` |
| suppression_reason | varchar(50) | YES | `anniversary_changed_before_unlock` 等 |
| cancelable_until | timestamptz | NO | 作成から10分後 |
| canceled_at | timestamptz | YES | 取消日時 |
| unlocked_at | timestamptz | YES | 最初に解禁処理・通知した日時。閲覧可否自体はunlock_onで判定 |
| created_at | timestamptz | NO | 投稿順の確定にも利用 |
| updated_at | timestamptz | NO | 更新日時 |

制約・インデックス：

- `ck_posts_daily_sequence`：1または2
- `uq_posts_user_day_sequence_active (user_id, occurred_on, daily_sequence) WHERE status = 'active'` UNIQUE
- `ix_posts_calendar (user_id, unlock_on, status)`
- `ix_posts_anniversary_suppression (anniversary_setting_id, daily_sequence, unlock_on)`
- `ix_posts_cancelable (user_id, cancelable_until) WHERE status = 'active'`

補足：PostgreSQLの部分一意制約で取消後の枠再利用を可能にする。投稿作成トランザクションではユーザー日付単位の排他制御も併用する。

### 4.4 media_objects

| カラム | 型 | NULL | 制約・説明 |
| --- | --- | --- | --- |
| id | uuid | NO | PK |
| owner_user_id | uuid | NO | FK → users.id |
| storage_provider | varchar(30) | NO | `local`, `r2` |
| storage_key | varchar(1024) | NO | 保存先内の不透明キー |
| media_type | varchar(20) | NO | `image`, `video` |
| content_type | varchar(100) | NO | 検証済みMIMEタイプ |
| byte_size | bigint | NO | ファイルサイズ |
| duration_seconds | numeric(8,3) | YES | 動画のみ。最大60秒 |
| checksum_sha256 | char(64) | YES | 完全性・重複調査用 |
| status | varchar(30) | NO | `pending`, `available`, `delete_pending`, `deleted`, `orphaned` |
| created_at | timestamptz | NO | 作成日時 |
| deleted_at | timestamptz | YES | 削除完了日時 |

制約・インデックス：

- `uq_media_provider_key (storage_provider, storage_key)` UNIQUE
- `ck_media_byte_size`：0より大きい
- `ck_video_duration`：動画は60秒以下
- `ix_media_cleanup (status, created_at)`

### 4.5 refresh_sessions

| カラム | 型 | NULL | 制約・説明 |
| --- | --- | --- | --- |
| id | uuid | NO | PK |
| user_id | uuid | NO | FK → users.id |
| token_family_id | uuid | NO | ローテーション系列 |
| token_hash | char(64) | NO | UNIQUE、平文保存禁止 |
| parent_session_id | uuid | YES | 直前のセッション |
| expires_at | timestamptz | NO | 有効期限 |
| consumed_at | timestamptz | YES | ローテーション済み日時 |
| revoked_at | timestamptz | YES | 失効日時 |
| created_at | timestamptz | NO | 発行日時 |

インデックス：

- `uq_refresh_token_hash (token_hash)` UNIQUE
- `ix_refresh_family (user_id, token_family_id)`
- `ix_refresh_expiration (expires_at)`

### 4.6 subscriptions

| カラム | 型 | NULL | 制約・説明 |
| --- | --- | --- | --- |
| id | uuid | NO | PK |
| user_id | uuid | NO | FK → users.id |
| plan | varchar(20) | NO | `premium`。有効行がなければFree |
| provider | varchar(30) | YES | `apple_app_store`, `google_play` |
| provider_customer_ref | varchar(255) | YES | プロバイダー側参照値 |
| provider_subscription_ref | varchar(255) | YES | 購読参照値 |
| provider_product_id | varchar(100) | YES | ストア商品ID |
| provider_base_plan_id | varchar(100) | YES | ベースプランID。該当するストアのみ |
| billing_period | varchar(20) | YES | `monthly`, `annual`。ストア検証結果を正とする |
| status | varchar(30) | NO | `pending`, `active`, `canceled`, `grace_period`, `account_hold`, `paused`, `expired`, `revoked` |
| auto_renewing | boolean | NO | 自動更新予定の有無。解約予約後も期間終了までは権限を維持 |
| current_period_start | timestamptz | YES | 現在支払期間開始 |
| current_period_end | timestamptz | YES | 現在期間終了 |
| last_verified_at | timestamptz | YES | ストア照合日時 |
| created_at | timestamptz | NO | 作成日時 |
| updated_at | timestamptz | NO | 更新日時 |

インデックス：

- `uq_subscription_provider_ref (provider, provider_subscription_ref)` UNIQUE（NULLを除く）
- `ix_subscriptions_user_status (user_id, status, current_period_end)`
- `ix_subscription_verification (status, last_verified_at)`

同一ユーザーに複数の購入履歴が存在し得る。現在の権限は、ストア検証済み状態と有効期間からApplication層で決定し、クライアント値や単純な行の存在だけでは判定しない。

- `active`、`grace_period`、または `current_period_end` 前の `canceled` はPremium権限ありとする。
- `pending`、`account_hold`、`paused`、`expired`、`revoked` はPremium権限なしとする。
- `revoked` は `current_period_end` より優先して即時失効させる。
- 購読失効時に `posts` や `media_objects` を削除・非表示化しない。既存投稿の解禁と閲覧可否は投稿側の状態だけで判定する。

### 4.7 device_installations

| カラム | 型 | NULL | 制約・説明 |
| --- | --- | --- | --- |
| id | uuid | NO | PK |
| user_id | uuid | NO | FK → users.id |
| platform | varchar(20) | NO | `ios`, `android` |
| push_token | text | NO | 暗号化または秘密情報として管理 |
| locale | varchar(10) | NO | 通知言語 |
| time_zone_id | varchar(100) | NO | 通知計画用 |
| notifications_enabled | boolean | NO | ユーザー設定 |
| last_seen_at | timestamptz | NO | 最終利用日時 |
| revoked_at | timestamptz | YES | 無効化日時 |
| created_at | timestamptz | NO | 登録日時 |
| updated_at | timestamptz | NO | 更新日時 |

インデックス：

- `uq_device_push_token (push_token)` UNIQUE
- `ix_devices_user_active (user_id, revoked_at)`

### 4.8 notification_deliveries

| カラム | 型 | NULL | 制約・説明 |
| --- | --- | --- | --- |
| id | uuid | NO | PK |
| user_id | uuid | NO | FK → users.id |
| device_installation_id | uuid | NO | FK → device_installations.id |
| post_id | uuid | YES | FK → posts.id。解禁通知の場合 |
| notification_type | varchar(30) | NO | `post_unlocked`, `posting_reminder` |
| scheduled_at | timestamptz | NO | 配信予定 |
| delivered_at | timestamptz | YES | 成功日時 |
| status | varchar(20) | NO | `pending`, `sent`, `failed`, `canceled` |
| attempt_count | integer | NO | 再試行回数 |
| provider_message_id | varchar(255) | YES | 配信事業者の参照値 |
| created_at | timestamptz | NO | 作成日時 |

制約・インデックス：

- 解禁通知は `(device_installation_id, post_id, notification_type)` を一意とする。
- `ix_notification_pending (status, scheduled_at)`

### 4.9 email_deliveries

認証メールと再設定メールの送信履歴を保持する。宛先メールアドレスの平文を監査ログへ残さず、送信時に認証済みの現在値を取得する。

| カラム | 型 | NULL | 制約・説明 |
| --- | --- | --- | --- |
| id | uuid | NO | PK |
| user_id | uuid | NO | FK → users.id |
| email_type | varchar(40) | NO | `verify_email`, `password_reset` |
| status | varchar(20) | NO | `pending`, `sent`, `failed`, `canceled` |
| scheduled_at | timestamptz | NO | 送信予定 |
| delivered_at | timestamptz | YES | 配信事業者受付日時 |
| attempt_count | integer | NO | 再試行回数 |
| provider_message_id | varchar(255) | YES | 配信事業者の参照値 |
| created_at | timestamptz | NO | 作成日時 |

制約・インデックス：

- `ix_email_delivery_pending (status, scheduled_at)`
- 同一トークン・同一用途の重複送信を防ぐ冪等キーをApplication層で管理する。

### 4.10 media_cleanup_jobs

ストレージ保存後のDB失敗や削除失敗を回収する。

| カラム | 型 | NULL | 制約・説明 |
| --- | --- | --- | --- |
| id | uuid | NO | PK |
| media_object_id | uuid | YES | FK → media_objects.id |
| storage_provider | varchar(30) | NO | 保存先 |
| storage_key | varchar(1024) | NO | 削除対象キー |
| reason | varchar(50) | NO | `db_failure`, `post_canceled`, `account_deleted` 等 |
| status | varchar(20) | NO | `pending`, `completed`, `failed` |
| attempt_count | integer | NO | 試行回数 |
| next_attempt_at | timestamptz | NO | 次回実行時刻 |
| last_error_code | varchar(100) | YES | 秘密情報を含めないエラー識別子 |
| created_at | timestamptz | NO | 作成日時 |
| completed_at | timestamptz | YES | 完了日時 |

インデックス：

- `ix_media_cleanup_pending (status, next_attempt_at)`

## 5. 記念日変更時のデータ更新

例：2026年7月8日に7月1日から7月12日へ変更する場合。

1. 7月1日の `anniversary_settings.effective_to` を変更時刻に設定する。
2. 7月12日の新しい履歴行を作成する。
3. 旧設定IDに紐づく `daily_sequence = 2` を対象にする。
4. 変更日の時点で `unlock_on` が未来なら、`suppression_reason` を設定する。
5. `unlock_on` が当日以前なら、すでに表示可能なため変更しない。

したがって、2026年7月1日の未解禁2件目は2027年に表示されず、1件目だけが表示される。2025年7月1日以前に投稿され、すでに解禁済みの2件は維持される。

## 6. データ取得ルール

### カレンダー表示

```sql
user_id = :authenticated_user_id
AND status = 'active'
AND suppression_reason IS NULL
AND unlock_on <= :user_local_date
```

必ず認証ユーザーIDで絞り込み、PostIdだけで取得しない。

### 今日の投稿数

```sql
user_id = :authenticated_user_id
AND occurred_on = :user_local_date
AND status = 'active'
```

上限は有効な記念日なら2、それ以外は1とする。

## 7. マイグレーション方針

- EF Core Migrationを使用する。
- 本番適用前にステージングで前進・ロールバック手順を確認する。
- 大規模テーブルの制約追加は、バックフィル、検証、制約有効化を分割する。
- アプリの旧バージョンが一定期間動くことを考慮し、破壊的変更はExpand／Migrate／Contractの順で行う。
- 本番DBの自動起動時マイグレーションは行わず、デプロイ工程として明示的に実行する。

## 8. バックアップと保持

- PostgreSQLは日次バックアップとポイントインタイムリカバリを有効にする。
- R2オブジェクトとDBレコードの整合性監査を定期実行する。
- 非表示になった記念日の2件目は、ユーザー仕様上は表示しないが即時物理削除しない。
- アカウント削除、法令、ストア要件に基づく最終削除期限は運用設計で別途確定する。
