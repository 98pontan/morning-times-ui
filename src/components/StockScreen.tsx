// Avanza-style stock screen: the reference index (or a picked stock) in a chart, then a table of watched stocks.
import { useState } from "react";
import { Link } from "react-router";
import type { ChartRange, Section, StockRow } from "../api/client";
import { useChart, useMarket } from "../api/hooks";
import { formatPct, formatPrice, formatTurnover, sortRows, trend, type SortKey } from "../lib/market";
import { LineChart, Sparkline } from "./Charts";
import { ErrorBox, Loading } from "./Layout";

const RANGES: { range: ChartRange; label: string }[] = [
  { range: "1d", label: "1 d" },
  { range: "1w", label: "1 v" },
  { range: "1m", label: "1 m" },
  { range: "3m", label: "3 m" },
  { range: "ytd", label: "i år" },
  { range: "1y", label: "1 år" },
  { range: "5y", label: "5 år" },
];

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "name", label: "Namn" },
  { key: "last", label: "Senast", className: "num" },
  { key: "change_pct", label: "Idag", className: "num" },
  { key: "1w", label: "1 v", className: "num hide-sm" },
  { key: "1m", label: "1 m", className: "num hide-sm" },
  { key: "ytd", label: "i år", className: "num" },
  { key: "1y", label: "1 år", className: "num hide-sm" },
  { key: "turnover", label: "Oms.", className: "num hide-sm" },
  { key: "earnings_date", label: "Rapport", className: "hide-sm" },
];

export function StockScreen({ section }: { section: Section }) {
  const market = useMarket(section.id);
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState<ChartRange>("1d");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

  if (market.isPending) return <Loading label="Hämtar kurser…" />;
  if (market.error) return <ErrorBox error={market.error} />;
  const { index, stocks, updated_at } = market.data;

  const focus: StockRow | null | undefined = stocks.find((s) => s.symbol === selected) ?? index ?? stocks[0];
  const rows = sort ? sortRows(stocks, sort.key, sort.dir) : stocks;
  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s?.key !== key ? { key, dir: key === "name" || key === "earnings_date" ? "asc" : "desc" }
      : s.dir === "desc" ? { key, dir: "asc" } : null, // third click: back to watch-list order
    );

  return (
    <section className="stock-screen" aria-label="Börsen">
      {focus && (
        <FocusCard
          row={focus}
          range={range}
          onRange={setRange}
          onBack={index && focus !== index ? () => setSelected(null) : undefined}
        />
      )}

      {stocks.length === 0 ? (
        <p className="muted">
          Du följer inga aktier än. <Link to={`/settings/sections/${section.id}`}>Lägg till aktier →</Link>
        </p>
      ) : (
        <div className="table-scroll">
          <table className="table stocks">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className={c.className}
                    aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <button className="sort" onClick={() => toggleSort(c.key)}>
                      {c.label}
                      {sort?.key === c.key && (sort.dir === "asc" ? " ▲" : " ▼")}
                    </button>
                  </th>
                ))}
                <th className="hide-xs">3 mån</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol} className={r.symbol === focus?.symbol ? "selected" : undefined}>
                  <td>
                    <button className="link stock-name" onClick={() => setSelected(r.symbol)} title="Visa i grafen">
                      {r.name}
                    </button>
                    <span className="muted small stock-symbol"> {r.symbol}</span>
                    {r.error && <div className="warn small">{r.error}</div>}
                  </td>
                  <td className="num">{formatPrice(r.last)}</td>
                  <td className={`num ${trend(r.change_pct)}`}>{formatPct(r.change_pct)}</td>
                  <td className={`num hide-sm ${trend(r.returns?.["1w"])}`}>{formatPct(r.returns?.["1w"])}</td>
                  <td className={`num hide-sm ${trend(r.returns?.["1m"])}`}>{formatPct(r.returns?.["1m"])}</td>
                  <td className={`num ${trend(r.returns?.ytd)}`}>{formatPct(r.returns?.ytd)}</td>
                  <td className={`num hide-sm ${trend(r.returns?.["1y"])}`}>{formatPct(r.returns?.["1y"])}</td>
                  <td className="num hide-sm">{formatTurnover(r.turnover, r.currency ?? "")}</td>
                  <td className="hide-sm nowrap">{r.earnings_date ?? "–"}</td>
                  <td className="spark-cell hide-xs">
                    <Sparkline values={r.spark ?? []} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        Uppdaterad {new Date(updated_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })} · Kurser
        från Yahoo Finance, fördröjda cirka 15 minuter. Klicka på en aktie för att se den i grafen.
      </p>
    </section>
  );
}

function FocusCard(props: { row: StockRow; range: ChartRange; onRange: (r: ChartRange) => void; onBack?: () => void }) {
  const { row, range } = props;
  const chart = useChart(row.symbol, range);
  const points = chart.data?.symbol === row.symbol ? chart.data.points : [];
  const first = points[0]?.close;
  const last = points[points.length - 1]?.close;
  // For "1 d" the day's change is vs yesterday's close, like the header; other ranges compare the first point.
  const periodChange = range === "1d" ? row.change_pct : first && last ? ((last - first) / first) * 100 : null;

  return (
    <div className="focus-card">
      <div className="focus-head">
        <div>
          <p className="kicker">
            {props.onBack ? (
              <button className="link" onClick={props.onBack}>
                ← Index
              </button>
            ) : (
              row.symbol
            )}
          </p>
          <h2>{row.name}</h2>
        </div>
        <div className="focus-price">
          <span className="focus-last">
            {formatPrice(row.last)} <small className="muted">{row.currency}</small>
          </span>
          <span className={trend(row.change_pct)}>
            {row.change != null && `${row.change > 0 ? "+" : ""}${formatPrice(row.change)} `}({formatPct(row.change_pct)}) idag
          </span>
        </div>
      </div>
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <button key={r.range} aria-pressed={range === r.range} onClick={() => props.onRange(r.range)}>
              {r.label}
            </button>
          ))}
        </div>
        {range !== "1d" && <span className={trend(periodChange)}>{formatPct(periodChange)} under perioden</span>}
        {row.high_52w != null && (
          <span className="muted small">
            52 v: {formatPrice(row.low_52w)} – {formatPrice(row.high_52w)}
          </span>
        )}
      </div>
      {chart.error ? (
        <ErrorBox error={chart.error} />
      ) : chart.isPending || chart.data?.symbol !== row.symbol ? (
        <div className="chart chart-empty muted">Laddar graf…</div>
      ) : (
        <LineChart
          points={points}
          intraday={range === "1d" || range === "1w"}
          currency={row.currency ?? ""}
          baseline={range === "1d" && row.last != null && row.change != null ? row.last - row.change : null}
        />
      )}
    </div>
  );
}
