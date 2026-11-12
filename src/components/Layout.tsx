import { NavLink, Outlet } from "react-router";
import { useSections } from "../api/hooks";
import { longDate } from "../lib/format";

export function Layout() {
  const { data: sections } = useSections();
  const enabled = (sections ?? []).filter((s) => s.enabled);

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-meta">
          <span>{longDate(new Date())}</span>
          <NavLink to="/settings" className="masthead-settings">
            Inställningar
          </NavLink>
        </div>
        <NavLink to="/" className="masthead-title">
          The Morning Times
        </NavLink>
        <nav className="section-nav" aria-label="Sektioner">
          <NavLink to="/" end>
            Idag
          </NavLink>
          {enabled.map((s) => (
            <NavLink key={s.id} to={`/s/${s.slug}`}>
              {s.name}
            </NavLink>
          ))}
          <NavLink to="/briefs">Arkiv</NavLink>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export function Loading({ label = "Laddar…" }: { label?: string }) {
  return <p className="muted" role="status">{label}</p>;
}

export function ErrorBox({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="error" role="alert">
      Något gick fel: {message}
    </div>
  );
}
