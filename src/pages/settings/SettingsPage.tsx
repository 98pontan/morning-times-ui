import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import type { Section, SectionIn } from "../../api/client";
import { useConfig, useJobs, useSectionKinds, useSectionMutations, useSections } from "../../api/hooks";
import { ErrorBox, Loading } from "../../components/Layout";
import { shortDateTime } from "../../lib/format";

const JOB_NAMES: Record<string, string> = { ingest: "Hämta nyheter", alerts: "Kolla bevakningar", brief: "Morgonbrief" };

export function SettingsPage() {
  return (
    <div className="settings">
      <h1 className="section-title">Inställningar</h1>
      <StatusPanel />
      <SectionsPanel />
    </div>
  );
}

function StatusPanel() {
  const config = useConfig();
  const jobs = useJobs();
  if (config.isPending) return <Loading />;
  if (config.error) return <ErrorBox error={config.error} />;
  const { settings, summarizer } = config.data;
  const keyOk = settings.ai.provider === "claude" ? settings.ai.anthropic_api_key_available : settings.ai.gemini_api_key_available;

  return (
    <section className="panel">
      <h2>Status</h2>
      <dl className="status-grid">
        <dt>AI</dt>
        <dd>
          {summarizer === "rules" ? "Av (bara rubriker)" : summarizer}
          {settings.ai.provider !== "rules" && !keyOk && <span className="warn"> · API-nyckel saknas</span>}
        </dd>
        <dt>E-post</dt>
        <dd>
          {settings.email.enabled ? settings.email.recipients.join(", ") : "Av"}
          {settings.email.enabled && !settings.email.password_available && <span className="warn"> · lösenord saknas</span>}
        </dd>
        <dt>Morgonbrief</dt>
        <dd>
          {settings.scheduler.brief_time} ({settings.scheduler.timezone})
        </dd>
        {config.data.jobs.map((j) => (
          <FragmentRow key={j.id} label={JOB_NAMES[j.id] ?? j.id} value={j.next_run ? `nästa ${shortDateTime(j.next_run)}` : "–"} />
        ))}
      </dl>
      <div className="button-row">
        <button onClick={() => jobs.ingest.mutate()} disabled={jobs.ingest.isPending}>
          {jobs.ingest.isPending ? "Hämtar…" : "Hämta nyheter nu"}
        </button>
        <button onClick={() => jobs.alerts.mutate()} disabled={jobs.alerts.isPending}>
          {jobs.alerts.isPending ? "Kollar…" : "Kolla bevakningar nu"}
        </button>
        <button onClick={() => jobs.brief.mutate()} disabled={jobs.brief.isPending}>
          {jobs.brief.isPending ? "Skriver…" : "Skapa morgonbrief (utan mejl)"}
        </button>
      </div>
      {[jobs.ingest, jobs.alerts, jobs.brief].map((m, i) => (m.error ? <ErrorBox key={i} error={m.error} /> : null))}
      {jobs.ingest.data && <p className="muted">Hämtning klar: {String(jobs.ingest.data.new_articles)} nya artiklar.</p>}
    </section>
  );
}

function FragmentRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function SectionsPanel() {
  const sections = useSections();
  const kinds = useSectionKinds();
  const { create, update, remove } = useSectionMutations();
  const list = [...(sections.data ?? [])].sort((a, b) => a.position - b.position || a.id - b.id);

  // Swap positions with the neighbour; positions are renumbered so they stay unique.
  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const reordered = [...list];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await Promise.all(
      reordered.map((s, position) => (s.position === position ? null : update.mutateAsync({ id: s.id, body: { position } }))),
    );
  };

  const onDelete = (s: Section) => {
    if (confirm(`Ta bort sektionen "${s.name}" med alla källor, bevakningar och artiklar?`)) remove.mutate(s.id);
  };

  return (
    <section className="panel">
      <h2>Sektioner</h2>
      {sections.isPending && <Loading />}
      {sections.error && <ErrorBox error={sections.error} />}
      <table className="table">
        <thead>
          <tr>
            <th>Namn</th>
            <th>Typ</th>
            <th>Visas</th>
            <th>Ordning</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((s, i) => (
            <tr key={s.id}>
              <td>
                <Link to={`/settings/sections/${s.id}`}>{s.name}</Link>
              </td>
              <td className="muted">{s.kind}</td>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Visa ${s.name}`}
                  checked={s.enabled}
                  onChange={(e) => update.mutate({ id: s.id, body: { enabled: e.target.checked } })}
                />
              </td>
              <td className="nowrap">
                <button className="icon" aria-label="Flytta upp" disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button className="icon" aria-label="Flytta ner" disabled={i === list.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </button>
              </td>
              <td className="right">
                <button className="link danger" onClick={() => onDelete(s)}>
                  Ta bort
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(update.error || remove.error) && <ErrorBox error={update.error ?? remove.error} />}

      <NewSectionForm
        kinds={kinds.data?.map((k) => ({ kind: k.kind, description: k.description })) ?? []}
        nextPosition={list.length}
        onCreate={(body) => create.mutateAsync(body)}
        error={create.error}
      />
    </section>
  );
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function NewSectionForm(props: {
  kinds: { kind: string; description: string }[];
  nextPosition: number;
  onCreate: (body: SectionIn) => Promise<unknown>;
  error: Error | null;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("general");
  const description = props.kinds.find((k) => k.kind === kind)?.description;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await props.onCreate({ name, slug: slugify(name), kind, position: props.nextPosition, enabled: true });
    setName("");
  };

  return (
    <form className="inline-form" onSubmit={submit}>
      <h3>Ny sektion</h3>
      <label>
        Namn
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="t.ex. Teknik" />
      </label>
      <label>
        Typ
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {props.kinds.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.kind}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={!slugify(name)}>
        Lägg till
      </button>
      {description && <p className="muted hint">{description}</p>}
      {props.error && <ErrorBox error={props.error} />}
    </form>
  );
}
