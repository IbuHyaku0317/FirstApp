import { useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import { Alert } from "react-native";
import { resolveMediaUrl } from "../shared/api";
import {
  isMediaSaveAvailable,
  requestMediaSavePermission,
  saveMediaToLibrary,
} from "../shared/mediaLibrary";
import { Session } from "../shared/session";
import { Media } from "../shared/types";
import { Button } from "./atoms";

type Props = {
  ja: boolean;
  media: Media;
  postId: string;
  session: Session;
};

/** 認証が必要な思い出を取得し、端末の写真ライブラリへ保存するボタン。 */
export function MediaSaveButton({ ja, media, postId, session }: Props) {
  const [saving, setSaving] = useState(false);

  const saveMedia = async () => {
    if (saving) return;

    setSaving(true);
    let temporaryUri: string | null = null;

    try {
      if (!isMediaSaveAvailable()) {
        showUnavailableAlert(ja);
        return;
      }

      // 保存だけに必要な権限を要求し、端末内の写真や動画は読み取らない。
      const permission = await requestMediaSavePermission();
      if (!permission.granted) {
        showPermissionAlert(ja, permission.canAskAgain);
        return;
      }

      const destination = `${FileSystem.cacheDirectory}memory-download-${postId}-${Date.now()}.${mediaExtension(media)}`;
      const result = await FileSystem.downloadAsync(resolveMediaUrl(media.url), destination, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      temporaryUri = result.uri;

      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Media download failed (${result.status})`);
      }

      await saveMediaToLibrary(result.uri);
      Alert.alert(
        ja ? "保存しました" : "Saved",
        ja
          ? `${media.kind === "video" ? "動画" : "写真"}を端末へ保存しました。`
          : `The ${media.kind === "video" ? "video" : "photo"} was saved to your device.`,
      );
    } catch {
      Alert.alert(
        ja ? "保存できませんでした" : "Could not save",
        ja
          ? "通信状態と端末の空き容量を確認して、もう一度お試しください。"
          : "Check your connection and available storage, then try again.",
      );
    } finally {
      if (temporaryUri) {
        await FileSystem.deleteAsync(temporaryUri, { idempotent: true }).catch(() => undefined);
      }
      setSaving(false);
    }
  };

  return (
    <Button
      label={ja ? "端末へ保存" : "Save to device"}
      loading={saving}
      onPress={() => void saveMedia()}
      secondary
    />
  );
}

/** MediaLibraryがファイル種別を判定できるよう、Content-Typeに合う拡張子を付ける。 */
function mediaExtension(media: Media) {
  const extensions: Record<string, string> = {
    "image/heic": "heic",
    "image/heif": "heif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };

  return extensions[media.contentType.toLowerCase()] ?? (media.kind === "video" ? "mp4" : "jpg");
}

function showUnavailableAlert(ja: boolean) {
  Alert.alert(
    ja ? "保存できません" : "Cannot save",
    ja
      ? "この端末では写真・動画の保存機能を利用できません。"
      : "Saving photos and videos is not available on this device.",
  );
}

function showPermissionAlert(ja: boolean, canAskAgain: boolean) {
  let message: string;
  if (ja) {
    message = canAskAgain
      ? "写真または動画を端末へ保存するには、保存を許可してください。"
      : "端末の設定から、写真と動画への保存を許可してください。";
  } else {
    message = canAskAgain
      ? "Allow access to save this photo or video to your device."
      : "Allow photo and video saving from your device settings.";
  }

  Alert.alert(
    ja ? "保存の許可が必要です" : "Permission required",
    message,
  );
}
