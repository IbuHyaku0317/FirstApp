import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "../shared/i18n";
import { Session } from "../shared/session";
import { colors, spacing } from "../shared/theme";
import { CalendarScreen } from "./CalendarScreen";
import { CreatePostScreen } from "./CreatePostScreen";
import { ProfileScreen } from "./ProfileScreen";
import { SubscriptionScreen } from "./SubscriptionScreen";

type Tab = "calendar" | "post" | "profile";

const icons: Record<Tab, string> = {
  calendar: "□",
  post: "+",
  profile: "●",
};

type Props = {
  session: Session;
  onSessionChange: (session: Session | null) => void;
};

export function MainTabs({ session, onSessionChange }: Props) {
  const [tab, setTab] = useState<Tab>("calendar");
  const [calendarVersion, setCalendarVersion] = useState(0);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const language = session.user.preferredLanguage;

  const selectTab = (nextTab: Tab) => {
    setSubscriptionOpen(false);
    setTab(nextTab);
  };

  return (
    <View style={styles.fill}>
      <View style={styles.content}>
        {subscriptionOpen ? (
          <SubscriptionScreen session={session} source="post" onBack={() => setSubscriptionOpen(false)} />
        ) : (
          <>
            {tab === "calendar" && <CalendarScreen key={calendarVersion} session={session} />}
            {tab === "post" && (
              <CreatePostScreen
                session={session}
                onOpenSubscription={() => setSubscriptionOpen(true)}
                onCreated={() => {
                  setCalendarVersion(version => version + 1);
                  setTab("calendar");
                }}
              />
            )}
            {tab === "profile" && <ProfileScreen session={session} onSessionChange={onSessionChange} />}
          </>
        )}
      </View>

      <View style={styles.tabs}>
        {(["calendar", "post", "profile"] as Tab[]).map(item => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: !subscriptionOpen && tab === item }}
            onPress={() => selectTab(item)}
            style={styles.tab}
          >
            <Text style={[styles.icon, !subscriptionOpen && tab === item && styles.active]}>{icons[item]}</Text>
            <Text style={[styles.label, !subscriptionOpen && tab === item && styles.active]}>{t(language, item)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1 },
  tabs: {
    flexDirection: "row",
    minHeight: 68,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: { flex: 1, gap: 2, alignItems: "center", justifyContent: "center" },
  icon: { color: colors.muted, fontSize: 25 },
  label: { color: colors.muted, fontSize: 12 },
  active: { color: colors.primary, fontWeight: "700" },
});
