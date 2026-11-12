import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { SectionSettingsPage } from "./SectionSettingsPage";

const section = { id: 4, slug: "ekonomi", name: "Ekonomi", kind: "economy", enabled: true, position: 0, settings: { move_threshold_pct: 5 } };
const items = [
  { id: 1, section_id: 4, type: "stock", name: "Volvo", symbol: "VOLV-B.ST", keywords: [], settings: {}, enabled: true },
  { id: 2, section_id: 4, type: "stock", name: "Saab", symbol: "SAAB-B.ST", keywords: [], settings: { move_threshold_pct: 4, note: "x" }, enabled: true },
  { id: 3, section_id: 4, type: "keyword", name: "Riksbanken", symbol: null, keywords: [], settings: {}, enabled: true },
];
const patches: { url: string; body: unknown }[] = [];

beforeEach(() => {
  patches.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") patches.push({ url, body: JSON.parse(String(init.body)) });
    const body = url.endsWith("/sections") ? [section]
      : url.endsWith("/watch-items") ? items
      : url.endsWith("/section-kinds") ? [{ kind: "economy", description: "", item_types: ["keyword", "stock"] }]
      : url.includes("/watch-items/") ? items[0]
      : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
});

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/settings/sections/4"]}>
        <Routes>
          <Route path="/settings/sections/:id" element={<SectionSettingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("a stock's alert threshold can be changed or reset to the section default in place", async () => {
  renderPage();
  const volvo = await screen.findByLabelText("Larmgräns i procent för Volvo");
  const saab = screen.getByLabelText("Larmgräns i procent för Saab");
  expect(volvo).toHaveValue(null);
  expect(volvo).toHaveAttribute("placeholder", "5 (standard)");
  expect(saab).toHaveValue(4);
  expect(screen.queryByLabelText("Larmgräns i procent för Riksbanken")).not.toBeInTheDocument();

  fireEvent.change(volvo, { target: { value: "3.5" } });
  fireEvent.submit(volvo.closest("form")!);
  // Saab: clearing removes the override but keeps its other settings.
  fireEvent.change(saab, { target: { value: "" } });
  fireEvent.submit(saab.closest("form")!);

  await vi.waitFor(() => expect(patches).toHaveLength(2));
  expect(patches[0]).toEqual({ url: "/api/watch-items/1", body: { settings: { move_threshold_pct: 3.5 } } });
  expect(patches[1]).toEqual({ url: "/api/watch-items/2", body: { settings: { note: "x" } } });
});
