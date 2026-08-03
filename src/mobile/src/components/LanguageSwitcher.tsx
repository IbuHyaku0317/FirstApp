import { Pressable, StyleSheet, Text, View } from "react-native";
import { Language } from "../shared/i18n";
import { colors } from "../shared/theme";

type Props = {
  language: Language;
  disabled?: boolean;
  onChange: (language: Language) => void;
};

/**
 * 全画面で共通利用する言語切り替え。
 * App直下に配置することで、認証画面や詳細画面でも同じ位置に表示される。
 */
export function LanguageSwitcher({ language, disabled = false, onChange }: Props) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={language === "ja" ? "表示言語" : "Display language"}
      style={styles.container}
    >
      <LanguageButton
        label="日本語"
        selected={language === "ja"}
        disabled={disabled}
        onPress={() => onChange("ja")}
      />
      <LanguageButton
        label="English"
        selected={language === "en"}
        disabled={disabled}
        onPress={() => onChange("en")}
      />
    </View>
  );
}

function LanguageButton({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected, disabled }}
      disabled={disabled || selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        selected && styles.selectedButton,
        pressed && styles.pressedButton,
      ]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  selectedButton: {
    backgroundColor: colors.primarySoft,
  },
  pressedButton: {
    opacity: 0.65,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  selectedLabel: {
    color: colors.primary,
    fontWeight: "700",
  },
});
