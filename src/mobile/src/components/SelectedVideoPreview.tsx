import { VideoView, useVideoPlayer } from "expo-video";
import { StyleSheet } from "react-native";

type Props = {
  uri: string;
  accessibilityLabel: string;
};

/**
 * 端末内で選択した動画を、アップロード前に確認するためのプレビュー。
 * 認証が必要な投稿済み動画とは異なり、ImagePickerが返したローカルURIを直接再生する。
 */
export function SelectedVideoPreview({ uri, accessibilityLabel }: Props) {
  const player = useVideoPlayer(uri);

  return (
    <VideoView
      player={player}
      style={styles.video}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 14,
  },
});
