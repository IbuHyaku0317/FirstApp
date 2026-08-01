# FEソース構成

このディレクトリではAtomic DesignをUIコンポーネントの分類に使用しています。

- `components/atoms`: ボタンやローディング表示など、最小のUI要素
- `components/molecules`: 入力項目や空状態など、小さな意味を持つ組み合わせ
- `components/organisms`: ヘッダー、認証フォーム、投稿カードなど、機能を持つUIブロック
- `components/templates`: データを知らないページ共通レイアウト
- `pages`: API取得や画面固有状態を持つルート単位の画面
- `providers`: セッションなど、アプリ全体で共有する状態
- `shared`: APIクライアント、共有型、汎用処理
- `app`: Providerとルーティングを組み立てるComposition Root

## 多言語対応

- 翻訳辞書: `shared/i18n/messages.ts`
- 言語状態: `providers/LanguageProvider.tsx`
- 切替UI: `components/molecules/LanguageSwitch.tsx`

現在は日本語（`ja`）と英語（`en`）に対応しています。選択言語は機密情報ではないため、`localStorage` の `memory.language` に保存します。画面文言を追加するときはJSXへ直接書かず、翻訳辞書へ日英両方を追加してください。

依存方向は原則として `pages → organisms → molecules → atoms` です。下位のUI層からページを参照しないようにします。
