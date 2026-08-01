import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from "react-native";
import { AuthScreen } from "./src/screens/AuthScreen";
import { AnniversarySetupScreen } from "./src/screens/AnniversarySetupScreen";
import { MainTabs } from "./src/screens/MainTabs";
import { Session, sessionStore } from "./src/shared/session";
import { colors } from "./src/shared/theme";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionStore.restore().then(setSession).finally(() => setLoading(false));
  }, []);

  const updateSession = useCallback(async (next: Session | null) => {
    setSession(next);
    await sessionStore.save(next);
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {!session ? (
        <AuthScreen onAuthenticated={updateSession} />
      ) : !session.user.anniversarySetupCompleted ? (
        <AnniversarySetupScreen session={session} onSessionChange={updateSession} />
      ) : (
        <MainTabs session={session} onSessionChange={updateSession} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
