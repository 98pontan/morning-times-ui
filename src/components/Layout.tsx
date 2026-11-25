import { NavLink, Outlet } from "react-router";
import { useSections } from "../api/hooks";
import { useAuth } from "../auth/auth";
import { longDate } from "../lib/format";

export function Layout() {
  const { data: sections } = useSections();
  const enabled = (sections ?? []).filter((s) => s.enabled);
  const auth = useAuth();

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-meta">
          <span>{longDate(new Date())}</span>
          <span className="masthead-actions">
            {auth.canEdit && (
              <NavLink to="/settings" className="masthead-settings">
                Inställningar
              </NavLink>
            )}
            {auth.enabled && auth.ready && (
              auth.user ? (
                <>
                  <span className="masthead-user" title={auth.user.username}>
                    {auth.user.name || auth.user.username}
                  </span>
                  <button className="link" onClick={auth.logout}>
                    Logga ut
                  </button>
                </>
              ) : (
                <button className="link" onClick={() => auth.login()}>
                  Logga in
                </button>
              )
            )}
          </span>
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
      <footer className="site-footer muted small">
        The Morning Times · v{__UI_VERSION__}
        {auth.version && auth.version !== __UI_VERSION__ && ` (server v${auth.version})`}
      </footer>
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
