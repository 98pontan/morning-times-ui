import { Link, useParams, useSearchParams } from "react-router";
import type { Section } from "../api/client";
import { useArticles, useRegionMutation, useRegions, useSections } from "../api/hooks";
import { ArticleList } from "../components/ArticleList";
import { ErrorBox, Loading } from "../components/Layout";
import { StockScreen } from "../components/StockScreen";

const RANGES = [
  { hours: 24, label: "Idag" },
  { hours: 72, label: "3 dagar" },
  { hours: 168, label: "Vecka" },
];

export function SectionPage() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const hours = Number(params.get("hours") ?? 24);
  const watchedOnly = params.get("watched") === "1";
  const sourceId = params.get("source") ? Number(params.get("source")) : undefined;

  const sections = useSections();
  const section = sections.data?.find((s) => s.slug === slug);
  const articles = useArticles({ section: slug, sourceId, hours, watchedOnly });

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <h1 className="section-title">{section?.name ?? slug}</h1>
      {section?.kind === "regional" && (
        <RegionBar section={section} sourceId={sourceId} onSelect={(id) => update("source", id == null ? null : String(id))} />
      )}
      {section?.kind === "economy" && <StockScreen section={section} />}
      {section?.kind === "economy" && <h2 className="sidebar-title">Nyheter</h2>}
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Tidsperiod">
          {RANGES.map((r) => (
            <button key={r.hours} aria-pressed={hours === r.hours} onClick={() => update("hours", String(r.hours))}>
              {r.label}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={watchedOnly} onChange={(e) => update("watched", e.target.checked ? "1" : null)} />
          Bara det jag följer
        </label>
      </div>
      {articles.isPending && <Loading />}
      {articles.error && <ErrorBox error={articles.error} />}
      {articles.data && <ArticleList articles={articles.data} />}
    </div>
  );
}

/** Filter a regional section by one of its picked regions, or pick another region on the spot. */
function RegionBar(props: { section: Section; sourceId?: number; onSelect: (sourceId: number | null) => void }) {
  const regions = useRegions(props.section.id);
  const setRegion = useRegionMutation(props.section.id);
  if (!regions.data) return regions.error ? <ErrorBox error={regions.error} /> : null;

  const picked = regions.data.filter((r) => r.enabled);
  const others = regions.data.filter((r) => !r.enabled);

  const add = async (slug: string) => {
    const region = await setRegion.mutateAsync({ slug, enabled: true });
    if (region.source_id != null) props.onSelect(region.source_id);
  };

  return (
    <>
      <div className="region-bar" role="group" aria-label="Region">
        <button className="pill" aria-pressed={props.sourceId == null} onClick={() => props.onSelect(null)}>
          Alla
        </button>
        {picked.map((r) => (
          <button
            key={r.slug}
            className="pill"
            title={r.covers}
            aria-pressed={props.sourceId === r.source_id}
            onClick={() => props.onSelect(r.source_id ?? null)}
          >
            {r.name}
          </button>
        ))}
        {others.length > 0 && (
          <select
            aria-label="Lägg till region"
            value=""
            disabled={setRegion.isPending}
            onChange={(e) => e.target.value && add(e.target.value)}
          >
            <option value="">{setRegion.isPending ? "Hämtar…" : "+ Lägg till region"}</option>
            {others.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name} ({r.covers})
              </option>
            ))}
          </select>
        )}
        <Link className="small" to={`/settings/sections/${props.section.id}`}>
          Hantera regioner
        </Link>
      </div>
      {setRegion.error && <ErrorBox error={setRegion.error} />}
    </>
  );
}
