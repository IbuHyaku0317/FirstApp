import { NavLink, useNavigate } from "react-router-dom";
import { Avatar, TextButton } from "../atoms";
import { LanguageSwitch } from "../molecules/LanguageSwitch";
import { api, setAccessToken } from "../../shared/api/client";
import { useLanguage } from "../../providers/LanguageProvider";
import { useSession } from "../../providers/SessionProvider";

export function AppHeader() {
  const { user, setUser } = useSession();
  const { t } = useLanguage();
  const navigate = useNavigate();

  async function logout() {
    await api.logout();
    setAccessToken(null);
    setUser(null);
    navigate("/login");
  }

  return (
    <header>
      <NavLink className="logo" to="/">
        Memory<span>●</span>
      </NavLink>
      <nav>
        <NavLink to="/">{t.home}</NavLink>
        <NavLink to="/calendar">{t.calendar}</NavLink>
        <NavLink to="/memories/today">{t.onThisDay}</NavLink>
      </nav>
      <div className="profile">
        <LanguageSwitch />
        <Avatar name={user?.displayName ?? ""} />
        <TextButton onClick={logout}>{t.logout}</TextButton>
      </div>
    </header>
  );
}
