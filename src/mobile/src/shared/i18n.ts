export type Language = "ja" | "en";

const messages = {
  ja: {
    appName: "一年後の自分へ",
    tagline: "今日をしまって、一年後にひらく。",
    signIn: "ログイン",
    signUp: "アカウント作成",
    displayName: "表示名",
    email: "メールアドレス",
    password: "パスワード（10文字以上）",
    calendar: "カレンダー",
    post: "投稿",
    profile: "プロフィール",
  },
  en: {
    appName: "To Myself in 1 Year",
    tagline: "Keep today. Open it one year later.",
    signIn: "Sign in",
    signUp: "Create account",
    displayName: "Display name",
    email: "Email",
    password: "Password (10+ characters)",
    calendar: "Calendar",
    post: "Post",
    profile: "Profile",
  },
} as const;

export const t = (language: Language, key: keyof (typeof messages)["ja"]) => messages[language][key];
