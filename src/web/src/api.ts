export type User = { id: string; displayName: string; email: string; membership: 'free' | 'premium'; timezone: string };
export type Media = { id: string; kind: 'image' | 'video'; contentType: string; byteSize: number; url: string };
export type Post = { id: string; caption?: string; occurredOn: string; createdAt: string; media: Media[] };
export type Page<T> = { items: T[]; nextCursor?: string };

let accessToken: string | null = null;
export const setAccessToken = (value: string | null) => { accessToken = value; };

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers); if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`); if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let response = await fetch(`/api/v1${path}`, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && retry && path !== '/auth/refresh') { const refreshed = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' }); if (refreshed.ok) { const data = await refreshed.json(); setAccessToken(data.accessToken); return request(path, init, false); } }
  if (!response.ok) { const problem = await response.json().catch(() => ({})); throw new Error(problem.detail ?? problem.title ?? '通信に失敗しました'); }
  return response.status === 204 ? undefined as T : response.json();
}

export const api = {
  register: (body: object) => request<{accessToken:string; user:User}>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: object) => request<{accessToken:string; user:User}>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }), me: () => request<User>('/me'),
  posts: (cursor?: string) => request<Page<Post>>(`/posts${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  memories: () => request<Post[]>('/memories/on-this-day'),
  calendar: (year: number, month: number) => request<{date:string;count:number}[]>(`/calendar/${year}/${month}`),
  createPost: (data: FormData) => request<Post>('/posts', { method: 'POST', body: data }),
  deletePost: (id: string) => request<void>(`/posts/${id}`, { method: 'DELETE' })
};
