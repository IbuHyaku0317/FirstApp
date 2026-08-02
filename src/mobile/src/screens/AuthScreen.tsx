import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Field, Title } from "../components/atoms";
import { api } from "../shared/api";
import { Language, t } from "../shared/i18n";
import { Session } from "../shared/session";
import { colors, spacing } from "../shared/theme";

type AuthMode = "login" | "register" | "passwordReset";

export function AuthScreen({ language, onAuthenticated }: { language: Language; onAuthenticated: (session: Session) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const ja = language === "ja";

  const submit = async () => {
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(ja ? "メールアドレスを確認してください。" : "Check your email address.");
    if (password.length < 10) return setError(ja ? "パスワードは10文字以上必要です。" : "Use at least 10 characters.");
    if (mode === "register" && !displayName.trim()) return setError(ja ? "表示名を入力してください。" : "Enter a display name.");
    setLoading(true);
    try {
      const result = mode === "register" ? await api.register(displayName, email, password, language) : await api.login(email, password, language);
      onAuthenticated({ ...result, user: { ...result.user, preferredLanguage: result.user.preferredLanguage ?? language, anniversarySetupCompleted: result.user.anniversarySetupCompleted ?? mode === "login" } });
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };

  return <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}><Text style={styles.mark}>◌</Text><Title>{t(language, "appName")}</Title><Body muted>{t(language, "tagline")}</Body></View>
      {mode === "passwordReset" ? <Card><Title>{ja ? "パスワード再設定" : "Reset password"}</Title><Field accessibilityLabel={t(language, "email")} placeholder={t(language, "email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" /><Body muted>{ja ? "再設定メールの送信画面です。メール配信サービス接続後に送信機能が有効になります。" : "This screen will send password reset email after the email delivery service is connected."}</Body><Button label={ja ? "メール送信は準備中" : "Email delivery coming soon"} onPress={() => undefined} disabled /><Button secondary label={ja ? "ログインへ戻る" : "Back to sign in"} onPress={() => setMode("login")} /></Card> : <View style={styles.form}>
        {mode === "register" && <Field accessibilityLabel={t(language, "displayName")} placeholder={t(language, "displayName")} value={displayName} onChangeText={setDisplayName} maxLength={80} />}
        <Field accessibilityLabel={t(language, "email")} placeholder={t(language, "email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field accessibilityLabel={t(language, "password")} placeholder={t(language, "password")} value={password} onChangeText={setPassword} secureTextEntry />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button label={mode === "login" ? t(language, "signIn") : t(language, "signUp")} onPress={submit} loading={loading} />
        {mode === "login" && <Pressable onPress={() => setMode("passwordReset")}><Text style={styles.forgot}>{ja ? "パスワードを忘れた方" : "Forgot password?"}</Text></Pressable>}
        <Button secondary label={mode === "login" ? t(language, "signUp") : t(language, "signIn")} onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} />
      </View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ fill: { flex: 1 }, container: { flexGrow: 1, padding: spacing.lg, justifyContent: "center", gap: spacing.xl }, hero: { alignItems: "center", gap: spacing.sm }, mark: { fontSize: 64, color: colors.primary }, form: { gap: spacing.md }, error: { color: colors.danger, lineHeight: 20 }, forgot: { color: colors.primary, textAlign: "center", padding: spacing.sm } });
