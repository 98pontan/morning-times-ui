import type { StockRow } from "../api/client";
import { formatPct, formatPrice, formatTurnover, sortRows } from "./market";

// Intl uses a narrow no-break space as thousands separator and U+2212 for minus in sv-SE.
const plain = (s: string) => s.replace(/[  ]/g, " ").replace(/−/g, "-");

test("Swedish number formats", () => {
  expect(plain(formatPrice(1234.5))).toBe("1 234,50");
  expect(plain(formatPct(2.314))).toBe("+2,31 %");
  expect(plain(formatPct(-0.5))).toBe("-0,50 %");
  expect(formatPct(null)).toBe("–");
  expect(plain(formatTurnover(12_345_678))).toBe("12,3 Mkr");
  expect(plain(formatTurnover(2.5e9, "USD"))).toBe("2,5 md USD");
});

test("sorting keeps rows without data last", () => {
  const row = (name: string, ytd: number | null): StockRow => ({ name, symbol: name, currency: "SEK", returns: { ytd } });
  const rows = [row("A", 5), row("B", null), row("C", 12)];
  expect(sortRows(rows, "ytd", "desc").map((r) => r.name)).toEqual(["C", "A", "B"]);
  expect(sortRows(rows, "ytd", "asc").map((r) => r.name)).toEqual(["A", "C", "B"]);
});
