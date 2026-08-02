import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Field, Title } from "../components/atoms";
import { api } from "../shared/api";
import { Session } from "../shared/session";
import { colors, spacing } from "../shared/theme";
import { TodayStatus } from "../shared/types";

type Props = {
  session: Session;
  onCreated: () => void;
  onOpenSubscription: () => void;
};

export function CreatePostScreen({ session, onCreated, onOpenSubscription }: Props) {
  const ja = session.user.preferredLanguage === "ja";
  const premium = session.user.membership === "premium";
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadController = useRef<AbortController | null>(null);

  useEffect(() => {
    api.todayStatus(session).then(setStatus).catch(error => setError(error.message));

    // Androidがメディア選択中にActivityを再生成した場合も、選択結果を失わない。
    ImagePicker.getPendingResultAsync()
      .then(result => {
        if (result && "canceled" in result && !result.canceled) acceptAsset(result.assets[0]);
      })
      .catch(() => undefined);
  }, [session]);

  const acceptAsset = (selected: ImagePicker.ImagePickerAsset) => {
    if (selected.fileSize && selected.fileSize > 100 * 1024 * 1024) {
      setError(ja ? "ファイルは100MB以下にしてください。" : "The file must be 100 MB or smaller.");
      return;
    }
    if (selected.type === "video" && selected.duration && selected.duration > 60_000) {
      setError(ja ? "動画は60秒以下にしてください。" : "The video must be 60 seconds or shorter.");
      return;
    }
    setError("");
    setAsset(selected);
  };

  const chooseMedia = async (mediaType: "images" | "videos") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [mediaType],
      quality: 0.9,
      videoMaxDuration: 60,
    });
    if (!result.canceled) acceptAsset(result.assets[0]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError(ja ? "カメラの使用を許可してください。" : "Allow camera access to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (!result.canceled) acceptAsset(result.assets[0]);
  };

  const showPremiumDialog = () => {
    Alert.alert(
      ja ? "動画投稿はPremium限定です" : "Video posting is Premium only",
      ja
        ? "Premiumプランでは、最大60秒・100MBの動画を一年後へ保存できます。プラン画面を確認しますか？"
        : "Premium lets you save videos up to 60 seconds and 100 MB for next year. View the plan?",
      [
        { text: ja ? "あとで" : "Not now", style: "cancel" },
        { text: ja ? "Premiumを見る" : "View Premium", onPress: onOpenSubscription },
      ],
    );
  };

  const submit = () => {
    if (!asset) {
      setError(ja ? "写真または動画を選択してください。" : "Choose a photo or video.");
      return;
    }
    Alert.alert(
      ja ? "一年後まで見られません" : "Hidden for one year",
      ja
        ? "投稿後10分を過ぎると、一年後の解禁日まで内容を確認できません。保存しますか？"
        : "After 10 minutes, you cannot view this until it unlocks one year later.",
      [
        { text: ja ? "戻る" : "Back", style: "cancel" },
        { text: ja ? "保存する" : "Save", onPress: upload },
      ],
    );
  };

  const upload = async () => {
    if (!asset || loading) return;

    setLoading(true);
    setUploadProgress(0);
    setError("");
    uploadController.current = new AbortController();
    try {
      const form = new FormData();
      form.append("caption", caption);
      form.append("media", {
        uri: asset.uri,
        name: asset.fileName ?? `memory.${asset.type === "video" ? "mp4" : "jpg"}`,
        type: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"),
      } as unknown as Blob);
      await api.createPost(session, form, setUploadProgress, uploadController.current.signal);
      Alert.alert(
        ja ? "保存しました" : "Saved",
        ja ? "10分間はプロフィールから取り消せます。" : "You can cancel from your profile for 10 minutes.",
        [{ text: "OK", onPress: onCreated }],
      );
    } catch (error) {
      if (error instanceof Error && error.message === "UPLOAD_CANCELED") {
        setError(ja ? "アップロードを中止しました。入力内容は残っています。" : "Upload canceled. Your input is still here.");
      } else {
        setError(error instanceof Error ? error.message : "Error");
      }
    } finally {
      setLoading(false);
      uploadController.current = null;
    }
  };

  const remaining = status ? Math.max(0, status.limit - status.used) : 0;
  const mediaSelectionDisabled = remaining === 0 || loading;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View>
        <Title>{ja ? "今日を残す" : "Keep today"}</Title>
        <Body muted>
          {status?.isAnniversary
            ? ja
              ? `今日は記念日です。あと${remaining}件投稿できます。`
              : `It's your anniversary. ${remaining} slots left.`
            : ja
              ? `今日はあと${remaining}件投稿できます。`
              : `${remaining} post left today.`}
        </Body>
      </View>

      <Card>
        {asset?.type === "image" && <Image source={{ uri: asset.uri }} style={styles.preview} />}
        {asset?.type === "video" && (
          <View style={styles.video}>
            <Text style={styles.videoText}>▶ {asset.fileName ?? (ja ? "選択した動画" : "Selected video")}</Text>
          </View>
        )}
        {asset && !loading && (
          <Button secondary label={ja ? "選択を解除" : "Remove selection"} onPress={() => setAsset(null)} />
        )}

        <Button
          secondary
          label={ja ? "カメラで写真を撮る" : "Take a photo"}
          onPress={takePhoto}
          disabled={mediaSelectionDisabled}
        />
        <Button
          secondary
          label={ja ? "写真を選ぶ" : "Choose a photo"}
          onPress={() => chooseMedia("images")}
          disabled={mediaSelectionDisabled}
        />

        {premium ? (
          <Button
            secondary
            label={ja ? "動画を選ぶ（Premium）" : "Choose a video (Premium)"}
            onPress={() => chooseMedia("videos")}
            disabled={mediaSelectionDisabled}
          />
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ja ? "動画を選ぶ、Premium限定" : "Choose a video, Premium only"}
              disabled={loading}
              onPress={showPremiumDialog}
              style={({ pressed }) => [styles.lockedVideoButton, pressed && styles.pressed, loading && styles.disabled]}
            >
              <Text style={styles.lockedVideoText}>{ja ? "🔒 動画を選ぶ（Premium限定）" : "🔒 Choose a video (Premium only)"}</Text>
            </Pressable>
            {__DEV__ && (
              <Button
                secondary
                label={ja ? "🧪 開発用：動画を選ぶ" : "🧪 Development: choose a video"}
                onPress={() => chooseMedia("videos")}
                disabled={mediaSelectionDisabled}
              />
            )}
          </>
        )}

        <Field
          editable={!loading}
          placeholder={ja ? "一年後の自分へのメッセージ（任意）" : "A message to your future self (optional)"}
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={2000}
          style={styles.message}
        />
        <Body muted>{caption.length}/2000</Body>

        {loading && (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressValue, { width: `${uploadProgress}%` }]} />
            </View>
            <Body>{ja ? `アップロード中 ${uploadProgress}%` : `Uploading ${uploadProgress}%`}</Body>
            <Button danger label={ja ? "アップロードを中止" : "Cancel upload"} onPress={() => uploadController.current?.abort()} />
          </>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button
          label={ja ? "一年後へ保存" : "Save for next year"}
          onPress={submit}
          loading={loading}
          disabled={!asset || remaining === 0}
        />
      </Card>
      <Body muted>{ja ? "位置情報は取得・保存しません。" : "Location information is not collected or stored."}</Body>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  preview: { width: "100%", aspectRatio: 1, borderRadius: 14 },
  video: { minHeight: 120, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  videoText: { color: colors.primary, fontWeight: "700" },
  lockedVideoButton: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.locked,
    borderRadius: 25,
    backgroundColor: colors.border,
  },
  lockedVideoText: { color: colors.muted, fontSize: 16, fontWeight: "700", textAlign: "center" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
  message: { minHeight: 110, textAlignVertical: "top" },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: "hidden" },
  progressValue: { height: "100%", backgroundColor: colors.primary },
  error: { color: colors.danger },
});
