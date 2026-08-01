import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Body, Button, Card, Title } from "../components/atoms";
import { Session } from "../shared/session";
import { colors, spacing } from "../shared/theme";

export function SubscriptionScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const ja = session.user.preferredLanguage === "ja", premium = session.user.membership === "premium";
  return <ScrollView contentContainerStyle={styles.container}><Pressable onPress={onBack}><Text style={styles.back}>‹ {ja ? "プロフィール" : "Profile"}</Text></Pressable><Title>{ja ? "Premium" : "Premium"}</Title><Card><Text style={styles.plan}>{premium ? (ja ? "Premium会員" : "Premium member") : (ja ? "無料プラン" : "Free plan")}</Text><Body>{ja ? "Premiumでは、写真に加えて最大60秒・100MBの動画を一年後へ保存できます。" : "Premium lets you save videos up to 60 seconds and 100 MB, as well as photos."}</Body><Body muted>{ja ? "通常日1件、記念日2件の投稿上限はPremiumでも変わりません。" : "Daily limits remain one post normally and two on your anniversary."}</Body></Card><Card><Text style={styles.section}>{ja ? "Google Playでの購入" : "Purchase with Google Play"}</Text><Body muted>{ja ? "価格と購入機能はGoogle Play Billing接続後に利用できます。現在、この画面から料金は発生しません。" : "Pricing and purchases will be available after Google Play Billing is connected. This screen cannot charge you yet."}</Body><Button label={ja ? "購入機能は準備中" : "Purchases coming soon"} onPress={() => undefined} disabled /></Card></ScrollView>;
}
const styles = StyleSheet.create({ container: { padding: spacing.lg, gap: spacing.lg }, back: { color: colors.primary, fontSize: 16 }, plan: { color: colors.primary, fontSize: 22, fontWeight: "700" }, section: { color: colors.text, fontSize: 18, fontWeight: "700" } });
