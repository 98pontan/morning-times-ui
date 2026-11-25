import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { Layout } from "../components/Layout";
import { RequireEditor } from "../pages/settings/SettingsPage";
import { AuthContext, type AuthState } from "./auth";

const visitor: AuthState = {
  ready: true, enabled: true, user: null, canEdit: false, requiredGroup: "newspaper", version: "0.1.0",
  login: vi.fn(), logout: vi.fn(),
};
const member: AuthState = { ...visitor, user: { username: "anna", name: "Anna" }, canEdit: true };

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } })));
});

function renderAt(path: string, auth: AuthState) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<p>Start</p>} />
              <Route path="settings" element={<RequireEditor><p>Hemliga inställningar</p></RequireEditor>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

test("visitors see a login button instead of settings", () => {
  renderAt("/settings", visitor);
  expect(screen.queryByText("Hemliga inställningar")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Inställningar" })).not.toBeInTheDocument();
  expect(screen.getByText(/gruppen “newspaper”/)).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Logga in" })[0]);
  expect(visitor.login).toHaveBeenCalled();
  expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument(); // UI and server agree: shown once
  expect(screen.queryByText(/server/)).not.toBeInTheDocument();
});

test("logged-in members see settings, their name and a logout button", () => {
  renderAt("/settings", member);
  expect(screen.getByText("Hemliga inställningar")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Inställningar" })).toBeInTheDocument();
  expect(screen.getByText("Anna")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Logga ut" }));
  expect(member.logout).toHaveBeenCalled();
});
