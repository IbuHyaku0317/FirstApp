import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AuthenticatedImage } from "../components/AuthenticatedImage";
import { Body, Card, Title } from "../components/atoms";
import { VideoThumbnail } from "../components/VideoThumbnail";
import { api } from "../shared/api";
import { Session } from "../shared/session";
import { colors, spacing } from "../shared/theme";
import { CalendarDay, Post } from "../shared/types";
import { MemoryDetailScreen } from "./MemoryDetailScreen";

const weekJa = ["日", "月", "火", "水", "木", "金", "土"];
const weekEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export function CalendarScreen({ session }: { session: Session }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const ja = session.user.preferredLanguage === "ja";
  const year = cursor.getFullYear();
  const month = cursor.getMonth() + 1;

  useEffect(() => {
    setLoading(true);
    setError("");
    api.calendar(session, year, month)
      .then(setDays)
      .catch(error => setError(error instanceof Error ? error.message : "Error"))
      .finally(() => setLoading(false));
  }, [session, year, month]);

  const counts = useMemo(() => new Map(days.map(day => [day.date, day.count])), [days]);
  const first = new Date(year, month - 1, 1).getDay();
  const total = new Date(year, month, 0).getDate();

  const openDay = async (date: string, count: number) => {
    if (!count) return;

    setSelectedDate(date);
    setSelectedPosts([]);
    setDayLoading(true);
    setError("");
    try {
      setSelectedPosts(await api.day(session, date));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error");
    } finally {
      setDayLoading(false);
    }
  };

  const moveMonth = (nextCursor: Date) => {
    setCursor(nextCursor);
    setSelectedDate(null);
    setSelectedPosts([]);
  };

  if (selectedPost) {
    return <MemoryDetailScreen session={session} post={selectedPost} onBack={() => setSelectedPost(null)} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Title>{ja ? `${year}年${month}月` : cursor.toLocaleDateString("en", { month: "long", year: "numeric" })}</Title>
          <Body muted>{ja ? "一年後にひらいた思い出" : "Memories opened one year later"}</Body>
        </View>
        <View style={styles.monthButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ja ? "前の月" : "Previous month"}
            onPress={() => moveMonth(new Date(year, month - 2, 1))}
            style={styles.monthButton}
          >
            <Text style={styles.arrow}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ja ? "次の月" : "Next month"}
            onPress={() => moveMonth(new Date(year, month, 1))}
            style={styles.monthButton}
          >
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>
      </View>

      <Card>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <View style={styles.week}>
              {(ja ? weekJa : weekEn).map(label => <Text key={label} style={styles.weekLabel}>{label}</Text>)}
            </View>
            <View style={styles.grid}>
              {Array.from({ length: first }).map((_, index) => <View key={`blank-${index}`} style={styles.cell} />)}
              {Array.from({ length: total }).map((_, index) => {
                const day = index + 1;
                const date = iso(year, month, day);
                const count = counts.get(date) ?? 0;
                return (
                  <Pressable
                    accessibilityRole={count ? "button" : undefined}
                    accessibilityLabel={count ? (ja ? `${date}、思い出${count}件` : `${date}, ${count} memories`) : date}
                    onPress={() => openDay(date, count)}
                    key={day}
                    style={[styles.cell, selectedDate === date && styles.selectedCell]}
                  >
                    <Text style={styles.day}>{day}</Text>
                    {count > 0 && (
                      <View style={styles.dots}>
                        {Array.from({ length: Math.min(count, 2) }).map((_, dot) => <View key={dot} style={styles.dot} />)}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}
      </Card>

      {dayLoading && <ActivityIndicator color={colors.primary} />}
      {selectedDate && !dayLoading && selectedPosts.map((post, index) => {
        const media = post.media[0];
        return (
          <Card key={post.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ja ? `${selectedDate}の${index + 1}件目の詳細を開く` : `Open memory ${index + 1} from ${selectedDate}`}
              onPress={() => setSelectedPost(post)}
              style={({ pressed }) => [styles.memoryPreview, pressed && styles.pressed]}
            >
              {media?.kind === "image" && (
                <AuthenticatedImage url={media.url} session={session} style={styles.memoryImage} />
              )}
              {media?.kind === "video" && (
                <VideoThumbnail
                  url={media.url}
                  session={session}
                  accessibilityLabel={ja ? "動画の思い出のサムネイル" : "Video memory thumbnail"}
                  errorText={ja ? "動画を読み込めませんでした" : "Video could not be loaded"}
                />
              )}
              {!media && <Body muted>{ja ? "メディアがありません" : "No media"}</Body>}
            </Pressable>
            <Body muted>{ja ? "タップして詳細を見る" : "Tap to view details"}</Body>
          </Card>
        );
      })}

      <Card>
        <Body>
          {ja
            ? "今日保存した内容は、10分後から一年間見られません。解禁された思い出だけがこのカレンダーに現れます。"
            : "Today's memory stays hidden for one year after the 10-minute cancellation period. Only unlocked memories appear here."}
        </Body>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  monthButtons: { flexDirection: "row", gap: spacing.sm },
  monthButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  arrow: { color: colors.primary, fontSize: 38, lineHeight: 40 },
  week: { flexDirection: "row" },
  weekLabel: { width: `${100 / 7}%`, textAlign: "center", color: colors.muted, fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, minHeight: 48, alignItems: "center", paddingTop: spacing.sm, borderRadius: 10 },
  selectedCell: { backgroundColor: colors.primarySoft },
  day: { color: colors.text },
  dots: { flexDirection: "row", gap: 3, marginTop: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  memoryPreview: { minHeight: 120, borderRadius: 14, overflow: "hidden" },
  memoryImage: { width: "100%", aspectRatio: 1, borderRadius: 14 },
  pressed: { opacity: 0.8 },
  error: { color: colors.danger },
});
