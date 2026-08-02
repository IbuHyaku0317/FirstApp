# Androidモバイルアプリ

Expo／React Nativeで構築したiOS・Android共通基盤のAndroid先行実装です。

## 起動準備

```powershell
cd src/mobile
npm install
npm run start
```

- 開発中のAPI接続先はMetroの配信元から自動判定します。Android Emulatorでは `10.0.2.2`、同じWi-Fi上の実機ではPCのLAN IPが使われます。
- 別のAPIへ接続する場合だけ、起動前に `$env:EXPO_PUBLIC_API_URL="http://<APIホスト>:5080/api/v1"` を設定します。
- APIは外部端末から到達できるホストアドレスで起動してください。
- 初期版は位置情報を要求しません。

## 検証

```powershell
npm run typecheck
npm run export:android
```
