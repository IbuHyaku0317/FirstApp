import { Avatar } from "../components/atoms";
import { useLanguage } from "../providers/LanguageProvider";
import { useSession } from "../providers/SessionProvider";

export function ProfilePage() {
  const { user } = useSession();
  const { t } = useLanguage();
  return (
    <main className="narrow">
      <h1>{t.profile}</h1>
      <div className="profile-card">
        <Avatar name={user?.displayName ?? ""} large />
        <h2>{user?.displayName}</h2>
        <p>{user?.email}</p>
        <span className="badge">
          {user?.membership === "premium" ? t.premium : t.free}
        </span>
      </div>
    </main>
  );
}
