# morning-times-ui

Frontend for [The Morning Times](../morning-times): read the daily brief and the news per
section, and configure sections, sources, stocks, teams and regions.

React 19 + Vite + TypeScript, React Router for pages and TanStack Query for API data.
In production it is a static build served by an unprivileged nginx that also proxies `/api`
to the backend, so the browser only ever talks to one origin (no CORS).

## Pages

| Path | What |
|---|---|
| `/` | Today's brief, recent alerts, and articles about what you follow |
| `/s/:slug` | Articles in a section (today / 3 days / week, optionally only followed items) |
| `/briefs`, `/briefs/:date` | Archive of earlier briefs |
| `/settings` | Status (AI, email, schedule), run jobs now, add/reorder/hide sections |
| `/settings/sections/:id` | Section name and alert thresholds, followed items, RSS sources |

## Development

Needs Node 24 (`sudo dnf install nodejs`) and the backend running on port 8080
(`python main.py` in the morning-times repo).

```bash
npm install
npm run dev        # http://localhost:5173, /api is proxied to http://localhost:8080
npm test           # vitest
npm run build      # type check + production build into dist/
```

Point the dev server at another backend with `BACKEND_URL=http://host:port npm run dev`.

### API types

`src/api/schema.d.ts` is generated from the backend's OpenAPI schema. After changing the API:

```bash
# in morning-times: export the schema
.venv/bin/python -c "import json; from src.app import create_app; from src.settings import Settings; \
  json.dump(create_app(Settings.model_validate({'scheduler': {'enabled': False}})).openapi(), open('../morning-times-ui/openapi.json', 'w'), indent=1)"
# here: regenerate the types, then fix whatever the type check reports
npm run api:types && npm run typecheck
```

TypeScript is pinned to 5.x because `openapi-typescript` uses the TypeScript 5 compiler API.

## Container

```bash
podman build -t morning-times-ui .
podman run -p 8080:8080 -e BACKEND_URL=http://host.containers.internal:8080 morning-times-ui
```

- `BACKEND_URL` (default `http://morning-times:80`, the backend Service in the same namespace).
- Runs as uid 101 on port 8080. `/healthz` reports the UI container's own health.
- nginx renders `/etc/nginx/templates/*.template` into `/etc/nginx/conf.d` at start, so with a
  read-only root filesystem mount an `emptyDir` at `/etc/nginx/conf.d` and `/tmp`.

## Security

The backend API has no login yet. Anyone who can reach the UI can change the configuration and
trigger jobs, so keep it on your private network (see `platform-apps/TODO.txt` in rke2-gitops
about Tailscale) until authentication is added.
