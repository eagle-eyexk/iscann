# WhiteHat Web Scanner

Ethical AI-powered website security analyzer. Users submit a URL they own; backend runs safe passive checks; Anthropic AI summarizes weaknesses + remediation.

## Architecture

- **Frontend** (`artifacts/ethical-tester`): React + Vite, served at `/`. Uses generated React Query hooks from `@workspace/api-client-react`.
- **API server** (`artifacts/api-server`): Express 5, served at `/api`. Implements scan endpoints.
- **Database** (`lib/db`): Drizzle ORM + Postgres. Schema in `lib/db/src/schema/scans.ts`.
- **API contract** (`lib/api-spec/openapi.yaml`): Source of truth. Generates Zod schemas (`@workspace/api-zod`) and React Query hooks (`@workspace/api-client-react`) via `pnpm --filter @workspace/api-spec run codegen`.
- **Anthropic** (`lib/integrations-anthropic-ai`): Wraps Anthropic SDK with the Replit AI Integrations base URL/key.

## Endpoints

- `POST /api/scan` — runs a scan, persists, returns full ScanReport.
- `GET /api/scan/recent` — most recent 20 scans (summary).
- `GET /api/scan/stats` — aggregate stats (total, average score, grade distribution, top issues, severity totals).
- `GET /api/scan/:id` — fetch full stored report.

## Scanner modules (`artifacts/api-server/src/lib/scanner/`)

- `fetch.ts` — manual redirect-following HTTP fetch with HTTP→HTTPS detection.
- `headers.ts` — security header rules (HSTS, CSP, X-Frame-Options, etc.) + info-leak detection.
- `cookies.ts` — Secure/HttpOnly/SameSite checks on Set-Cookie headers.
- `tls.ts` — TLS protocol/cipher/cert inspection via `node:tls`.
- `dns.ts` — A/AAAA/MX/NS/TXT/CAA + SPF/DMARC presence via `node:dns` + `psl` for apex.
- `exposed.ts` — probes a curated list of sensitive paths (.env, .git, etc.).
- `content.ts` — HTML inspection (mixed content, comments, emails) + tech fingerprinting + robots.txt.
- `scoring.ts` — severity-weighted score → letter grade.
- `ai.ts` — Anthropic Sonnet 4.6 generates exec summary + prioritized remediation. Falls back gracefully if the AI call fails.
- `index.ts` — orchestrator: normalizes URL, blocks private hosts, runs all checks (parallel where safe), composes ScanReport.

## DB schema

`scansTable` stores `url`, `finalUrl`, `host`, `scannedAt`, `durationMs`, `score`, `grade`, `statusCode`, severity counts, and the full JSON `report`.

## Dev notes

- Use `req.log` in route handlers; `logger` for non-request code.
- Express 5: `Promise<void>` async handlers, `res.status().json(); return;`.
- Anthropic env vars (`AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`) are managed by the platform.
- `psl` types are declared at `artifacts/api-server/src/types/psl.d.ts` because the published `psl` package's `exports` don't expose its types correctly.
- After OpenAPI changes: `pnpm --filter @workspace/api-spec run codegen`.
- After DB schema changes: `pnpm --filter @workspace/db run push`.
- Full typecheck: `pnpm run typecheck`.

## Ethical guardrails

- UI prominently displays: "Only scan properties you have permission to test."
- All checks are passive (no exploits, no auth probing, no aggressive payloads).
- Refuses to scan localhost / RFC1918 / link-local hosts.
