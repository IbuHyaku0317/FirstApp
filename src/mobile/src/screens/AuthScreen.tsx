import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Button, Field, Title } from "../components/atoms";
import { api } from "../shared/api";
import { Language, t } from "../shared/i18n";
import { Session } from "../shared/session";
import { colors, spacing } from "../shared/theme";

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [language, setLanguage] = useState<Language>("ja");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(language === "ja" ? "メールアドレスを確認してください。" : "Check your email address.");
    if (password.length < 10) return setError(language === "ja" ? "パスワードは10文字以上必要です。" : "Use at least 10 characters.");
    if (mode === "register" && !displayName.trim()) return setError(language === "ja" ? "表示名を入力してください。" : "Enter a display name.");
    setLoading(true);
    try {
      const result = mode === "register" ? await api.register(displayName, email, password, language) : await api.login(email, password);
      onAuthenticated({
        ...result,
        user: {
          ...result.user,
          preferredLanguage: result.user.preferredLanguage ?? language,
          anniversarySetupCompleted: result.user.anniversarySetupCompleted ?? mode === "login",
        },
      });
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  };

  return <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.language}><Pressable onPress={() => setLanguage("ja")}><Text style={language === "ja" ? styles.selected : styles.link}>日本語</Text></Pressable><Text> / </Text><Pressable onPress={() => setLanguage("en")}><Text style={language === "en" ? styles.selected : styles.link}>English</Text></Pressable></View>
      <View style={styles.hero}><Text style={styles.mark}>◌</Text><Title>{t(language, "appName")}</Title><Body muted>{t(language, "tagline")}</Body></View>
      <View style={styles.form}>
        {mode === "register" && <Field accessibilityLabel={t(language, "displayName")} placeholder={t(language, "displayName")} value={displayName} onChangeText={setDisplayName} maxLength={80} />}
        <Field accessibilityLabel={t(language, "email")} placeholder={t(language, "email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field accessibilityLabel={t(language, "password")} placeholder={t(language, "password")} value={password} onChangeText={setPassword} secureTextEntry />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button label={mode === "login" ? t(language, "signIn") : t(language, "signUp")} onPress={submit} loading={loading} />
        <Button secondary label={mode === "login" ? t(language, "signUp") : t(language, "signIn")} onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} />
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ fill: { flex: 1 }, container: { flexGrow: 1, padding: spacing.lg, justifyContent: "center", gap: spacing.xl }, language: { position: "absolute", top: 18, right: 24, flexDirection: "row" }, selected: { color: colors.primary, fontWeight: "700" }, link: { color: colors.muted }, hero: { alignItems: "center", gap: spacing.sm }, mark: { fontSize: 64, color: colors.primary }, form: { gap: spacing.md }, error: { color: colors.danger, lineHeight: 20 } });
