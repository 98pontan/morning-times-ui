// React Query hooks: caching, loading states and refetching after changes.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "./client";
import type { ChartRange, WarningLevel, SectionIn, SectionPatch, SourceIn, SourcePatch, WatchItemIn, WatchItemPatch } from "./client";

export const keys = {
  config: ["config"] as const,
  kinds: ["section-kinds"] as const,
  sections: ["sections"] as const,
  sources: (id: number) => ["sections", id, "sources"] as const,
  watchItems: (id: number) => ["sections", id, "watch-items"] as const,
  regions: (id: number) => ["sections", id, "regions"] as const,
  market: (id: number) => ["sections", id, "market"] as const,
  chart: (symbol: string, range: ChartRange) => ["chart", symbol, range] as const,
  weather: (id: number) => ["sections", id, "weather"] as const,
  warningAreas: (id: number) => ["sections", id, "warning-areas"] as const,
  articles: ["articles"] as const,
  briefs: ["briefs"] as const,
  alerts: ["alerts"] as const,
};

export const useConfig = () => useQuery({ queryKey: keys.config, queryFn: api.config });
export const useSectionKinds = () => useQuery({ queryKey: keys.kinds, queryFn: api.sectionKinds, staleTime: Infinity });
export const useSections = () => useQuery({ queryKey: keys.sections, queryFn: api.sections });
export const useSources = (sectionId: number) =>
  useQuery({ queryKey: keys.sources(sectionId), queryFn: () => api.sources(sectionId) });
export const useWatchItems = (sectionId: number) =>
  useQuery({ queryKey: keys.watchItems(sectionId), queryFn: () => api.watchItems(sectionId) });

/** Local editions for a regional section; pass undefined for other sections to skip the request. */
export const useRegions = (sectionId: number | undefined) =>
  useQuery({
    queryKey: keys.regions(sectionId ?? 0),
    queryFn: () => api.regions(sectionId!),
    enabled: sectionId != null,
  });

/** Stock screen for an economy section. Prices are ~15 min delayed and cached 2 min by the backend. */
export const useMarket = (sectionId: number) =>
  useQuery({ queryKey: keys.market(sectionId), queryFn: () => api.market(sectionId), refetchInterval: 2 * 60_000 });

export const useChart = (symbol: string | undefined, range: ChartRange) =>
  useQuery({
    queryKey: keys.chart(symbol ?? "", range),
    queryFn: () => api.chart(symbol!, range),
    enabled: !!symbol,
    refetchInterval: range === "1d" ? 2 * 60_000 : false,
    placeholderData: (previous) => previous, // keep the old line while a new range loads
  });

/** Forecasts and SMHI warnings for a weather section (cached ~10 min by the backend). */
export const useWeather = (sectionId: number) =>
  useQuery({ queryKey: keys.weather(sectionId), queryFn: () => api.weather(sectionId), refetchInterval: 10 * 60_000 });

/** SMHI counties and sea districts for a weather section; undefined skips the request. */
export const useWarningAreas = (sectionId: number | undefined) =>
  useQuery({
    queryKey: keys.warningAreas(sectionId ?? 0),
    queryFn: () => api.warningAreas(sectionId!),
    enabled: sectionId != null,
    staleTime: Infinity,
  });

export function useWarningAreaMutation(sectionId: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ areaId, ...body }: { areaId: number; enabled: boolean; levels?: WarningLevel[] }) =>
      api.setWarningArea(sectionId, areaId, body),
    // Areas are watch items, and the weather page shows warnings for the followed areas.
    onSuccess: () =>
      invalidate(keys.warningAreas(sectionId), keys.watchItems(sectionId), keys.weather(sectionId)),
  });
}

export const useArticles = (params: { section?: string; sourceId?: number; watchedOnly?: boolean; hours?: number }) =>
  useQuery({
    queryKey: [...keys.articles, params],
    queryFn: () => api.articles(params),
    refetchInterval: 5 * 60_000, // new articles arrive every 15 minutes
  });

export const useAlerts = () => useQuery({ queryKey: keys.alerts, queryFn: () => api.alerts(10), refetchInterval: 5 * 60_000 });
export const useBriefs = () => useQuery({ queryKey: keys.briefs, queryFn: () => api.briefs() });

/** The brief for a day, or the latest one. Resolves to null (not an error) when none exists yet. */
export const useBrief = (day?: string) =>
  useQuery({
    queryKey: [...keys.briefs, day ?? "latest"],
    queryFn: async () => {
      try {
        return day ? await api.brief(day) : await api.latestBrief();
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });

function useInvalidate() {
  const qc = useQueryClient();
  return (...queryKeys: readonly (readonly unknown[])[]) =>
    Promise.all(queryKeys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function useSectionMutations() {
  const invalidate = useInvalidate();
  // keys.sections is a prefix of every per-section query (sources, regions, market), so all refresh.
  const done = () => invalidate(keys.sections, keys.articles);
  return {
    create: useMutation({ mutationFn: (body: SectionIn) => api.createSection(body), onSuccess: done }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: number; body: SectionPatch }) => api.updateSection(id, body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.deleteSection(id), onSuccess: done }),
  };
}

export function useSourceMutations(sectionId: number) {
  const invalidate = useInvalidate();
  const done = () => invalidate(keys.sources(sectionId));
  return {
    create: useMutation({ mutationFn: (body: SourceIn) => api.createSource(sectionId, body), onSuccess: done }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: number; body: SourcePatch }) => api.updateSource(id, body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.deleteSource(id), onSuccess: done }),
  };
}

export function useWatchItemMutations(sectionId: number) {
  const invalidate = useInvalidate();
  // Changing watch items re-tags recent articles on the backend.
  const done = () => invalidate(keys.watchItems(sectionId), keys.articles, keys.market(sectionId));
  return {
    create: useMutation({ mutationFn: (body: WatchItemIn) => api.createWatchItem(sectionId, body), onSuccess: done }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: number; body: WatchItemPatch }) => api.updateWatchItem(id, body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.deleteWatchItem(id), onSuccess: done }),
  };
}

export function useRegionMutation(sectionId: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ slug, enabled }: { slug: string; enabled: boolean }) => api.setRegion(sectionId, slug, enabled),
    // A picked region is a new source, fetched at once by the backend.
    onSuccess: () => invalidate(keys.regions(sectionId), keys.sources(sectionId), keys.articles),
  });
}

export function useJobs() {
  const invalidate = useInvalidate();
  return {
    ingest: useMutation({ mutationFn: api.runIngest, onSuccess: () => invalidate(keys.articles, keys.sections) }),
    alerts: useMutation({ mutationFn: api.runAlerts, onSuccess: () => invalidate(keys.alerts, keys.articles) }),
    brief: useMutation({ mutationFn: () => api.generateBrief(false), onSuccess: () => invalidate(keys.briefs) }),
  };
}
