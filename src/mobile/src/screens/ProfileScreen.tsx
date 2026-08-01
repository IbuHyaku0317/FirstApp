import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Field, Title } from "../components/atoms";
import { api } from "../shared/api";
import { Session } from "../shared/session";
import { TodayStatus } from "../shared/types";
import { colors, spacing } from "../shared/theme";
import { AccountSettingsScreen } from "./AccountSettingsScreen";
import { EditProfileScreen } from "./EditProfileScreen";
import { LegalScreen } from "./LegalScreen";
import { SubscriptionScreen } from "./SubscriptionScreen";
import { DeveloperClockScreen } from "./DeveloperClockScreen";

type ProfilePage = "home" | "edit" | "subscription" | "legal" | "account" | "developerClock";

export function ProfileScreen({ session, onSessionChange }: { session: Session; onSessionChange: (session: Session | null) => void }) {
  const [page, setPage] = useState<ProfilePage>("home");
  const [editingAnniversary, setEditingAnniversary] = useState(false);
  const [name, setName] = useState(session.user.anniversary?.name ?? "");
  const [month, setMonth] = useState(session.user.anniversary ? String(session.user.anniversary.month) : "");
  const [day, setDay] = useState(session.user.anniversary ? String(session.user.anniversary.day) : "");
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const ja = session.user.preferredLanguage === "ja";
  const anniversary = session.user.anniversary;

  const loadStatus = () => api.todayStatus(session).then(setTodayStatus).catch(() => undefined);
  useEffect(() => { void loadStatus(); }, [session]);
  useEffect(() => {
    if (!todayStatus?.cancelablePosts.length) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [todayStatus?.cancelablePosts.length]);

  const remainingTime = (until?: string) => {
    const seconds = Math.max(0, Math.ceil((new Date(until ?? 0).getTime() - nowMs) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };

  if (page === "edit") return <EditProfileScreen session={session} onBack={() => setPage("home")} onSaved={next => { onSessionChange(next); setPage("home"); }} />;
  if (page === "subscription") return <SubscriptionScreen session={session} onBack={() => setPage("home")} />;
  if (page === "legal") return <LegalScreen session={session} onBack={() => setPage("home")} />;
  if (page === "account") return <AccountSettingsScreen session={session} onBack={() => setPage("home")} onDeleted={() => onSessionChange(null)} />;
  if (page === "developerClock") return <DeveloperClockScreen session={session} onBack={() => setPage("home")} />;

  const saveAnniversary = async () => {
    const m = Number(month), d = Number(day);
    if (!name.trim() || m < 1 || m > 12 || d < 1 || d > 31) return setError(ja ? "記念日名と正しい月日を入力してください。" : "Enter a valid anniversary.");
    setLoading(true); setError("");
    try {
      const impact = anniversary ? await api.anniversaryImpact(session) : { affectedLockedSecondPosts: 0 };
      Alert.alert(
        ja ? "記念日を変更しますか？" : "Change anniversary?",
        ja ? `変更は即時反映されます。未解禁の2件目 ${impact.affectedLockedSecondPosts}件は解禁時に表示されません。解禁済みの投稿は2件のままです。` : `The change is immediate. ${impact.affectedLockedSecondPosts} locked second posts will stay hidden. Already unlocked posts remain visible.`,
        [
          { text: ja ? "戻る" : "Back", style: "cancel", onPress: () => setLoading(false) },
          { text: ja ? "変更する" : "Change", onPress: async () => {
            try { const user = await api.setAnniversary(session, { name: name.trim(), month: m, day: d }); onSessionChange({ ...session, user }); setEditingAnniversary(false); }
            catch (e) { setError(e instanceof Error ? e.message : "Error"); }
            finally { setLoading(false); }
          } },
        ],
      );
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); setLoading(false); }
  };

  const cancelPost = (id: string) => Alert.alert(
    ja ? "投稿を取り消しますか？" : "Cancel this post?",
    ja ? "取り消すと今日の投稿枠をもう一度使えます。" : "You can use today's slot again.",
    [{ text: ja ? "戻る" : "Back", style: "cancel" }, { text: ja ? "取り消す" : "Cancel post", style: "destructive", onPress: async () => { try { await api.cancelPost(session, id); await loadStatus(); } catch (e) { setError(e instanceof Error ? e.message : "Error"); } } }],
  );

  const logout = () => Alert.alert(ja ? "ログアウトしますか？" : "Sign out?", "", [
    { text: ja ? "戻る" : "Back", style: "cancel" },
    { text: ja ? "ログアウト" : "Sign out", style: "destructive", onPress: async () => { await api.logout(session).catch(() => undefined); onSessionChange(null); } },
  ]);

  return <ScrollView contentContainerStyle={styles.container}>
    <Title>{ja ? "プロフィール" : "Profile"}</Title>
    <Card><View style={styles.avatar}><Text style={styles.avatarText}>{session.user.displayName.slice(0, 1).toUpperCase()}</Text></View><Text style={styles.name}>{session.user.displayName}</Text><Body muted>{session.user.email}</Body><Text style={styles.plan}>{session.user.membership === "premium" ? "Premium" : "Free"}</Text><Button secondary label={ja ? "プロフィールを編集" : "Edit profile"} onPress={() => setPage("edit")} /></Card>

    {!!todayStatus?.cancelablePosts.length && <Card><Text style={styles.section}>{ja ? "取り消し可能な投稿" : "Cancelable posts"}</Text><Body muted>{ja ? "残り時間が0になるまで取り消せます。" : "You can cancel until the timer reaches zero."}</Body>{todayStatus.cancelablePosts.map((post, index) => <View key={post.id} style={styles.cancelRow}><Body>{new Intl.DateTimeFormat(ja ? "ja-JP" : "en-US", { hour: "2-digit", minute: "2-digit", timeZone: session.user.timezone }).format(new Date(post.createdAt))}</Body><Text style={styles.countdown}>{remainingTime(post.cancelableUntil)}</Text><Button danger label={ja ? `${index + 1}件目を取り消す` : `Cancel post ${index + 1}`} onPress={() => cancelPost(post.id)} disabled={remainingTime(post.cancelableUntil) === "00:00"} /></View>)}</Card>}

    <Card><Text style={styles.section}>{ja ? "記念日" : "Anniversary"}</Text>{editingAnniversary ? <><Field value={name} onChangeText={setName} placeholder={ja ? "記念日の名前" : "Anniversary name"} /><View style={styles.row}><Field style={styles.half} value={month} onChangeText={setMonth} keyboardType="number-pad" placeholder={ja ? "月" : "Month"} /><Field style={styles.half} value={day} onChangeText={setDay} keyboardType="number-pad" placeholder={ja ? "日" : "Day"} /></View>{!!error && <Text style={styles.error}>{error}</Text>}<Button label={ja ? "変更内容を確認" : "Review change"} onPress={saveAnniversary} loading={loading} /><Button secondary label={ja ? "キャンセル" : "Cancel"} onPress={() => setEditingAnniversary(false)} /></> : <>{anniversary ? <><Text style={styles.anniversary}>{anniversary.month}/{anniversary.day}　{anniversary.name}</Text><Body muted>{anniversary.nextChangeAllowedOn ? (ja ? `次回変更可能日：${anniversary.nextChangeAllowedOn}` : `Next change: ${anniversary.nextChangeAllowedOn}`) : (ja ? "設定から14日後に変更できます。" : "Can be changed after 14 days.")}</Body></> : <Body muted>{ja ? "記念日は未設定です。" : "No anniversary is set."}</Body>}<Button secondary label={anniversary ? (ja ? "記念日を変更" : "Change anniversary") : (ja ? "記念日を設定" : "Set anniversary")} onPress={() => setEditingAnniversary(true)} /></>}</Card>

    <Card><Text style={styles.section}>{ja ? "メニュー" : "Menu"}</Text><Button secondary label={ja ? "Premiumプラン" : "Premium plan"} onPress={() => setPage("subscription")} /><Button secondary label={ja ? "アカウント管理" : "Account settings"} onPress={() => setPage("account")} /><Button secondary label={ja ? "利用規約・プライバシー" : "Terms & privacy"} onPress={() => setPage("legal")} />{__DEV__ && <Button secondary label={ja ? "開発用時計" : "Developer clock"} onPress={() => setPage("developerClock")} />}<Body muted>{ja ? "位置情報は使用しません。" : "Location is not used."}</Body></Card>
    {!!error && <Text style={styles.error}>{error}</Text>}
    <Button danger label={ja ? "ログアウト" : "Sign out"} onPress={logout} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg }, avatar: { width: 72, height: 72, borderRadius: 36, alignSelf: "center", backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.primary, fontSize: 30, fontWeight: "700" }, name: { textAlign: "center", color: colors.text, fontSize: 22, fontWeight: "700" }, plan: { alignSelf: "center", color: colors.primary, fontWeight: "700" },
  section: { color: colors.text, fontSize: 18, fontWeight: "700" }, anniversary: { color: colors.text, fontSize: 18 }, row: { flexDirection: "row", gap: spacing.sm }, half: { flex: 1 }, cancelRow: { gap: spacing.sm }, countdown: { color: colors.danger, fontSize: 28, fontWeight: "700", fontVariant: ["tabular-nums"] }, error: { color: colors.danger },
});
