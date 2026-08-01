import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Field, Title } from "../components/atoms";
import { api } from "../shared/api";
import { Session } from "../shared/session";
import { TodayStatus } from "../shared/types";
import { colors, spacing } from "../shared/theme";

export function CreatePostScreen({ session, onCreated }: { session: Session; onCreated: () => void }) {
  const ja = session.user.preferredLanguage === "ja"; const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null); const [caption, setCaption] = useState(""); const [status, setStatus] = useState<TodayStatus | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => {
    api.todayStatus(session).then(setStatus).catch(e => setError(e.message));
    // Androidがメディア選択中にActivityを再生成した場合も、選択結果を失わない。
    ImagePicker.getPendingResultAsync().then(result => {
      if (result && "canceled" in result && !result.canceled) acceptAsset(result.assets[0]);
    }).catch(() => undefined);
  }, [session]);
  const acceptAsset = (selected: ImagePicker.ImagePickerAsset) => {
    if (selected.fileSize && selected.fileSize > 100 * 1024 * 1024) return setError(ja ? "ファイルは100MB以下にしてください。" : "The file must be 100 MB or smaller.");
    if (selected.type === "video" && selected.duration && selected.duration > 60_000) return setError(ja ? "動画は60秒以下にしてください。" : "The video must be 60 seconds or shorter.");
    setError(""); setAsset(selected);
  };
  const choose = async () => { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: session.user.membership === "premium" ? ["images", "videos"] : ["images"], quality: 0.9, videoMaxDuration: 60 }); if (!result.canceled) acceptAsset(result.assets[0]); };
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setError(ja ? "カメラの使用を許可してください。" : "Allow camera access to take a photo.");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (!result.canceled) acceptAsset(result.assets[0]);
  };
  const submit = () => { if (!asset) return setError(ja ? "写真を選択してください。" : "Choose a photo."); Alert.alert(ja ? "一年後まで見られません" : "Hidden for one year", ja ? "投稿後10分を過ぎると、一年後の解禁日まで内容を確認できません。保存しますか？" : "After 10 minutes, you cannot view this until it unlocks one year later.", [{ text: ja ? "戻る" : "Back", style: "cancel" }, { text: ja ? "保存する" : "Save", onPress: upload }]); };
  const upload = async () => { if (!asset) return; setLoading(true); setError(""); try { const form = new FormData(); form.append("caption", caption); form.append("media", { uri: asset.uri, name: asset.fileName ?? `memory.${asset.type === "video" ? "mp4" : "jpg"}`, type: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg") } as unknown as Blob); await api.createPost(session, form); Alert.alert(ja ? "保存しました" : "Saved", ja ? "10分間はプロフィールから取り消せます。" : "You can cancel from your profile for 10 minutes.", [{ text: "OK", onPress: onCreated }]); } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); } };
  const remaining = status ? Math.max(0, status.limit - status.used) : 0;
  return <ScrollView contentContainerStyle={styles.container}><View><Title>{ja ? "今日を残す" : "Keep today"}</Title><Body muted>{status?.isAnniversary ? (ja ? `今日は記念日です。あと${remaining}件投稿できます。` : `It's your anniversary. ${remaining} slots left.`) : (ja ? `今日はあと${remaining}件投稿できます。` : `${remaining} post left today.`)}</Body></View><Card>{asset?.type === "image" && <Image source={{ uri: asset.uri }} style={styles.preview} />}{asset?.type === "video" && <View style={styles.video}><Text style={styles.videoText}>▶ {asset.fileName ?? (ja ? "選択した動画" : "Selected video")}</Text></View>}<Button secondary label={ja ? "カメラで写真を撮る" : "Take a photo"} onPress={takePhoto} disabled={remaining === 0} /><Button secondary label={session.user.membership === "premium" ? (ja ? "写真・動画を選ぶ" : "Choose photo or video") : (ja ? "写真を選ぶ" : "Choose a photo")} onPress={choose} disabled={remaining === 0} /><Field placeholder={ja ? "一年後の自分へのメッセージ（任意）" : "A message to your future self (optional)"} value={caption} onChangeText={setCaption} multiline maxLength={2000} style={styles.message} /><Body muted>{caption.length}/2000</Body>{!!error && <Text style={styles.error}>{error}</Text>}<Button label={ja ? "一年後へ保存" : "Save for next year"} onPress={submit} loading={loading} disabled={!asset || remaining === 0} /></Card><Body muted>{ja ? "位置情報は取得・保存しません。" : "Location information is not collected or stored."}</Body></ScrollView>;
}
const styles = StyleSheet.create({ container: { padding: spacing.lg, gap: spacing.lg }, preview: { width: "100%", aspectRatio: 1, borderRadius: 14 }, video: { minHeight: 120, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }, videoText: { color: colors.primary, fontWeight: "700" }, message: { minHeight: 110, textAlignVertical: "top" }, error: { color: colors.danger } });
