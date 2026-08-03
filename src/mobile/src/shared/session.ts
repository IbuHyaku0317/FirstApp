import * as SecureStore from "expo-secure-store";
import { User } from "./types";

export type Session = { accessToken: string; refreshToken?: string; user: User };
const key = "one-year-memory.session";

export const sessionStore = {
  async restore(): Promise<Session | null> {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as Session; } catch { await SecureStore.deleteItemAsync(key); return null; }
  },
  async save(session: Session | null) {
    if (session) await SecureStore.setItemAsync(key, JSON.stringify(session));
    else await SecureStore.deleteItemAsync(key);
  },
};
