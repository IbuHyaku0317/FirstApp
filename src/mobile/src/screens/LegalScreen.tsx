import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Body, Card, Title } from "../components/atoms";
import { Session } from "../shared/session";
import { colors, spacing } from "../shared/theme";

export function LegalScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const ja = session.user.preferredLanguage === "ja";
  return <ScrollView contentContainerStyle={styles.container}><Pressable onPress={onBack}><Text style={styles.back}>‹ {ja ? "プロフィール" : "Profile"}</Text></Pressable><Title>{ja ? "利用規約・プライバシー" : "Terms & privacy"}</Title><Card><Text style={styles.section}>{ja ? "プライバシー方針（ドラフト）" : "Privacy summary (draft)"}</Text><Body>{ja ? "投稿した写真・動画・メッセージは、本人の認証後にのみ扱います。未解禁期間中は、投稿内容をカレンダーAPIへ返しません。" : "Photos, videos, and messages are handled only after authenticating their owner. Locked content is not returned by calendar APIs."}</Body><Body>{ja ? "初期版では位置情報を取得・保存しません。認証トークンや署名付きURLをログへ記録しません。" : "The initial release does not collect or store location data. Authentication tokens and signed URLs are not logged."}</Body></Card><Card><Text style={styles.section}>{ja ? "利用規約（ドラフト）" : "Terms summary (draft)"}</Text><Body>{ja ? "利用者は、自分が権利を持つ写真・動画だけを投稿してください。不正利用、第三者の権利侵害、サービスへの攻撃は禁止します。" : "Only upload media you have the right to use. Abuse, infringement, and attacks against the service are prohibited."}</Body><Body muted>{ja ? "正式公開前に運営者情報、問い合わせ先、保持期間、対象年齢を確定し、法律専門家の確認を受ける必要があります。" : "Before release, operator details, contact information, retention periods, and age limits must be finalized and legally reviewed."}</Body></Card></ScrollView>;
}
const styles = StyleSheet.create({ container: { padding: spacing.lg, gap: spacing.lg }, back: { color: colors.primary, fontSize: 16 }, section: { color: colors.text, fontSize: 18, fontWeight: "700" } });
