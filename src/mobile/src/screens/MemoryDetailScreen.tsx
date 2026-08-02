import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AuthenticatedImage } from "../components/AuthenticatedImage";
import { Body, Card, Title } from "../components/atoms";
import { VideoMemory } from "../components/VideoMemory";
import { Session } from "../shared/session";
import { colors, spacing } from "../shared/theme";
import { Post } from "../shared/types";

type Props = {
  session: Session;
  post: Post;
  onBack: () => void;
};

/** カレンダーのプレビューから開く、1投稿単位の閲覧画面。 */
export function MemoryDetailScreen({ session, post, onBack }: Props) {
  const ja = session.user.preferredLanguage === "ja";
  const media = post.media[0];
  const postedAt = new Intl.DateTimeFormat(ja ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: session.user.timezone,
  }).format(new Date(post.createdAt));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ja ? `${post.occurredOn}のカレンダーへ戻る` : `Back to calendar on ${post.occurredOn}`}
        onPress={onBack}
        style={styles.backButton}
      >
        <Text style={styles.back}>‹ {ja ? "カレンダーへ戻る" : "Back to calendar"}</Text>
      </Pressable>

      <View>
        <Title>{ja ? "思い出の詳細" : "Memory details"}</Title>
        <Body muted>{ja ? `${post.occurredOn} の思い出` : `Memory from ${post.occurredOn}`}</Body>
      </View>

      <Card>
        {media?.kind === "image" && (
          <AuthenticatedImage
            url={media.url}
            session={session}
            resizeMode="contain"
            style={styles.image}
          />
        )}
        {media?.kind === "video" && <VideoMemory url={media.url} session={session} />}
        {!media && <Body muted>{ja ? "メディアがありません。" : "No media available."}</Body>}
      </Card>

      <Card>
        <Text style={styles.section}>{ja ? "メッセージ" : "Message"}</Text>
        <Body>{post.caption || (ja ? "メッセージはありません" : "No message")}</Body>
      </Card>

      <Card>
        <Text style={styles.section}>{ja ? "投稿情報" : "Post information"}</Text>
        <Body>{ja ? `投稿時刻：${postedAt}` : `Posted at: ${postedAt}`}</Body>
        <Body muted>{ja ? `表示タイムゾーン：${session.user.timezone}` : `Display timezone: ${session.user.timezone}`}</Body>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  backButton: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center" },
  back: { color: colors.primary, fontSize: 16, fontWeight: "600" },
  image: { width: "100%", aspectRatio: 1, borderRadius: 14, backgroundColor: colors.background },
  section: { color: colors.text, fontSize: 18, fontWeight: "700" },
});
