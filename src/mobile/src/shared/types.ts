import { Language } from "./i18n";

export type Anniversary = {
  name: string;
  month: number;
  day: number;
  nextChangeAllowedOn?: string;
};

export type User = {
  id: string;
  displayName: string;
  email: string;
  membership: "free" | "premium";
  timezone: string;
  preferredLanguage: Language;
  anniversarySetupCompleted: boolean;
  anniversary?: Anniversary;
};

export type Media = { id: string; kind: "image" | "video"; contentType: string; byteSize: number; url: string };
export type Post = {
  id: string;
  caption?: string;
  occurredOn: string;
  unlockOn?: string;
  createdAt: string;
  cancelableUntil?: string;
  media: Media[];
};
export type CalendarDay = { date: string; count: number };
export type TodayStatus = { occurredOn: string; used: number; limit: number; isAnniversary: boolean; cancelablePosts: Post[] };
