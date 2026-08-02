import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LanguageSwitcher } from "./src/components/LanguageSwitcher";
import { AuthScreen } from "./src/screens/AuthScreen";
import { AnniversarySetupScreen } from "./src/screens/AnniversarySetupScreen";
import { MainTabs } from "./src/screens/MainTabs";
import { api } from "./src/shared/api";
import { Language } from "./src/shared/i18n";
import { Session, sessionStore } from "./src/shared/session";
import { colors, spacing } from "./src/shared/theme";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [anonymousLanguage, setAnonymousLanguage] = useState<Language>("ja");
  const [languageSaving, setLanguageSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionStore.restore().then(setSession).finally(() => setLoading(false));
  }, []);

  const updateSession = useCallback(async (next: Session | null) => {
    setSession(next);
    await sessionStore.save(next);
  }, []);

  const changeLanguage = useCallback(async (nextLanguage: Language) => {
    if (!session) {
      setAnonymousLanguage(nextLanguage);
      return;
    }
    if (session.user.preferredLanguage === nextLanguage || languageSaving) return;

    // 画面表示を先に切り替え、保存に失敗した場合だけ元へ戻す。
    const previousSession = session;
    const optimisticSession: Session = {
      ...session,
      user: { ...session.user, preferredLanguage: nextLanguage },
    };

    setLanguageSaving(true);
    await updateSession(optimisticSession);
    try {
      const user = await api.updateProfile(optimisticSession, {
        displayName: optimisticSession.user.displayName,
        preferredLanguage: nextLanguage,
        timezone: optimisticSession.user.timezone,
      });
      await updateSession({ ...optimisticSession, user });
    } catch (error) {
      await updateSession(previousSession);
      Alert.alert(
        nextLanguage === "ja" ? "言語を変更できませんでした" : "Language change failed",
        error instanceof Error ? error.message : nextLanguage === "ja" ? "もう一度お試しください。" : "Please try again.",
      );
    } finally {
      setLanguageSaving(false);
    }
  }, [languageSaving, session, updateSession]);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  const language = session?.user.preferredLanguage ?? anonymousLanguage;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.languageBar}>
          <LanguageSwitcher language={language} disabled={languageSaving} onChange={changeLanguage} />
        </View>
        <View style={styles.content}>
          {!session ? (
            <AuthScreen language={anonymousLanguage} onAuthenticated={updateSession} />
          ) : !session.user.anniversarySetupCompleted ? (
            <AnniversarySetupScreen session={session} onSessionChange={updateSession} />
          ) : (
            <MainTabs session={session} onSessionChange={updateSession} />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  languageBar: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    alignItems: "flex-end",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  content: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
