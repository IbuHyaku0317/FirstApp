import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Field, Title } from "../components/atoms";
import { api } from "../shared/api";
import { Session } from "../shared/session";
import { TodayStatus } from "../shared/types";
import { colors, spacing } from "../shared/theme";

export function ProfileScreen({ session, onSessionChange }: { session: Session; onSessionChange: (session: Session | null) => void }) {
  const ja = session.user.preferredLanguage === "ja";
  const anniversary = session.user.anniversary;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(anniversary?.name ?? "");
  const [month, setMonth] = useState(anniversary ? String(anniversary.month) : "");
  const [day, setDay] = useState(anniversary ? String(anniversary.day) : "");
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadStatus = () => api.todayStatus(session).then(setTodayStatus).catch(() => undefined);
  useEffect(() => { void loadStatus(); }, [session]);

  const saveAnniversary = async () => {
    const m = Number(month), d = Number(day);
    if (!name.trim() || m < 1 || m > 12 || d < 1 || d > 31) return setError(ja ? "記念日名と正しい月日を入力してください。" : "Enter a valid anniversary.");
    setLoading(true); setError("");
    try {
      const impact = anniversary ? await api.anniversaryImpact(session) : { affectedLockedSecondPosts: 0 };
      Alert.alert(
        ja ? "記念日を変更しますか？" : "Change anniversary?",
        ja ? `変更は即時反映されます。未解禁の2件目 ${impact.affectedLockedSecondPosts}件は、解禁時に表示されません。解禁済みの投稿は2件のままです。` : `The change is immediate. ${impact.affectedLockedSecondPosts} locked second posts will remain hidden when they unlock. Already unlocked posts stay visible.`,
        [{ text: ja ? "戻る" : "Back", style: "cancel", onPress: () => setLoading(false) }, { text: ja ? "変更する" : "Change", onPress: async () => {
          try { const user = await api.setAnniversary(session, { name: name.trim(), month: m, day: d }); onSessionChange({ ...session, user }); setEditing(false); }
          catch (e) { setError(e instanceof Error ? e.message : "Error"); }
          finally { setLoading(false); }
        }}],
      );
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); setLoading(false); }
  };

  const cancelPost = (id: string) => Alert.alert(ja ? "投稿を取り消しますか？" : "Cancel this post?", ja ? "取り消すと今日の投稿枠をもう一度使えます。" : "You can use today's slot again after cancellation.", [{ text: ja ? "戻る" : "Back", style: "cancel" }, { text: ja ? "取り消す" : "Cancel post", style: "destructive", onPress: async () => { try { await api.cancelPost(session, id); loadStatus(); } catch (e) { setError(e instanceof Error ? e.message : "Error"); } } }]);
  const logout = () => Alert.alert(ja ? "ログアウトしますか？" : "Sign out?", "", [{ text: ja ? "戻る" : "Back", style: "cancel" }, { text: ja ? "ログアウト" : "Sign out", style: "destructive", onPress: async () => { await api.logout(session).catch(() => undefined); onSessionChange(null); } }]);

  return <ScrollView contentContainerStyle={styles.container}>
    <Title>{ja ? "プロフィール" : "Profile"}</Title>
    <Card><View style={styles.avatar}><Text style={styles.avatarText}>{session.user.displayName.slice(0, 1).toUpperCase()}</Text></View><Text style={styles.name}>{session.user.displayName}</Text><Body muted>{session.user.email}</Body><Text style={styles.plan}>{session.user.membership === "premium" ? "Premium" : "Free"}</Text></Card>
    {!!todayStatus?.cancelablePosts.length && <Card><Text style={styles.section}>{ja ? "取り消し可能な投稿" : "Cancelable posts"}</Text><Body muted>{ja ? "投稿から10分以内です。" : "These were posted within the last 10 minutes."}</Body>{todayStatus.cancelablePosts.map((post, index) => <Button key={post.id} danger label={ja ? `${index + 1}件目を取り消す` : `Cancel post ${index + 1}`} onPress={() => cancelPost(post.id)} />)}</Card>}
    <Card><Text style={styles.section}>{ja ? "記念日" : "Anniversary"}</Text>{editing ? <><Field value={name} onChangeText={setName} placeholder={ja ? "記念日の名前" : "Anniversary name"} /><View style={styles.row}><Field style={styles.half} value={month} onChangeText={setMonth} keyboardType="number-pad" placeholder={ja ? "月" : "Month"} /><Field style={styles.half} value={day} onChangeText={setDay} keyboardType="number-pad" placeholder={ja ? "日" : "Day"} /></View>{!!error && <Text style={styles.error}>{error}</Text>}<Button label={ja ? "変更内容を確認" : "Review change"} onPress={saveAnniversary} loading={loading} /><Button secondary label={ja ? "キャンセル" : "Cancel"} onPress={() => setEditing(false)} /></> : <>{anniversary ? <><Text style={styles.anniversary}>{anniversary.month}/{anniversary.day}　{anniversary.name}</Text><Body muted>{anniversary.nextChangeAllowedOn ? (ja ? `次回変更可能日：${anniversary.nextChangeAllowedOn}` : `Next change: ${anniversary.nextChangeAllowedOn}`) : (ja ? "設定から14日後に変更できます。" : "Can be changed after 14 days.")}</Body></> : <Body muted>{ja ? "記念日は未設定です。" : "No anniversary is set."}</Body>}<Button secondary label={anniversary ? (ja ? "記念日を変更" : "Change anniversary") : (ja ? "記念日を設定" : "Set anniversary")} onPress={() => setEditing(true)} /></>}</Card>
    <Card><Text style={styles.section}>{ja ? "設定" : "Settings"}</Text><Body>{ja ? "言語：日本語" : "Language: English"}</Body><Body>{ja ? `タイムゾーン：${session.user.timezone}` : `Timezone: ${session.user.timezone}`}</Body><Body muted>{ja ? "位置情報は使用しません。" : "Location is not used."}</Body></Card>
    <Button danger label={ja ? "ログアウト" : "Sign out"} onPress={logout} />
  </ScrollView>;
}

const styles = StyleSheet.create({ container: { padding: spacing.lg, gap: spacing.lg }, avatar: { width: 72, height: 72, borderRadius: 36, alignSelf: "center", backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.primary, fontSize: 30, fontWeight: "700" }, name: { textAlign: "center", color: colors.text, fontSize: 22, fontWeight: "700" }, plan: { alignSelf: "center", color: colors.primary, fontWeight: "700" }, section: { color: colors.text, fontSize: 18, fontWeight: "700" }, anniversary: { color: colors.text, fontSize: 18 }, row: { flexDirection: "row", gap: spacing.sm }, half: { flex: 1 }, error: { color: colors.danger } });
