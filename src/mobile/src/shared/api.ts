import { Platform } from "react-native";
import { Language } from "./i18n";
import { Anniversary, CalendarDay, Post, TodayStatus, User } from "./types";
import { Session, sessionStore } from "./session";

const fallbackHost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? `http://${fallbackHost}:5080/api/v1`;
export const resolveMediaUrl = (url: string) => url.startsWith("http") ? url : `${apiBaseUrl.replace(/\/api\/v1$/, "")}${url}`;

type Problem = { detail?: string; title?: string; errors?: Record<string, string[]> };
type AuthResponse = { accessToken: string; refreshToken?: string; user: User };

async function parseError(response: Response) {
  const problem = await response.json().catch(() => ({} as Problem)) as Problem;
  return problem.detail ?? Object.values(problem.errors ?? {}).flat()[0] ?? problem.title ?? `通信に失敗しました (${response.status})`;
}

async function request<T>(path: string, init: RequestInit = {}, session?: Session, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept-Language", session?.user.preferredLanguage ?? "ja");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  if (response.status === 401 && retry && session?.refreshToken && path !== "/auth/refresh") {
    const refreshed = await request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    }, undefined, false);
    session.accessToken = refreshed.accessToken;
    session.refreshToken = refreshed.refreshToken;
    await sessionStore.save(session);
    return request<T>(path, init, session, false);
  }
  if (!response.ok) throw new Error(await parseError(response));
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export const api = {
  register: (displayName: string, email: string, password: string, language: Language) => request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ displayName, email, password, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo", preferredLanguage: language, device: `android` }) }),
  login: (email: string, password: string) => request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password, device: "android" }) }),
  me: (session: Session) => request<User>("/me", {}, session),
  logout: (session: Session) => request<void>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }) }, session),
  setAnniversary: (session: Session, anniversary: { name: string; month: number; day: number } | null) => request<User>("/me/anniversary", { method: "PUT", body: JSON.stringify(anniversary ?? { skip: true }) }, session),
  anniversaryImpact: (session: Session) => request<{ affectedLockedSecondPosts: number }>("/me/anniversary/change-impact", {}, session),
  calendar: (session: Session, year: number, month: number) => request<CalendarDay[]>(`/calendar/${year}/${month}`, {}, session),
  day: (session: Session, date: string) => request<Post[]>(`/calendar/${date}`, {}, session),
  todayStatus: (session: Session) => request<TodayStatus>("/posts/today/status", {}, session),
  createPost: (session: Session, data: FormData) => request<Post>("/posts", { method: "POST", body: data }, session),
  cancelPost: (session: Session, id: string) => request<void>(`/posts/${id}`, { method: "DELETE" }, session),
};
