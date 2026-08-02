import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

type PermissionResponse = {
  canAskAgain: boolean;
  granted: boolean;
};

type LegacyMediaLibraryModule = {
  requestPermissionsAsync: (
    writeOnly: boolean,
    granularPermissions?: string[],
  ) => Promise<PermissionResponse>;
  saveToLibraryAsync: (localUri: string) => Promise<void>;
};

// Expo Goと製品ビルドの両方に含まれる互換モジュールを使用する。
// optionalで取得することで、未対応環境でもアプリ全体をクラッシュさせない。
const nativeMediaLibrary = requireOptionalNativeModule<LegacyMediaLibraryModule>("ExpoMediaLibrary");

export function isMediaSaveAvailable() {
  return nativeMediaLibrary !== null;
}

/** 端末内の既存メディアを読み取らず、保存だけに必要な権限を要求する。 */
export async function requestMediaSavePermission() {
  if (!nativeMediaLibrary) {
    throw new Error("Media library is unavailable.");
  }

  return Platform.OS === "android"
    ? nativeMediaLibrary.requestPermissionsAsync(true, [])
    : nativeMediaLibrary.requestPermissionsAsync(true);
}

export async function saveMediaToLibrary(localUri: string) {
  if (!nativeMediaLibrary) {
    throw new Error("Media library is unavailable.");
  }

  await nativeMediaLibrary.saveToLibraryAsync(localUri);
}
