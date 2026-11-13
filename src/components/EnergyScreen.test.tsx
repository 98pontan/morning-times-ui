import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { EnergyOutlook, EnergyOverview, Section } from "../api/client";
import { formatMW, formatOre } from "../lib/energy";
import { EnergyScreen } from "./EnergyScreen";

const section: Section = { id: 8, slug: "el", name: "El", kind: "energy", enabled: true, position: 7, settings: { zone: "SE3" } };
const hours = (base: number) =>
  Array.from({ length: 24 }, (_, h) => ({ start: `2026-11-12T${String(h).padStart(2, "0")}:00:00Z`, price: base + h }));
const zone = (z: string, name: string, base: number) => ({
  zone: z, name, now: base + 5, today: hours(base), tomorrow: [], avg_today: base + 11.5, avg_tomorrow: null,
});
const overview: EnergyOverview = {
  zone: "SE3", nuclear_available: 3699, nuclear_capacity: 7012, updated_at: "2026-11-13T09:00:00+01:00", errors: [],
  zones: [zone("SE1", "Luleå", 10), zone("SE2", "Sundsvall", 12), zone("SE3", "Stockholm", 100), zone("SE4", "Malmö", 200)],
  live: {
    time: "2026-11-13T05:30:00Z", load: 23877, net_export: 5139.8, flows_time: null,
    production: { nuclear: 3667, hydro: 7523, wind: 11021, solar: 2, other: 1253 },
    flows: { Norge: 2869, Litauen: -461, Polen: 0 },
  },
  reactors: [
    { name: "Ringhals 4", capacity: 1134, available: 0, reason: "Delayed startup after yearly maintenance.", back_at: "2026-11-20T22:59:00Z", planned: true },
    { name: "Forsmark 2", capacity: 1121, available: 1121, reason: "", back_at: null, planned: true },
  ],
};
const outlook: EnergyOutlook = {
  zone: "SE3", headline: "Dyrt i början av veckan", text: "Det är kallt och vindstilla.", generator: "gemini",
  recent_price: 224.3, generated_at: "2026-11-13T08:00:00Z", errors: [],
  days: [
    { date: "2026-11-13", temperature: 2.7, normal_temperature: 3.5, wind: 4.7, nuclear_available: 3699, nuclear_out: ["Ringhals 4"], price: 105.6, level: "low", reasons: [] },
    { date: "2026-11-14", temperature: -6, normal_temperature: 3.5, wind: 2.1, nuclear_available: 3699, nuclear_out: ["Ringhals 4"], price: null, level: "high", reasons: [] },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const body = url.endsWith("/energy/outlook") ? outlook : url.endsWith("/energy") ? overview : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
});

const wrap = (ui: React.ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>
);

test("live map, prices per zone, weekly outlook and reactors", async () => {
  render(wrap(<EnergyScreen section={section} />));
  // Zone prices on the map, and flows to the neighbours with direction.
  const labels = await screen.findAllByText("105 öre"); // on the map, and as "now" in the price card
  expect(labels.some((el) => el.classList.contains("zone-price"))).toBe(true);
  expect(screen.getByText("Norge").closest("g")).toHaveTextContent("Norge2,9 GW");
  expect(screen.getByText("Litauen").closest("g")).toHaveClass("flow", "import");
  expect(screen.getByText("Polen").closest("g")).toHaveClass("idle");
  expect(screen.getByText("Nettoexport")).toBeInTheDocument();
  expect(screen.getByText("23,5 GW")).toBeInTheDocument(); // total production

  // The price card starts at the home zone; another zone can be picked.
  expect(screen.getByRole("heading", { name: /SE3 Stockholm/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "SE4" }));
  expect(screen.getByRole("heading", { name: /SE4 Malmö/ })).toBeInTheDocument();

  expect(await screen.findByRole("heading", { name: "Dyrt i början av veckan" })).toBeInTheDocument();
  expect(screen.getByText("Det är kallt och vindstilla.")).toBeInTheDocument();
  expect(screen.getByText("Högre än vanligt")).toBeInTheDocument();

  const row = screen.getByRole("row", { name: /Ringhals 4/ });
  expect(within(row).getByText("Ur drift")).toBeInTheDocument();
  expect(within(row).getByText(/fredag 20\/11|lördag 21\/11/)).toBeInTheDocument();
});

test("energy formatting", () => {
  expect(formatMW(3667)).toBe("3,7 GW");
  expect(formatMW(461)).toBe("461 MW");
  expect(formatOre(105.6)).toBe("106 öre");
});
