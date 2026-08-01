import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Body, Button, Card, Field, Title } from "../components/atoms";
import { api } from "../shared/api";
import { Session } from "../shared/session";
import { colors, spacing } from "../shared/theme";

export function DeveloperClockScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const ja = session.user.preferredLanguage === "ja";
  const [utcNow, setUtcNow] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const applyClock = (clock: { utcNow: string }) => { setUtcNow(clock.utcNow); setInput(clock.utcNow); };
  useEffect(() => { void api.developmentClock(session).then(applyClock).catch(e => setError(e instanceof Error ? e.message : "Error")); }, []);

  const setClock = async () => {
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return setError(ja ? "日時をISO 8601形式で入力してください。" : "Enter a valid ISO 8601 date and time.");
    setLoading(true); setError("");
    try { applyClock(await api.setDevelopmentClock(session, parsed.toISOString())); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };

  const resetClock = async () => {
    setLoading(true); setError("");
    try { applyClock(await api.resetDevelopmentClock(session)); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };

  return <ScrollView contentContainerStyle={styles.container}>
    <Button secondary label={ja ? "戻る" : "Back"} onPress={onBack} />
    <Title>{ja ? "開発用時計" : "Developer clock"}</Title>
    <Card>
      <Body muted>{ja ? "投稿を一年後まで進めたときの表示を確認できます。この機能は開発版にのみ存在します。" : "Move business time forward to test one-year unlocks. This is available only in development builds."}</Body>
      <Body>{ja ? "現在の業務時刻（UTC）" : "Current business time (UTC)"}</Body>
      <Text selectable style={styles.current}>{utcNow || "..."}</Text>
      <Field autoCapitalize="none" autoCorrect={false} value={input} onChangeText={setInput} placeholder="2027-08-01T00:00:00Z" />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button label={ja ? "この日時に設定" : "Set this date"} onPress={setClock} loading={loading} />
      <Button secondary label={ja ? "実際の日時に戻す" : "Reset to real time"} onPress={resetClock} disabled={loading} />
    </Card>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  current: { color: colors.text, fontWeight: "700" },
  error: { color: colors.danger },
});
