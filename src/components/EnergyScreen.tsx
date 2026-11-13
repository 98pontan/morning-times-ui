// Electricity section: live map (zone prices, production, flows), price chart, weekly outlook and nuclear status.
import { useState, type PointerEvent } from "react";
import { Link } from "react-router";
import type { EnergyLive, EnergyOutlook, EnergyOverview, Reactor, Section, ZonePrices } from "../api/client";
import { useEnergy, useEnergyOutlook } from "../api/hooks";
import { LEVELS, NEIGHBOURS, PRODUCTION, ZONES, clock, formatMW, formatOre, weekdayDate } from "../lib/energy";
import { parseDate } from "../lib/format";
import { PRICE_BINS, ZONE_LABEL_AT, priceColor, zoneOf } from "../lib/scales";
import { project } from "../lib/swedenMap";
import { dayLabel, formatTemp } from "../lib/weather";
import { ErrorBox, Loading } from "./Layout";
import { MapLabel, SwedenMap } from "./SwedenMap";

const TZ = "Europe/Stockholm";

export function EnergyScreen({ section }: { section: Section }) {
  const energy = useEnergy(section.id);
  const outlook = useEnergyOutlook(section.id);
  const [zone, setZone] = useState<string | null>(null);
  if (energy.isPending) return <Loading label="Hämtar elpriser och produktion…" />;
  if (energy.error) return <ErrorBox error={energy.error} />;
  const data = energy.data;
  const selected = zone ?? data.zone;

  return (
    <section className="energy" aria-label="El">
      {(data.errors ?? []).map((e) => (
        <ErrorBox key={e} error={e} />
      ))}
      <LiveCard data={data} zone={selected} onZone={setZone} />
      <PriceCard zones={data.zones} zone={selected} onZone={setZone} home={data.zone} />
      {outlook.isPending && <Loading label="Skriver veckans elprognos…" />}
      {outlook.error && <ErrorBox error={outlook.error} />}
      {outlook.data && <OutlookCard outlook={outlook.data} />}
      <ReactorsCard reactors={data.reactors} available={data.nuclear_available} capacity={data.nuclear_capacity} />
      <p className="muted small">
        Spotpriser exkl. moms och avgifter från elprisetjustnu.se (Nord Pool). Produktion och flöden från energy-charts.info
        (Fraunhofer ISE, ENTSO-E), kärnkraftsstatus från Nord Pool UMM, väder från SMHI.{" "}
        <Link to={`/settings/sections/${section.id}`}>Byt elområde</Link>
      </p>
    </section>
  );
}

// ---- live map ---------------------------------------------------------------------------

function LiveCard(props: { data: EnergyOverview; zone: string; onZone: (z: string) => void }) {
  const { data } = props;
  const prices = Object.fromEntries(data.zones.map((z) => [z.zone, z]));
  const live = data.live;
  return (
    <div className="focus-card">
      <div className="focus-head">
        <div>
          <p className="kicker">Kraftläget just nu</p>
          <h2>Elpris och produktion</h2>
        </div>
        {live && (
          <span className="muted small">
            Produktion kl {clock(live.time)} (data kommer 1–2 h efter realtid)
          </span>
        )}
      </div>
      <div className="map-layout">
        <div className="map-box">
          <SwedenMap
            label="Spotpris per elområde"
            margin={[10, 125, 125, 125]}
            fill={(id) => priceColor(prices[zoneOf(id)]?.now)}
            countyClass={(id) => `zone-${zoneOf(id)} ${zoneOf(id) === props.zone ? "in-zone" : ""}`}
            title={(id) => `${zoneOf(id)} ${prices[zoneOf(id)]?.name ?? ""}: ${formatOre(prices[zoneOf(id)]?.now)}/kWh`}
            onSelect={(id) => props.onZone(zoneOf(id))}
          >
            {ZONES.map((z) => {
              const [x, y] = project(...ZONE_LABEL_AT[z]);
              return (
                <g key={z}>
                  <MapLabel x={x} y={y} className="zone-name">
                    {z}
                  </MapLabel>
                  <MapLabel x={x} y={y + 32} className="zone-price">
                    {prices[z]?.now != null ? `${Math.round(prices[z].now!)} öre` : "–"}
                  </MapLabel>
                </g>
              );
            })}
            {live && <FlowArrows flows={live.flows} />}
          </SwedenMap>
          <ul className="map-legend small" aria-label="Färgskala, spotpris öre/kWh">
            {PRICE_BINS.map((b) => (
              <li key={b.label}>
                <span className="swatch" style={{ background: b.color }} />
                {b.label}
              </li>
            ))}
          </ul>
          <p className="muted small">
            Spotpris denna timme, öre/kWh. Elområdenas gränser är ritade länsvis och ungefärliga. Pilarna visar flödet till
            och från grannländerna.
          </p>
        </div>
        <div className="map-details">{live ? <Production live={live} /> : <p className="muted">Ingen produktionsdata just nu.</p>}</div>
      </div>
    </div>
  );
}

function FlowArrows({ flows }: { flows: Record<string, number> }) {
  const L = 48;
  return (
    <g className="flows">
      {Object.entries(NEIGHBOURS).map(([country, { at, dir }]) => {
        const mw = flows[country];
        if (mw == null) return null;
        const [x, y] = project(...at);
        const n = Math.hypot(...dir);
        const [dx, dy] = [(dir[0] / n) * L, (dir[1] / n) * L];
        const idle = Math.abs(mw) < 50;
        // Export: from Sweden outwards. Import: from outside towards Sweden.
        const [x1, y1, x2, y2] = mw >= 0 ? [x, y, x + dx, y + dy] : [x + dx, y + dy, x, y];
        const lx = x + dx * 1.25;
        const ly = y + dy * 1.25 + (dy > 5 ? 22 : 6);
        const anchor = dx < -5 ? "end" : dx > 5 ? "start" : "middle";
        return (
          <g key={country} className={idle ? "flow idle" : mw >= 0 ? "flow export" : "flow import"}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={idle ? undefined : "url(#arrow)"} />
            <MapLabel x={lx} y={ly - 12} anchor={anchor} className="flow-label">
              {country}
            </MapLabel>
            <MapLabel x={lx} y={ly + 12} anchor={anchor} className="flow-label flow-value">
              {formatMW(Math.abs(mw))}
            </MapLabel>
            <title>{`${country}: ${idle ? "inget flöde" : mw >= 0 ? `export ${formatMW(mw)}` : `import ${formatMW(-mw)}`}`}</title>
          </g>
        );
      })}
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0L10,5L0,10Z" className="arrow-head" />
        </marker>
      </defs>
    </g>
  );
}

function Production({ live }: { live: EnergyLive }) {
  const total = PRODUCTION.reduce((sum, p) => sum + (live.production[p.key] ?? 0), 0);
  return (
    <div className="production">
      <h3 className="sidebar-title">Produktion i Sverige</h3>
      <p className="big-number">{formatMW(total)}</p>
      <div className="stack-bar" role="img" aria-label="Produktionsmix">
        {PRODUCTION.map((p) => {
          const mw = live.production[p.key] ?? 0;
          return mw > 0 ? <span key={p.key} style={{ width: `${(mw / total) * 100}%`, background: p.color }} title={`${p.label}: ${formatMW(mw)}`} /> : null;
        })}
      </div>
      <ul className="legend-list">
        {PRODUCTION.map((p) => {
          const mw = live.production[p.key] ?? 0;
          return (
            <li key={p.key}>
              <span className="swatch" style={{ background: p.color }} />
              <span>{p.label}</span>
              <span className="num">{formatMW(mw)}</span>
              <span className="num muted small">{total ? Math.round((mw / total) * 100) : 0} %</span>
            </li>
          );
        })}
      </ul>
      <dl className="status-grid energy-stats">
        <dt>Förbrukning</dt>
        <dd className="num">{formatMW(live.load)}</dd>
        <dt>{(live.net_export ?? 0) >= 0 ? "Nettoexport" : "Nettoimport"}</dt>
        <dd className="num">{formatMW(Math.abs(live.net_export ?? 0))}</dd>
      </dl>
    </div>
  );
}

// ---- price chart ------------------------------------------------------------------------

function PriceCard(props: { zones: ZonePrices[]; zone: string; home: string; onZone: (z: string) => void }) {
  const z = props.zones.find((x) => x.zone === props.zone) ?? props.zones[0];
  const points = [...(z?.today ?? []), ...(z?.tomorrow ?? [])];
  const all = points.map((p) => p.price);
  return (
    <div className="focus-card">
      <div className="focus-head">
        <div>
          <p className="kicker">Spotpris per timme</p>
          <h2>
            {z.zone} {z.name}
            {z.zone === props.home && <span className="muted small"> · ditt elområde</span>}
          </h2>
        </div>
        <div className="focus-price">
          <span className="focus-last">{formatOre(z.now)}</span>
          <span className="muted">per kWh denna timme</span>
        </div>
      </div>
      <div className="segmented" role="group" aria-label="Elområde">
        {ZONES.map((name) => (
          <button key={name} aria-pressed={name === z.zone} onClick={() => props.onZone(name)}>
            {name}
          </button>
        ))}
      </div>
      <dl className="price-stats">
        <div>
          <dt>Snitt idag</dt>
          <dd>{formatOre(z.avg_today)}</dd>
        </div>
        <div>
          <dt>Snitt imorgon</dt>
          <dd>{z.tomorrow?.length ? formatOre(z.avg_tomorrow) : <span className="muted small">kommer ca 13:00</span>}</dd>
        </div>
        <div>
          <dt>Lägst / högst</dt>
          <dd>{all.length ? `${Math.round(Math.min(...all))} / ${formatOre(Math.max(...all))}` : "–"}</dd>
        </div>
      </dl>
      <PriceBars points={points} />
    </div>
  );
}

function PriceBars({ points }: { points: { start: string; price: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return <p className="muted">Inga priser publicerade.</p>;
  const W = 1000;
  const H = 180;
  const max = Math.max(...points.map((p) => p.price), 1);
  const min = Math.min(0, ...points.map((p) => p.price));
  const y = (v: number) => 4 + (1 - (v - min) / (max - min)) * (H - 8);
  const bw = W / points.length;
  const hourNow = new Date();
  hourNow.setMinutes(0, 0, 0);
  const nowIndex = points.findIndex((p) => parseDate(p.start).getTime() === hourNow.getTime());
  const midnight = points.findIndex((p, i) => i > 0 && parseDate(p.start).toLocaleTimeString("sv-SE", { hour: "2-digit", timeZone: TZ }) === "00");
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setHover(Math.min(points.length - 1, Math.max(0, Math.floor(((e.clientX - box.left) / box.width) * points.length))));
  };
  const hovered = hover != null ? points[hover] : null;
  return (
    <div className="chart price-chart" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Spotpris per timme">
        {midnight > 0 && <line className="fc-grid" x1={midnight * bw} x2={midnight * bw} y1={0} y2={H} vectorEffect="non-scaling-stroke" />}
        {points.map((p, i) => (
          <rect
            key={p.start}
            className={`price-bar ${i === nowIndex ? "now" : ""} ${i === hover ? "hover" : ""}`}
            x={i * bw + 1}
            width={Math.max(bw - 2, 1)}
            y={Math.min(y(p.price), y(0))}
            height={Math.max(Math.abs(y(0) - y(p.price)), 1)}
          />
        ))}
      </svg>
      <span className="chart-label chart-max">{formatOre(max)}</span>
      <div className="chart-axis muted small">
        <span>{dayLabel(parseDate(points[0].start).toLocaleDateString("sv-SE", { timeZone: TZ }))}</span>
        {midnight > 0 && (
          <span style={{ position: "absolute", left: `${(midnight / points.length) * 100}%` }}>
            {dayLabel(parseDate(points[midnight].start).toLocaleDateString("sv-SE", { timeZone: TZ }))}
          </span>
        )}
        <span />
      </div>
      {hovered && (
        <div className="chart-tip" style={{ left: `${((hover! + 0.5) / points.length) * 100}%` }}>
          <strong>{formatOre(hovered.price, 1)}</strong>
          <span className="muted">
            {parseDate(hovered.start).toLocaleString("sv-SE", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ })}
          </span>
        </div>
      )}
    </div>
  );
}

// ---- weekly outlook ---------------------------------------------------------------------

function OutlookCard({ outlook }: { outlook: EnergyOutlook }) {
  return (
    <div className="focus-card outlook">
      <p className="kicker">Veckans elprognos · {outlook.zone}</p>
      <h2 className="outlook-headline">{outlook.headline}</h2>
      <p className="outlook-text">{outlook.text}</p>
      {(outlook.errors ?? []).map((e) => (
        <p key={e} className="warn small">
          {e}
        </p>
      ))}
      <ol className="outlook-days">
        {outlook.days.map((d) => (
          <li key={d.date} className={`outlook-day level-${d.level}`}>
            <strong className="outlook-day-name">{dayLabel(d.date)}</strong>
            <span className="level-badge">
              <span aria-hidden>{LEVELS[d.level].icon}</span> {LEVELS[d.level].label}
            </span>
            <span className="small">
              {formatTemp(d.temperature)} <span className="muted">(normalt {formatTemp(d.normal_temperature)})</span>
            </span>
            <span className="small">Vind {d.wind != null ? `${d.wind.toLocaleString("sv-SE")} m/s` : "–"}</span>
            <span className="small">Kärnkraft {formatMW(d.nuclear_available)}</span>
            {d.price != null && <span className="small strong">Spot {formatOre(d.price)}</span>}
          </li>
        ))}
      </ol>
      <p className="muted small">
        En indikation, ingen prisprognos: kyla höjer förbrukningen, blåst ger billig vindkraft och kärnkraften står för en stor
        del av baskraften. Vind är medelvind (10 m) där vindkraften finns, temperatur ett snitt för de stora städerna.
        {outlook.recent_price != null && ` Snittpriset senaste veckan var ${formatOre(outlook.recent_price)}/kWh.`} Text:{" "}
        {outlook.generator === "rules" ? "mall (ingen AI)" : outlook.generator}, {clock(outlook.generated_at)}.
      </p>
    </div>
  );
}

// ---- nuclear ----------------------------------------------------------------------------

function ReactorsCard(props: { reactors: Reactor[]; available: number; capacity: number }) {
  if (!props.reactors.length) return null;
  return (
    <div className="focus-card">
      <div className="focus-head">
        <div>
          <p className="kicker">Kärnkraft</p>
          <h2>
            {formatMW(props.available)} <span className="muted">av {formatMW(props.capacity)} tillgängligt</span>
          </h2>
        </div>
      </div>
      <div className="table-scroll">
        <table className="table reactors">
          <thead>
            <tr>
              <th>Reaktor</th>
              <th>Status</th>
              <th className="num">Tillgängligt</th>
              <th className="hide-sm">Orsak</th>
              <th>Åter i full drift</th>
            </tr>
          </thead>
          <tbody>
            {props.reactors.map((r) => {
              const share = r.available / r.capacity;
              const status = share > 0.95 ? "I drift" : share < 0.05 ? "Ur drift" : "Delvis";
              return (
                <tr key={r.name}>
                  <td className="nowrap">{r.name}</td>
                  <td className={`nowrap reactor-${status === "I drift" ? "on" : status === "Ur drift" ? "off" : "partial"}`}>
                    <span aria-hidden>{status === "I drift" ? "●" : status === "Ur drift" ? "○" : "◐"}</span> {status}
                  </td>
                  <td className="num">
                    {Math.round(r.available).toLocaleString("sv-SE")} / {r.capacity.toLocaleString("sv-SE")} MW
                  </td>
                  <td className="hide-sm small">{r.reason || (status === "I drift" ? "" : "–")}</td>
                  <td className="nowrap small">{r.back_at ? weekdayDate(r.back_at) : status === "I drift" ? "" : "okänt"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">Från anmälningar till Nord Pool (UMM). Datum för återstart flyttas ofta.</p>
    </div>
  );
}
