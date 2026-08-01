import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  messages,
  type Language,
  type Translation,
} from "../shared/i18n/messages";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translation;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const storageKey = "memory.language";

function initialLanguage(): Language {
  const saved = localStorage.getItem(storageKey);
  if (saved === "ja" || saved === "en") return saved;
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(initialLanguage);
  const value = useMemo(
    () => ({
      language,
      setLanguage: (next: Language) => {
        localStorage.setItem(storageKey, next);
        document.documentElement.lang = next;
        updateLanguage(next);
      },
      t: messages[language],
    }),
    [language],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("LanguageProvider is required.");
  return value;
}
