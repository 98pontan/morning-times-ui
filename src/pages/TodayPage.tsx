import { Link } from "react-router";
import { useAlerts, useArticles, useBrief, useJobs } from "../api/hooks";
import { ArticleList } from "../components/ArticleList";
import { BriefView } from "../components/BriefView";
import { ErrorBox, Loading } from "../components/Layout";
import { timeAgo } from "../lib/format";

export function TodayPage() {
  const brief = useBrief();
  const alerts = useAlerts();
  const watched = useArticles({ watchedOnly: true, hours: 24 });
  const jobs = useJobs();

  return (
    <div className="two-columns">
      <div>
        {brief.isPending && <Loading />}
        {brief.error && <ErrorBox error={brief.error} />}
        {brief.data === null && (
          <div className="empty">
            <h1>Ingen morgonbrief än</h1>
            <p>Den skapas automatiskt varje morgon. Du kan också skapa en nu från de senaste nyheterna.</p>
            <button onClick={() => jobs.brief.mutate()} disabled={jobs.brief.isPending}>
              {jobs.brief.isPending ? "Skriver…" : "Skapa dagens brief"}
            </button>
            {jobs.brief.error && <ErrorBox error={jobs.brief.error} />}
          </div>
        )}
        {brief.data && <BriefView brief={brief.data} />}
      </div>

      <aside className="sidebar">
        <h2 className="sidebar-title">Bevakningar</h2>
        {alerts.data?.length === 0 && <p className="muted">Inga larm.</p>}
        <ul className="alerts">
          {alerts.data?.map((a) => (
            <li key={a.id}>
              <strong>{a.subject}</strong>
              <span className="muted"> · {timeAgo(a.created_at)}</span>
            </li>
          ))}
        </ul>

        <h2 className="sidebar-title">Om det du följer</h2>
        {watched.isPending && <Loading />}
        {watched.data && <ArticleList articles={watched.data.slice(0, 8)} />}
        <p>
          <Link to="/settings">Ändra vad du följer →</Link>
        </p>
      </aside>
    </div>
  );
}
