import type { Article } from "../api/client";
import { timeAgo } from "../lib/format";

export function ArticleList({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return <p className="muted">Inga artiklar här än.</p>;
  return (
    <ul className="articles">
      {articles.map((a) => {
        const watched = a.watched ?? [];
        return (
        <li key={a.id} className={watched.length ? "article watched" : "article"}>
          <a href={a.url} target="_blank" rel="noreferrer" className="article-title">
            {a.title}
          </a>
          {a.summary && <p className="article-summary">{a.summary}</p>}
          <p className="article-meta">
            {a.source && <span>{a.source}</span>}
            <time dateTime={a.published_at}>{timeAgo(a.published_at)}</time>
            {watched.map((w) => (
              <span key={w} className="chip">
                {w}
              </span>
            ))}
            {a.importance != null && (
              <span className={a.importance >= 7 ? "importance high" : "importance"} title={a.importance_reason ?? ""}>
                {a.importance}/10
              </span>
            )}
          </p>
        </li>
        );
      })}
    </ul>
  );
}
