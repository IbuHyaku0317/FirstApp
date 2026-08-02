import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Body, Button, Card, Field, Title } from "../components/atoms";
import { api } from "../shared/api";
import { Session } from "../shared/session";
import { colors, spacing } from "../shared/theme";

export function EditProfileScreen({ session, onSaved, onBack }: { session: Session; onSaved: (session: Session) => void; onBack: () => void }) {
  const [displayName, setDisplayName] = useState(session.user.displayName);
  const [timezone, setTimezone] = useState(session.user.timezone);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const language = session.user.preferredLanguage;
  const ja = language === "ja";
  const save = async () => {
    if (!displayName.trim()) return setError(ja ? "表示名を入力してください。" : "Enter a display name.");
    setLoading(true); setError("");
    try { const user = await api.updateProfile(session, { displayName: displayName.trim(), preferredLanguage: language, timezone: timezone.trim() }); onSaved({ ...session, user }); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  };
  return <ScrollView contentContainerStyle={styles.container}><Pressable onPress={onBack}><Text style={styles.back}>‹ {ja ? "プロフィール" : "Profile"}</Text></Pressable><Title>{ja ? "プロフィール編集" : "Edit profile"}</Title><Card><Body muted>{ja ? "表示名" : "Display name"}</Body><Field value={displayName} onChangeText={setDisplayName} maxLength={80} /><Body muted>{ja ? "タイムゾーン（IANA形式）" : "Timezone (IANA ID)"}</Body><Field value={timezone} onChangeText={setTimezone} autoCapitalize="none" placeholder="Asia/Tokyo" /><Body muted>{ja ? "投稿日の判定と解禁日は、このタイムゾーンを基準にします。" : "Posting dates and unlock dates use this timezone."}</Body>{!!error && <Text style={styles.error}>{error}</Text>}<Button label={ja ? "変更を保存" : "Save changes"} onPress={save} loading={loading} /></Card></ScrollView>;
}
const styles = StyleSheet.create({ container: { padding: spacing.lg, gap: spacing.lg }, back: { color: colors.primary, fontSize: 16 }, error: { color: colors.danger } });
