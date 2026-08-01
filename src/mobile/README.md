# Androidモバイルアプリ

Expo／React Nativeで構築したiOS・Android共通基盤のAndroid先行実装です。

## 起動準備

```powershell
cd src/mobile
npm install
$env:EXPO_PUBLIC_API_URL="http://<PCのLAN IP>:5080/api/v1"
npm run start
```

- Android EmulatorからホストAPIへ接続する場合、既定値 `http://10.0.2.2:5080/api/v1` を使用します。
- Android実機ではPCと同じWi-Fiへ接続し、`EXPO_PUBLIC_API_URL` にPCのLAN IPを設定します。
- APIは外部端末から到達できるホストアドレスで起動してください。
- 初期版は位置情報を要求しません。

## 検証

```powershell
npm run typecheck
npm run export:android
```
