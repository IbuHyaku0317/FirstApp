import { Platform } from "react-native";
import { Language } from "./i18n";
import { Anniversary, CalendarDay, Post, TodayStatus, User } from "./types";
import { Session, sessionStore } from "./session";

const fallbackHost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? `http://${fallbackHost}:5080/api/v1`;
export const resolveMediaUrl = (url: string) => url.startsWith("http") ? url : `${apiBaseUrl.replace(/\/api\/v1$/, "")}${url}`;

type Problem = { detail?: string; title?: string; errors?: Record<string, string[]> };
type AuthResponse = { accessToken: string; refreshToken?: string; user: User };
export type DevelopmentClock = { utcNow: string; adjustable: boolean };

async function parseError(response: Response) {
  const problem = await response.json().catch(() => ({} as Problem)) as Problem;
  return problem.detail ?? Object.values(problem.errors ?? {}).flat()[0] ?? problem.title ?? `通信に失敗しました (${response.status})`;
}

async function request<T>(path: string, init: RequestInit = {}, session?: Session, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  // 認証前は画面で選択した言語を呼び出し元から指定できるようにする。
  // 認証後はユーザー設定の言語を既定値として利用する。
  if (!headers.has("Accept-Language")) {
    headers.set("Accept-Language", session?.user.preferredLanguage ?? "ja");
  }
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  if (response.status === 401 && retry && session?.refreshToken && path !== "/auth/refresh") {
    await refreshMobileSession(session);
    return request<T>(path, init, session, false);
  }
  if (!response.ok) throw new Error(await parseError(response));
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

let sessionRefresh: Promise<void> | null = null;

async function refreshMobileSession(session: Session) {
  // 複数画面が同時に401を受けても、ローテーション式リフレッシュトークンを
  // 二重使用しないよう、進行中の更新処理を全リクエストで共有する。
  if (sessionRefresh) return sessionRefresh;
  sessionRefresh = (async () => {
    if (!session.refreshToken) throw new Error("Session expired.");
    const refreshed = await request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }),
    }, undefined, false);
    session.accessToken = refreshed.accessToken;
    session.refreshToken = refreshed.refreshToken;
    await sessionStore.save(session);
  })();
  try { await sessionRefresh; }
  finally { sessionRefresh = null; }
}

function uploadPost(session: Session, data: FormData, onProgress: (percent: number) => void, signal?: AbortSignal, retry = true): Promise<Post> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiBaseUrl}/posts`);
    xhr.setRequestHeader("Authorization", `Bearer ${session.accessToken}`);
    xhr.setRequestHeader("Accept-Language", session.user.preferredLanguage);
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    xhr.onerror = () => reject(new Error("Communication failed. Please try again."));
    xhr.onabort = () => reject(new Error("UPLOAD_CANCELED"));
    xhr.onload = async () => {
      if (xhr.status === 401 && retry && session.refreshToken) {
        try { await refreshMobileSession(session); resolve(await uploadPost(session, data, onProgress, signal, false)); }
        catch (error) { reject(error); }
        return;
      }
      let body: unknown = undefined;
      try { body = xhr.responseText ? JSON.parse(xhr.responseText) : undefined; } catch { body = undefined; }
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(body as Post); return; }
      const problem = body as Problem | undefined;
      reject(new Error(problem?.detail ?? Object.values(problem?.errors ?? {}).flat()[0] ?? problem?.title ?? `Upload failed (${xhr.status})`));
    };
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(data);
  });
}

export const api = {
  register: (displayName: string, email: string, password: string, language: Language) => request<AuthResponse>("/auth/register", { method: "POST", headers: { "Accept-Language": language }, body: JSON.stringify({ displayName, email, password, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo", preferredLanguage: language, device: `android` }) }),
  login: (email: string, password: string, language: Language) => request<AuthResponse>("/auth/login", { method: "POST", headers: { "Accept-Language": language }, body: JSON.stringify({ email, password, device: "android" }) }),
  me: (session: Session) => request<User>("/me", {}, session),
  updateProfile: (session: Session, body: { displayName: string; preferredLanguage: Language; timezone: string }) => request<User>("/me", { method: "PATCH", body: JSON.stringify(body) }, session),
  deleteAccount: (session: Session) => request<void>("/me", { method: "DELETE" }, session),
  logout: (session: Session) => request<void>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }) }, session),
  setAnniversary: (session: Session, anniversary: { name: string; month: number; day: number } | null) => request<User>("/me/anniversary", { method: "PUT", body: JSON.stringify(anniversary ?? { skip: true }) }, session),
  anniversaryImpact: (session: Session) => request<{ affectedLockedSecondPosts: number }>("/me/anniversary/change-impact", {}, session),
  calendar: (session: Session, year: number, month: number) => request<CalendarDay[]>(`/calendar/${year}/${month}`, {}, session),
  day: (session: Session, date: string) => request<Post[]>(`/calendar/${date}`, {}, session),
  todayStatus: (session: Session) => request<TodayStatus>("/posts/today/status", {}, session),
  createPost: (session: Session, data: FormData, onProgress: (percent: number) => void = () => undefined, signal?: AbortSignal) => uploadPost(session, data, onProgress, signal),
  cancelPost: (session: Session, id: string) => request<void>(`/posts/${id}`, { method: "DELETE" }, session),
  developmentClock: (session: Session) => request<DevelopmentClock>("/development/clock", {}, session),
  setDevelopmentClock: (session: Session, utcNow: string) => request<DevelopmentClock>("/development/clock", { method: "PUT", body: JSON.stringify({ utcNow }) }, session),
  resetDevelopmentClock: (session: Session) => request<DevelopmentClock>("/development/clock", { method: "DELETE" }, session),
};
