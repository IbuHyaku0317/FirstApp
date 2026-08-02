import { useEvent } from "expo";
import { VideoView, useVideoPlayer } from "expo-video";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { resolveMediaUrl } from "../shared/api";
import { Session } from "../shared/session";
import { colors } from "../shared/theme";

type Props = {
  url: string;
  session: Session;
  accessibilityLabel: string;
  errorText: string;
};

/**
 * カレンダーの日別一覧で、動画の先頭フレームだけを静止表示する。
 * 再生操作は詳細画面に限定し、このコンポーネントは親カードのタップを妨げない。
 */
export function VideoThumbnail({ url, session, accessibilityLabel, errorText }: Props) {
  const player = useVideoPlayer(
    {
      uri: resolveMediaUrl(url),
      headers: { Authorization: `Bearer ${session.accessToken}` },
      useCaching: false,
    },
    currentPlayer => {
      currentPlayer.muted = true;
      currentPlayer.pause();
    },
  );
  const { status } = useEvent(player, "statusChange", { status: player.status });

  return (
    <View style={styles.container} accessibilityLabel={accessibilityLabel} pointerEvents="none">
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="contain"
        surfaceType="textureView"
        pointerEvents="none"
      />
      {status === "loading" && (
        <View style={styles.status} pointerEvents="none">
          <ActivityIndicator color={colors.surface} />
        </View>
      )}
      {status === "error" && (
        <View style={styles.status} pointerEvents="none">
          <Text style={styles.error}>{errorText}</Text>
        </View>
      )}
      <View style={styles.playBadge} pointerEvents="none">
        <Text style={styles.playIcon}>▶</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 1,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: colors.text,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  status: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(46, 41, 37, 0.55)",
    padding: 16,
  },
  error: {
    color: colors.surface,
    fontWeight: "700",
    textAlign: "center",
  },
  playBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(46, 41, 37, 0.72)",
  },
  playIcon: {
    marginLeft: 3,
    color: colors.surface,
    fontSize: 20,
  },
});
