import { VideoView, useVideoPlayer } from "expo-video";
import { StyleSheet } from "react-native";
import { resolveMediaUrl } from "../shared/api";
import { Session } from "../shared/session";

export function VideoMemory({ url, session }: { url: string; session: Session }) {
  const player = useVideoPlayer({
    uri: resolveMediaUrl(url),
    headers: { Authorization: `Bearer ${session.accessToken}` },
    useCaching: false,
  });
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} />;
}

const styles = StyleSheet.create({ video: { width: "100%", aspectRatio: 16 / 9, borderRadius: 14 } });
