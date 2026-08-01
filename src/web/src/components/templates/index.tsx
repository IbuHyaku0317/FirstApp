import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useLanguage } from "../../providers/LanguageProvider";
import { Eyebrow } from "../atoms";
import { LanguageSwitch } from "../molecules/LanguageSwitch";
import { AppHeader } from "../organisms/AppHeader";

// templatesは具体的なデータを取得せず、ページ共通の配置だけを定義する。
export function AppTemplate({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="app">
      <AppHeader />
      {children}
      <NavLink className="fab" to="/new" aria-label={t.newPost}>
        ＋
      </NavLink>
    </div>
  );
}

export function AuthTemplate({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <main className="auth-shell">
      <section className="brand-panel">
        <LanguageSwitch />
        <Eyebrow>YOUR DAYS, KEPT CLOSE</Eyebrow>
        <h1>Memory</h1>
        <p>{t.brandMessage}</p>
      </section>
      {children}
    </main>
  );
}

export function ContentTemplate({
  eyebrow,
  title,
  description,
  small = false,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="content">
      <div className={`hero ${small ? "small" : ""}`}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </main>
  );
}
