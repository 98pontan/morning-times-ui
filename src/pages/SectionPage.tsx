import { useParams, useSearchParams } from "react-router";
import { useArticles, useSections } from "../api/hooks";
import { ArticleList } from "../components/ArticleList";
import { ErrorBox, Loading } from "../components/Layout";

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

  const sections = useSections();
  const section = sections.data?.find((s) => s.slug === slug);
  const articles = useArticles({ section: slug, hours, watchedOnly });

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <h1 className="section-title">{section?.name ?? slug}</h1>
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
