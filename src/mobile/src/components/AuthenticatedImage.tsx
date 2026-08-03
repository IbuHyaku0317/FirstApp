import { useEffect, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import { ActivityIndicator, Image, ImageResizeMode, ImageStyle, StyleProp, StyleSheet, Text, View } from "react-native";
import { resolveMediaUrl } from "../shared/api";
import { Session } from "../shared/session";
import { colors } from "../shared/theme";

/**
 * React NativeのImageはAndroid環境によって認証ヘッダーを転送しないことがあります。
 * そのため、認証付きでキャッシュ領域へダウンロードし、ローカルURIから表示します。
 */
export function AuthenticatedImage({ url, session, style, resizeMode = "cover" }: { url: string; session: Session; style?: StyleProp<ImageStyle>; resizeMode?: ImageResizeMode }) {
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let downloadedUri: string | null = null;
    setSource(null); setFailed(false);
    const extension = url.toLowerCase().endsWith(".png") ? "png" : url.toLowerCase().endsWith(".webp") ? "webp" : "jpg";
    const destination = `${FileSystem.cacheDirectory}memory-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
    void FileSystem.downloadAsync(resolveMediaUrl(url), destination, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }).then(result => {
      downloadedUri = result.uri;
      if (!active || result.status < 200 || result.status >= 300) throw new Error(`Image download failed (${result.status})`);
      setSource(result.uri);
    }).catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (downloadedUri) void FileSystem.deleteAsync(downloadedUri, { idempotent: true });
    };
  }, [url, session.accessToken]);

  if (failed) return <View style={[styles.placeholder, style]}><Text style={styles.error}>Image could not be loaded.</Text></View>;
  if (!source) return <View style={[styles.placeholder, style]}><ActivityIndicator color={colors.primary} /></View>;
  return <Image source={{ uri: source }} style={style} resizeMode={resizeMode} />;
}

const styles = StyleSheet.create({
  placeholder: { alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  error: { color: colors.danger },
});
