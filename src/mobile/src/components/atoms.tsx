import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors, spacing } from "../shared/theme";

export function Title({ children }: { children: ReactNode }) { return <Text style={styles.title}>{children}</Text>; }
export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) { return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>; }
export function Field(props: TextInputProps) { return <TextInput placeholderTextColor={colors.locked} {...props} style={[styles.field, props.style]} />; }
export function Button({ label, onPress, disabled, secondary = false, danger = false, loading = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean; loading?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, danger && styles.danger, (disabled || loading) && styles.disabled, pressed && styles.pressed]}>{loading ? <ActivityIndicator color={secondary ? colors.primary : "white"} /> : <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>}</Pressable>;
}
export function Card({ children }: { children: ReactNode }) { return <View style={styles.card}>{children}</View>; }

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: "700", lineHeight: 36 },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted },
  field: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: 13, color: colors.text, fontSize: 16 },
  button: { minHeight: 50, borderRadius: 25, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  secondary: { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 },
  danger: { backgroundColor: colors.danger }, disabled: { opacity: 0.45 }, pressed: { opacity: 0.8 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 }, secondaryText: { color: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
});
