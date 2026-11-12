// Number formatting and sorting for the stock screen (Swedish formats: "1 234,50", "+2,31 %").
import type { StockRow } from "../api/client";

const price = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });
const compact = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });

export const formatPrice = (value: number | null | undefined) => (value == null ? "–" : price.format(value));
export const formatPct = (value: number | null | undefined) => (value == null ? "–" : `${pct.format(value)} %`);

/** Turnover like Avanza: "850 tkr", "12,3 Mkr", "1,2 mdkr". The unit follows the currency (kr for SEK). */
export function formatTurnover(value: number | null | undefined, currency = "SEK"): string {
  if (value == null) return "–";
  const unit = currency === "SEK" || currency === "" ? "kr" : ` ${currency}`;
  if (value >= 1e9) return `${compact.format(value / 1e9)} md${unit}`;
  if (value >= 1e6) return `${compact.format(value / 1e6)} M${unit}`;
  return `${compact.format(value / 1e3)} t${unit}`;
}

/** "up" / "down" / "" for colouring a change. */
export const trend = (value: number | null | undefined) => (value == null || value === 0 ? "" : value > 0 ? "up" : "down");

export type SortKey = "name" | "last" | "change_pct" | "1w" | "1m" | "ytd" | "1y" | "turnover" | "earnings_date";

function sortValue(row: StockRow, key: SortKey): string | number | null | undefined {
  switch (key) {
    case "name":
      return row.name.toLocaleLowerCase("sv");
    case "1w":
    case "1m":
    case "ytd":
    case "1y":
      return row.returns?.[key];
    default:
      return row[key];
  }
}

/** Sorted copy; rows without a value always go last, whatever the direction. */
export function sortRows(rows: StockRow[], key: SortKey, dir: "asc" | "desc"): StockRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = sortValue(a, key);
    const y = sortValue(b, key);
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
    return (x < y ? -1 : x > y ? 1 : 0) * sign;
  });
}
