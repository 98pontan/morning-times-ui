import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { MarketOverview, Section } from "../api/client";
import { StockScreen } from "./StockScreen";

const section: Section = { id: 4, slug: "ekonomi", name: "Ekonomi", kind: "economy", enabled: true, position: 0, settings: {} };
const overview: MarketOverview = {
  updated_at: "2026-11-12T13:55:00+01:00",
  index: { name: "OMX Stockholm 30", symbol: "^OMX", currency: "", last: 3368.7, change: 8.7, change_pct: 0.26, returns: {}, spark: [] },
  stocks: [
    { name: "Volvo", symbol: "VOLV-B.ST", currency: "SEK", last: 324.3, change_pct: 0.37, returns: { ytd: 12.5 }, spark: [300, 324.3] },
    { name: "Saab", symbol: "SAAB-B.ST", currency: "SEK", last: 520, change_pct: -2.1, returns: { ytd: 40 }, spark: [] },
  ],
};
const chart = (symbol: string) => ({
  symbol, range: "1d",
  points: [{ t: "2026-11-12T09:00:00+01:00", close: 100 }, { t: "2026-11-12T13:55:00+01:00", close: 101 }],
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const body = url.includes("/market/chart") ? chart(new URL(url, "http://x").searchParams.get("symbol")!) : overview;
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
});

test("shows the index, the watched stocks, and switches the chart to a clicked stock", async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <StockScreen section={section} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByRole("heading", { name: "OMX Stockholm 30" })).toBeInTheDocument();
  expect(await screen.findByRole("img", { name: /Kurs från/ })).toBeInTheDocument();

  // "i år" is both a chart period and a column; sort by the column: Saab (+40 %) before Volvo (+12,5 %).
  const names = () => screen.getAllByRole("button", { name: /^(Volvo|Saab)$/ }).map((b) => b.textContent);
  expect(names()).toEqual(["Volvo", "Saab"]); // watch-list order
  fireEvent.click(within(screen.getByRole("columnheader", { name: "i år" })).getByRole("button"));
  expect(names()).toEqual(["Saab", "Volvo"]);

  fireEvent.click(screen.getByRole("button", { name: "Volvo" }));
  expect(await screen.findByRole("heading", { name: "Volvo" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "← Index" })).toBeInTheDocument();
});
