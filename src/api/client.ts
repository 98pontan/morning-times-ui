// Typed client for the morning-times backend. Types come from src/api/schema.d.ts,
// generated from the backend's OpenAPI schema with `npm run api:types`.
import type { components } from "./schema";

type Schemas = components["schemas"];
export type Section = Schemas["SectionOut"];
export type SectionIn = Schemas["SectionIn"];
export type SectionPatch = Schemas["SectionPatch"];
export type SectionKind = Schemas["SectionKindOut"];
export type Source = Schemas["SourceOut"];
export type SourceIn = Schemas["SourceIn"];
export type SourcePatch = Schemas["SourcePatch"];
export type WatchItem = Schemas["WatchItemOut"];
export type WatchItemIn = Schemas["WatchItemIn"];
export type WatchItemPatch = Schemas["WatchItemPatch"];
export type Article = Schemas["ArticleOut"];
export type Alert = Schemas["AlertOut"];
export type Brief = Omit<Schemas["BriefOut"], "data"> & { data: BriefData };

// Brief.data is a free-form dict in the API; this is the shape the backend stores.
export interface BriefData {
  content: {
    headline: string;
    intro: string;
    sections: {
      slug: string;
      title: string;
      summary: string;
      highlights: { article_id: number; text: string }[];
    }[];
  };
  articles: Record<string, { url: string; title: string; source: string }>;
  section_names: Record<string, string>;
}

export interface JobResult {
  [key: string]: unknown;
}

export interface AppConfig {
  summarizer: string;
  jobs: { id: string; next_run: string | null }[];
  settings: {
    ai: { provider: string; gemini_api_key_available: boolean; anthropic_api_key_available: boolean };
    email: { enabled: boolean; recipients: string[]; password_available: boolean };
    scheduler: { brief_time: string; timezone: string };
  };
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      const detail = body?.detail;
      message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : message;
    } catch {
      // not JSON: keep the status text
    }
    throw new ApiError(response.status, message);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: JSON.stringify(body ?? {}) });

export const api = {
  config: () => request<AppConfig>("/config"),
  sectionKinds: () => request<SectionKind[]>("/section-kinds"),

  sections: () => request<Section[]>("/sections"),
  section: (id: number) => request<Section>(`/sections/${id}`),
  createSection: (body: SectionIn) => request<Section>("/sections", json("POST", body)),
  updateSection: (id: number, body: SectionPatch) => request<Section>(`/sections/${id}`, json("PATCH", body)),
  deleteSection: (id: number) => request<void>(`/sections/${id}`, { method: "DELETE" }),

  sources: (sectionId: number) => request<Source[]>(`/sections/${sectionId}/sources`),
  createSource: (sectionId: number, body: SourceIn) =>
    request<Source>(`/sections/${sectionId}/sources`, json("POST", body)),
  updateSource: (id: number, body: SourcePatch) => request<Source>(`/sources/${id}`, json("PATCH", body)),
  deleteSource: (id: number) => request<void>(`/sources/${id}`, { method: "DELETE" }),

  watchItems: (sectionId: number) => request<WatchItem[]>(`/sections/${sectionId}/watch-items`),
  createWatchItem: (sectionId: number, body: WatchItemIn) =>
    request<WatchItem>(`/sections/${sectionId}/watch-items`, json("POST", body)),
  updateWatchItem: (id: number, body: WatchItemPatch) => request<WatchItem>(`/watch-items/${id}`, json("PATCH", body)),
  deleteWatchItem: (id: number) => request<void>(`/watch-items/${id}`, { method: "DELETE" }),

  articles: (params: { section?: string; watchedOnly?: boolean; hours?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.section) q.set("section", params.section);
    if (params.watchedOnly) q.set("watched_only", "true");
    q.set("hours", String(params.hours ?? 24));
    q.set("limit", String(params.limit ?? 100));
    return request<Article[]>(`/articles?${q}`);
  },

  briefs: (limit = 30) => request<Brief[]>(`/briefs?limit=${limit}`),
  latestBrief: () => request<Brief>("/briefs/latest"),
  brief: (day: string) => request<Brief>(`/briefs/${day}`),
  generateBrief: (send = false) => request<Brief>(`/briefs/generate?send=${send}`, { method: "POST" }),

  alerts: (limit = 20) => request<Alert[]>(`/alerts?limit=${limit}`),
  runIngest: () => request<JobResult>("/jobs/ingest", { method: "POST" }),
  runAlerts: () => request<JobResult>("/jobs/alerts", { method: "POST" }),
};
