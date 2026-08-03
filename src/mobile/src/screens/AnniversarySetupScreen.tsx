import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Field, Title } from "../components/atoms";
import { api } from "../shared/api";
import { Session } from "../shared/session";
import { colors, spacing } from "../shared/theme";

export function AnniversarySetupScreen({ session, onSessionChange }: { session: Session; onSessionChange: (session: Session) => void }) {
  const ja = session.user.preferredLanguage === "ja";
  const [name, setName] = useState(ja ? "大切な記念日" : "My anniversary");
  const [month, setMonth] = useState(""); const [day, setDay] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const save = async (skip = false) => {
    const m = Number(month), d = Number(day);
    if (!skip && (!name.trim() || m < 1 || m > 12 || d < 1 || d > 31)) return setError(ja ? "記念日名と正しい月日を入力してください。" : "Enter a name and valid month and day.");
    setLoading(true); setError("");
    try { const user = await api.setAnniversary(session, skip ? null : { name: name.trim(), month: m, day: d }); onSessionChange({ ...session, user: { ...user, anniversarySetupCompleted: true } }); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  };
  return <ScrollView contentContainerStyle={styles.container}><View><Title>{ja ? "記念日を教えてください" : "Choose your anniversary"}</Title><Body muted>{ja ? "記念日は1日に2つの思い出を残せます。プロフィールから14日ごとに変更できます。" : "You can keep two memories on this day. It can be changed every 14 days."}</Body></View><Card><Field value={name} onChangeText={setName} placeholder={ja ? "記念日の名前" : "Anniversary name"} /><View style={styles.row}><Field style={styles.half} value={month} onChangeText={setMonth} keyboardType="number-pad" placeholder={ja ? "月" : "Month"} maxLength={2} /><Field style={styles.half} value={day} onChangeText={setDay} keyboardType="number-pad" placeholder={ja ? "日" : "Day"} maxLength={2} /></View>{!!error && <Text style={styles.error}>{error}</Text>}<Button label={ja ? "この記念日を登録" : "Save anniversary"} onPress={() => save()} loading={loading} /><Button secondary label={ja ? "あとで設定する" : "Set up later"} onPress={() => save(true)} disabled={loading} /></Card></ScrollView>;
}
const styles = StyleSheet.create({ container: { flexGrow: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.xl }, row: { flexDirection: "row", gap: spacing.sm }, half: { flex: 1 }, error: { color: colors.danger } });
