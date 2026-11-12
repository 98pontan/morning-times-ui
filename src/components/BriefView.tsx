import type { Brief } from "../api/client";
import { longDate, shortDateTime } from "../lib/format";
import { formatMm, formatTemp, period } from "../lib/weather";

export function BriefView({ brief }: { brief: Brief }) {
  const { content, articles, section_names, weather } = brief.data;
  const places = (weather?.places ?? []).filter((p) => !p.error);
  return (
    <article className="brief">
      <p className="kicker">Morgonbrief · {longDate(brief.date)}</p>
      <h1 className="brief-headline">{content.headline}</h1>
      {content.intro && <p className="brief-intro">{content.intro}</p>}

      {weather && (places.length > 0 || weather.warnings.length > 0) && (
        <section className="brief-section brief-weather">
          <p className="kicker">Väder</p>
          {places.map((p) => (
            <p key={p.name}>
              <strong>{p.name}</strong>: {p.symbol_text}, {formatTemp(p.min_temp)} till {formatTemp(p.max_temp)}
              {p.precipitation ? `, ${formatMm(p.precipitation)} mm` : ""}
              {p.max_wind ? `, vind upp till ${Math.round(p.max_wind)} m/s` : ""}
            </p>
          ))}
          <ul className="warnings">
            {weather.warnings.map((w, i) => (
              <li key={i} className={`warning level-${w.level.toLowerCase()}`}>
                <strong>{w.level_name}</strong>: {w.event}, {w.area_name}{" "}
                <span className="muted small">{period(w.start, w.end)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {content.sections.map((section) => (
        <section key={section.slug} className="brief-section">
          <p className="kicker">{section_names[section.slug] ?? section.slug}</p>
          <h2>{section.title}</h2>
          {section.summary
            .split(/\n\s*\n/)
            .filter((p) => p.trim())
            .map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          {section.highlights.length > 0 && (
            <ul className="highlights">
              {section.highlights.map((h) => {
                const a = articles[String(h.article_id)];
                return (
                  <li key={h.article_id}>
                    {h.text}{" "}
                    {a && (
                      <a href={a.url} target="_blank" rel="noreferrer">
                        {a.source || "Läs"} →
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      <footer className="brief-footer muted">
        {brief.generator === "rules"
          ? "Rubrikerna utan AI-sammanfattning (AI var avstängd eller otillgänglig)."
          : `Skriven av ${brief.generator}.`}{" "}
        Skapad {shortDateTime(brief.created_at)}
        {brief.sent_at ? `, mejlad ${shortDateTime(brief.sent_at)}` : ", inte mejlad"}.
      </footer>
    </article>
  );
}
