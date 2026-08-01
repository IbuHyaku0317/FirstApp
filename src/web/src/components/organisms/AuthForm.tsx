import { useState, type FormEvent } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useLanguage } from "../../providers/LanguageProvider";
import { useSession } from "../../providers/SessionProvider";
import { api, setAccessToken } from "../../shared/api/client";
import { Button } from "../atoms";
import { ErrorMessage, FormField } from "../molecules";

export function AuthForm({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const { setUser } = useSession();
  const { t } = useLanguage();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const displayName = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    // Safariなどブラウザ固有の文言を使わず、選択中の言語で検証結果を表示する。
    if (!email || !password || (register && !displayName)) {
      setError(t.requiredFields);
      setBusy(false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.invalidEmail);
      setBusy(false);
      return;
    }
    if (password.length < 10) {
      setError(t.passwordTooShort);
      setBusy(false);
      return;
    }
    if (displayName.length > 80) {
      setError(t.displayNameTooLong);
      setBusy(false);
      return;
    }

    try {
      const result = register
        ? await api.register({
            displayName,
            email,
            password,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        : await api.login({
            email,
            password,
          });
      setAccessToken(result.accessToken);
      setUser(result.user);
      navigate("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <h2>{register ? t.createAccount : t.welcomeBack}</h2>
      <p className="muted">{register ? t.registerLead : t.loginLead}</p>
      {register && (
        <FormField
          label={t.displayName}
          name="name"
          maxLength={80}
          required
          autoComplete="name"
        />
      )}
      <FormField
        label={t.email}
        name="email"
        type="email"
        required
        autoComplete="email"
      />
      <FormField
        label={t.password}
        name="password"
        type="password"
        minLength={10}
        required
        autoComplete={register ? "new-password" : "current-password"}
      />
      <ErrorMessage>{error}</ErrorMessage>
      <Button disabled={busy}>
        {busy ? t.sending : register ? t.start : t.login}
      </Button>
      <p className="switch">
        {register ? t.registered : t.firstTime}{" "}
        <NavLink to={register ? "/login" : "/register"}>
          {register ? t.login : t.register}
        </NavLink>
      </p>
    </form>
  );
}
