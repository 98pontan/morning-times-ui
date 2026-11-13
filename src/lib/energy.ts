// Formatting and constants for the electricity page.
import { parseDate } from "./format";

const TZ = "Europe/Stockholm";

export const ZONES = ["SE1", "SE2", "SE3", "SE4"] as const;

/** Production categories in a fixed order; colours are categorical slots 1-5 (see styles.css). */
export const PRODUCTION = [
  { key: "hydro", label: "Vattenkraft", color: "var(--series-1)" },
  { key: "nuclear", label: "Kärnkraft", color: "var(--series-2)" },
  { key: "wind", label: "Vindkraft", color: "var(--series-3)" },
  { key: "solar", label: "Solkraft", color: "var(--series-4)" },
  { key: "other", label: "Övrigt (kraftvärme m.m.)", color: "var(--series-5)" },
] as const;

/** Arrows to the neighbours: where they leave Sweden [lat, lon] and which way is "out" [dx, dy] in map units. */
export const NEIGHBOURS: Record<string, { at: [number, number]; dir: [number, number] }> = {
  Norge: { at: [61.2, 12.3], dir: [-1, 0] },
  Finland: { at: [66.2, 23.9], dir: [1, 0] },
  Danmark: { at: [56.05, 12.55], dir: [-1, 0.35] },
  Tyskland: { at: [55.35, 13.2], dir: [-0.2, 1] },
  Polen: { at: [55.95, 15.2], dir: [0.25, 1] },
  Litauen: { at: [56.75, 16.75], dir: [1, 0.15] },
};

export function formatMW(mw: number | null | undefined): string {
  if (mw == null) return "–";
  return Math.abs(mw) >= 1000
    ? `${(mw / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} GW`
    : `${Math.round(mw).toLocaleString("sv-SE")} MW`;
}

export function formatOre(value: number | null | undefined, digits = 0): string {
  return value == null ? "–" : `${value.toLocaleString("sv-SE", { maximumFractionDigits: digits, minimumFractionDigits: digits })} öre`;
}

export function clock(value: string): string {
  return parseDate(value).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

export function weekdayDate(value: string): string {
  return parseDate(value).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "numeric", timeZone: TZ });
}

export const LEVELS = {
  high: { icon: "▲", label: "Högre än vanligt" },
  normal: { icon: "●", label: "Normalt" },
  low: { icon: "▼", label: "Lägre än vanligt" },
} as const;
