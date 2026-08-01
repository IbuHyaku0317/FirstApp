import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Session } from "../shared/session";
import { colors, spacing } from "../shared/theme";
import { t } from "../shared/i18n";
import { CalendarScreen } from "./CalendarScreen";
import { CreatePostScreen } from "./CreatePostScreen";
import { ProfileScreen } from "./ProfileScreen";

type Tab = "calendar" | "post" | "profile";
const icons: Record<Tab, string> = { calendar: "▦", post: "+", profile: "○" };

export function MainTabs({ session, onSessionChange }: { session: Session; onSessionChange: (session: Session | null) => void }) {
  const [tab, setTab] = useState<Tab>("calendar"); const [calendarVersion, setCalendarVersion] = useState(0);
  const language = session.user.preferredLanguage;
  return <View style={styles.fill}><View style={styles.content}>{tab === "calendar" && <CalendarScreen key={calendarVersion} session={session} />}{tab === "post" && <CreatePostScreen session={session} onCreated={() => { setCalendarVersion(v => v + 1); setTab("calendar"); }} />}{tab === "profile" && <ProfileScreen session={session} onSessionChange={onSessionChange} />}</View><View style={styles.tabs}>{(["calendar", "post", "profile"] as Tab[]).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={styles.tab}><Text style={[styles.icon, tab === item && styles.active]}>{icons[item]}</Text><Text style={[styles.label, tab === item && styles.active]}>{t(language, item)}</Text></Pressable>)}</View></View>;
}
const styles = StyleSheet.create({ fill: { flex: 1 }, content: { flex: 1 }, tabs: { flexDirection: "row", minHeight: 68, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, paddingBottom: spacing.xs }, tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }, icon: { color: colors.muted, fontSize: 25 }, label: { color: colors.muted, fontSize: 12 }, active: { color: colors.primary, fontWeight: "700" } });
