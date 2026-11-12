import { Link, useParams } from "react-router";
import { useBrief, useBriefs } from "../api/hooks";
import { BriefView } from "../components/BriefView";
import { ErrorBox, Loading } from "../components/Layout";
import { longDate } from "../lib/format";

export function BriefsPage() {
  const briefs = useBriefs();
  return (
    <div>
      <h1 className="section-title">Arkiv</h1>
      {briefs.isPending && <Loading />}
      {briefs.error && <ErrorBox error={briefs.error} />}
      {briefs.data?.length === 0 && <p className="muted">Inga morgonbriefer än.</p>}
      <ul className="archive">
        {briefs.data?.map((b) => (
          <li key={b.date}>
            <Link to={`/briefs/${b.date}`}>
              <span className="kicker">{longDate(b.date)}</span>
              <span className="archive-headline">{b.data.content.headline}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BriefPage() {
  const { day = "" } = useParams();
  const brief = useBrief(day);
  return (
    <div className="narrow">
      <p>
        <Link to="/briefs">← Arkiv</Link>
      </p>
      {brief.isPending && <Loading />}
      {brief.error && <ErrorBox error={brief.error} />}
      {brief.data === null && <p className="muted">Ingen brief för {day}.</p>}
      {brief.data && <BriefView brief={brief.data} />}
    </div>
  );
}
