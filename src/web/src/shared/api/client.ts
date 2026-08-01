export type User = {
  id: string;
  displayName: string;
  email: string;
  membership: "free" | "premium";
  timezone: string;
};
export type Media = {
  id: string;
  kind: "image" | "video";
  contentType: string;
  byteSize: number;
  url: string;
};
export type Post = {
  id: string;
  caption?: string;
  occurredOn: string;
  createdAt: string;
  media: Media[];
};
export type Page<T> = { items: T[]; nextCursor?: string };

let accessToken: string | null = null;
export const setAccessToken = (value: string | null) => {
  accessToken = value;
};

function currentLanguage() {
  return localStorage.getItem("memory.language") === "en" ? "en" : "ja";
}

function englishError(status: number) {
  const errors: Record<number, string> = {
    400: "Please check the information you entered.",
    401: "Your email or password is incorrect, or your session has expired.",
    403: "You do not have permission to perform this action.",
    404: "The requested item was not found.",
    409: "This email address is not available.",
    413: "The selected file is too large.",
    415: "This media format is not supported.",
    429: "Too many requests. Please wait and try again.",
  };
  return errors[status] ?? "Communication failed. Please try again.";
}

/**
 * API通信を一箇所に集約する小さなHTTPクライアント。
 * アクセストークンはXSS対策のためlocalStorageへ保存せず、メモリだけに保持する。
 */
async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  const language = currentLanguage();
  headers.set("Accept-Language", language);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (!(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  let response = await fetch(`/api/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  // アクセストークンが期限切れなら、HttpOnly Cookieのリフレッシュトークンで一度だけ更新する。
  // retryフラグは、更新に失敗したときの無限ループを防ぐために使用する。
  if (response.status === 401 && retry && path !== "/auth/refresh") {
    const refreshed = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) {
      const data = await refreshed.json();
      setAccessToken(data.accessToken);
      return request(path, init, false);
    }
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    const validationMessage = Object.values(problem.errors ?? {})
      .flat()
      .find((value): value is string => typeof value === "string");
    const message =
      language === "en"
        ? englishError(response.status)
        : (problem.detail ??
          validationMessage ??
          problem.title ??
          "通信に失敗しました");
    throw new Error(message);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const api = {
  register: (body: object) =>
    request<{ accessToken: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: object) =>
    request<{ accessToken: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/me"),
  posts: (cursor?: string) =>
    request<Page<Post>>(
      `/posts${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    ),
  memories: () => request<Post[]>("/memories/on-this-day"),
  calendar: (year: number, month: number) =>
    request<{ date: string; count: number }[]>(`/calendar/${year}/${month}`),
  createPost: (data: FormData) =>
    request<Post>("/posts", { method: "POST", body: data }),
  deletePost: (id: string) =>
    request<void>(`/posts/${id}`, { method: "DELETE" }),
};
