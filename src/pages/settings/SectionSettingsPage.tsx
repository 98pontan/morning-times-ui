import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import type { Section, WatchItem, WatchItemIn } from "../../api/client";
import {
  useRegionMutation, useRegions, useSectionKinds, useSectionMutations, useSections, useSourceMutations, useSources,
  useWatchItemMutations, useWatchItems,
} from "../../api/hooks";
import { ErrorBox, Loading } from "../../components/Layout";
import { timeAgo } from "../../lib/format";

const TYPE_LABELS: Record<string, string> = { stock: "Aktie", team: "Lag", region: "Region", keyword: "Nyckelord" };
const SYMBOL_LABELS: Record<string, string> = {
  stock: "Ticker (Yahoo, t.ex. VOLV-B.ST)",
  team: "Sport/liga (t.ex. ishockey/SHL)",
};

const splitKeywords = (value: string) =>
  value
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

export function SectionSettingsPage() {
  const id = Number(useParams().id);
  const sections = useSections();
  const section = sections.data?.find((s) => s.id === id);

  if (sections.isPending) return <Loading />;
  if (sections.error) return <ErrorBox error={sections.error} />;
  if (!section) return <p>Sektionen finns inte. <Link to="/settings">Tillbaka</Link></p>;

  return (
    <div className="settings">
      <p>
        <Link to="/settings">← Inställningar</Link>
      </p>
      <h1 className="section-title">{section.name}</h1>
      <GeneralPanel section={section} />
      {section.kind === "regional" && <RegionsPanel section={section} />}
      <WatchItemsPanel section={section} />
      <SourcesPanel section={section} />
    </div>
  );
}

function GeneralPanel({ section }: { section: Section }) {
  const { update } = useSectionMutations();
  const [name, setName] = useState(section.name);
  const [threshold, setThreshold] = useState(String(section.settings.move_threshold_pct ?? 5));
  const [noticeDays, setNoticeDays] = useState(String(section.settings.earnings_notice_days ?? 1));
  const [indexSymbol, setIndexSymbol] = useState(String(section.settings.index_symbol ?? "^OMX"));
  const [indexName, setIndexName] = useState(String(section.settings.index_name ?? ""));
  useEffect(() => setName(section.name), [section.name]);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const settings =
      section.kind === "economy"
        ? {
            ...section.settings,
            move_threshold_pct: Number(threshold),
            earnings_notice_days: Number(noticeDays),
            index_symbol: indexSymbol.trim(),
            index_name: indexName.trim(),
          }
        : section.settings;
    update.mutate({ id: section.id, body: { name, settings } });
  };

  return (
    <section className="panel">
      <h2>Allmänt</h2>
      <form className="inline-form" onSubmit={save}>
        <label>
          Namn
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        {section.kind === "economy" && (
          <>
            <label>
              Larm vid kursrörelse (%)
              <input type="number" min="0.5" step="0.5" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </label>
            <label>
              Rapportlarm dagar innan
              <input type="number" min="0" max="14" value={noticeDays} onChange={(e) => setNoticeDays(e.target.value)} />
            </label>
            <label>
              Index i börsgrafen (Yahoo, tomt = inget)
              <input value={indexSymbol} onChange={(e) => setIndexSymbol(e.target.value)} placeholder="^OMX" />
            </label>
            <label>
              Indexets namn
              <input value={indexName} onChange={(e) => setIndexName(e.target.value)} placeholder="OMX Stockholm 30" />
            </label>
          </>
        )}
        <button type="submit" disabled={update.isPending}>
          Spara
        </button>
        {update.isSuccess && <span className="muted">Sparat</span>}
      </form>
      {update.error && <ErrorBox error={update.error} />}
    </section>
  );
}

function RegionsPanel({ section }: { section: Section }) {
  const regions = useRegions(section.id);
  const setRegion = useRegionMutation(section.id);

  return (
    <section className="panel">
      <h2>Regioner</h2>
      <p className="muted hint">
        Välj vilka av SVT:s lokalredaktioner som hamnar under {section.name}. En ny region hämtas direkt.
      </p>
      {regions.isPending && <Loading />}
      {regions.error && <ErrorBox error={regions.error} />}
      <ul className="region-grid">
        {regions.data?.map((r) => (
          <li key={r.slug}>
            <label>
              <input
                type="checkbox"
                checked={r.enabled ?? false}
                disabled={setRegion.isPending && setRegion.variables?.slug === r.slug}
                onChange={(e) => setRegion.mutate({ slug: r.slug, enabled: e.target.checked })}
              />
              <span>
                {r.name}
                <small>{r.covers}</small>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {setRegion.error && <ErrorBox error={setRegion.error} />}
    </section>
  );
}

function WatchItemsPanel({ section }: { section: Section }) {
  const items = useWatchItems(section.id);
  const kinds = useSectionKinds();
  const { create, update, remove } = useWatchItemMutations(section.id);
  const types = kinds.data?.find((k) => k.kind === section.kind)?.item_types ?? ["keyword"];

  return (
    <section className="panel">
      <h2>Det du följer</h2>
      <p className="muted hint">
        Artiklar som nämner namnet eller ett nyckelord märks och kan ge larm.
        {section.kind === "economy" && " Aktier larmar även vid stora kursrörelser och inför kvartalsrapporter."}
      </p>
      {items.isPending && <Loading />}
      {items.error && <ErrorBox error={items.error} />}
      <table className="table">
        <thead>
          <tr>
            <th>Namn</th>
            <th>Typ</th>
            <th>Nyckelord</th>
            <th>Aktiv</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.data?.map((item) => (
            <WatchItemRow
              key={item.id}
              item={item}
              onSave={(body) => update.mutate({ id: item.id, body })}
              onDelete={() => confirm(`Sluta följa ${item.name}?`) && remove.mutate(item.id)}
            />
          ))}
        </tbody>
      </table>
      {(update.error || remove.error) && <ErrorBox error={update.error ?? remove.error} />}
      <NewWatchItemForm types={types} onCreate={(body) => create.mutateAsync(body)} error={create.error} />
    </section>
  );
}

function WatchItemRow(props: {
  item: WatchItem;
  onSave: (body: { keywords?: string[]; enabled?: boolean; settings?: Record<string, unknown> }) => void;
  onDelete: () => void;
}) {
  const { item } = props;
  const [keywords, setKeywords] = useState(item.keywords.join(", "));
  const changed = keywords !== item.keywords.join(", ");
  return (
    <tr>
      <td>
        {item.name}
        {item.symbol && <span className="muted"> · {item.symbol}</span>}
        {item.settings.move_threshold_pct != null && (
          <span className="muted"> · ±{String(item.settings.move_threshold_pct)}%</span>
        )}
      </td>
      <td className="muted">{TYPE_LABELS[item.type] ?? item.type}</td>
      <td>
        <form
          className="row-form"
          onSubmit={(e) => {
            e.preventDefault();
            props.onSave({ keywords: splitKeywords(keywords) });
          }}
        >
          <input
            aria-label={`Nyckelord för ${item.name}`}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="kommaseparerade"
          />
          {changed && <button type="submit">Spara</button>}
        </form>
      </td>
      <td>
        <input
          type="checkbox"
          aria-label={`${item.name} aktiv`}
          checked={item.enabled}
          onChange={(e) => props.onSave({ enabled: e.target.checked })}
        />
      </td>
      <td className="right">
        <button className="link danger" onClick={props.onDelete}>
          Ta bort
        </button>
      </td>
    </tr>
  );
}

function NewWatchItemForm(props: {
  types: string[];
  onCreate: (body: WatchItemIn) => Promise<unknown>;
  error: Error | null;
}) {
  const [type, setType] = useState(props.types[0]);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [keywords, setKeywords] = useState("");
  const [threshold, setThreshold] = useState("");
  useEffect(() => setType(props.types[0]), [props.types]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await props.onCreate({
      type,
      name,
      symbol: symbol.trim() || null,
      keywords: splitKeywords(keywords),
      settings: type === "stock" && threshold ? { move_threshold_pct: Number(threshold) } : {},
      enabled: true,
    });
    setName("");
    setSymbol("");
    setKeywords("");
    setThreshold("");
  };

  return (
    <form className="inline-form" onSubmit={submit}>
      <h3>Följ något nytt</h3>
      <label>
        Typ
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {props.types.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </label>
      <label>
        Namn
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="t.ex. Atlas Copco" />
      </label>
      {SYMBOL_LABELS[type] && (
        <label>
          {SYMBOL_LABELS[type]}
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} required={type === "stock"} />
        </label>
      )}
      <label>
        Nyckelord
        <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="kommaseparerade, valfritt" />
      </label>
      {type === "stock" && (
        <label>
          Eget larm (%)
          <input type="number" min="0.5" step="0.5" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="sektionens" />
        </label>
      )}
      <button type="submit">Lägg till</button>
      {props.error && <ErrorBox error={props.error} />}
    </form>
  );
}

function SourcesPanel({ section }: { section: Section }) {
  const sources = useSources(section.id);
  const { create, update, remove } = useSourceMutations(section.id);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({ name, url, kind: "rss", enabled: true });
    setName("");
    setUrl("");
  };

  return (
    <section className="panel">
      <h2>Källor (RSS)</h2>
      {sources.isPending && <Loading />}
      {sources.error && <ErrorBox error={sources.error} />}
      <table className="table">
        <thead>
          <tr>
            <th>Namn</th>
            <th>Senast hämtad</th>
            <th>Aktiv</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sources.data?.map((s) => (
            <tr key={s.id}>
              <td>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
                {s.last_error && <div className="warn small">{s.last_error}</div>}
              </td>
              <td className="muted">{s.last_fetched_at ? timeAgo(s.last_fetched_at) : "aldrig"}</td>
              <td>
                <input
                  type="checkbox"
                  aria-label={`${s.name} aktiv`}
                  checked={s.enabled}
                  onChange={(e) => update.mutate({ id: s.id, body: { enabled: e.target.checked } })}
                />
              </td>
              <td className="right">
                <button className="link danger" onClick={() => confirm(`Ta bort ${s.name}?`) && remove.mutate(s.id)}>
                  Ta bort
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(update.error || remove.error) && <ErrorBox error={update.error ?? remove.error} />}
      <form className="inline-form" onSubmit={submit}>
        <h3>Ny källa</h3>
        <label>
          Namn
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="t.ex. SVT Nyheter" />
        </label>
        <label className="grow">
          RSS-adress
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://…/rss.xml" />
        </label>
        <button type="submit">Lägg till</button>
        {create.error && <ErrorBox error={create.error} />}
      </form>
    </section>
  );
}
