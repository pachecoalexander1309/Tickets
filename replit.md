# TicketCompare

TicketCompare helps people find live events and go directly to official Ticketmaster ticket pages.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `TICKETMASTER_API_KEY` — server-only Ticketmaster Discovery API key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/ticketcompare/src/App.tsx` — responsive search page and event result states
- `artifacts/ticketcompare/src/index.css` — TicketCompare theme and visual tokens
- `artifacts/api-server/src/routes/events.ts` — server-side Ticketmaster Discovery API proxy
- `artifacts/api-server/src/routes/tickets.ts` — server-side Tickets.dev sandbox discovery, captures, and normalization
- `lib/api-spec/openapi.yaml` — source of truth for the event search contract
- `lib/api-client-react/src/generated/` — generated typed client hooks

## Architecture decisions

- Keep Ticketmaster requests in the shared Express API server so the API key is never bundled into the browser.
- Return a small normalized event shape instead of exposing the full Ticketmaster response to the UI.
- Focus Blue Jays searches on Toronto using Ticketmaster's city filter.
- Keep Tickets.dev sandbox-only by requiring a `tk_test_` key and mark comparison responses as demo data.
- Do not display ticket prices or marketplace comparisons until real comparison sources are added.

## Product

- Search live events by artist, team, venue, city, or event name.
- Browse popular search shortcuts.
- View event date, optional start time, venue, city, and an official Ticketmaster link.
- Select an event to compare sandbox listings by marketplace, section, row, quantity, ticket price, fees, total price, currency, and listing URL.
- Sort comparison results by lowest total price, best value, or section.
- Show loading, empty, retry, and unavailable-service states.

## User preferences

- Keep the MVP focused and trustworthy; avoid invented prices and marketplace data.

## Gotchas

- Ticketmaster returns HTTP 401 when the configured key is rejected; update `TICKETMASTER_API_KEY` through Replit Secrets rather than putting it in frontend code.
- Tickets.dev has no separate sandbox hostname; sandbox behavior is selected by using a `tk_test_` key against the shared API host.
- After changing the API contract, regenerate the client with `pnpm --filter @workspace/api-spec run codegen`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
