import { useLanguage } from "../../providers/LanguageProvider";

export function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="language-switch" aria-label={t.language}>
      <button
        type="button"
        className={language === "ja" ? "active" : ""}
        onClick={() => setLanguage("ja")}
      >
        日本語
      </button>
      <button
        type="button"
        className={language === "en" ? "active" : ""}
        onClick={() => setLanguage("en")}
      >
        English
      </button>
    </div>
  );
}
