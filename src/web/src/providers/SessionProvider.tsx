import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, type User } from "../shared/api/client";

type Session = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
};
const SessionContext = createContext<Session | null>(null);

/** ログイン中ユーザーを全ページへ提供するアプリケーション共通Provider。 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  return (
    <SessionContext.Provider value={{ user, loading, setUser }}>
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider is required.");
  return value;
}
