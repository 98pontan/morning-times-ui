import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { Layout } from "./components/Layout";
import { BriefPage, BriefsPage } from "./pages/BriefsPage";
import { SectionPage } from "./pages/SectionPage";
import { SectionSettingsPage } from "./pages/settings/SectionSettingsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { TodayPage } from "./pages/TodayPage";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: "s/:slug", element: <SectionPage /> },
      { path: "briefs", element: <BriefsPage /> },
      { path: "briefs/:day", element: <BriefPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "settings/sections/:id", element: <SectionSettingsPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
