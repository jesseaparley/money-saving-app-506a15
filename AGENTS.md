# MoneyQuest architecture

MoneyQuest is a React/Vite frontend with a Hono API on Netlify Server and a managed Postgres database. Use Node.js 24 or newer. This project intentionally does not use a full-stack framework or a catch-all rewrite; `/api/*` must reach the server and frontend assets are served from `dist`.

## Directories

- `src/main.tsx`: overview, quest library, goals, history, dialogs, application state, and CSV export.
- `src/styles.css`: custom responsive design, pastel icon palettes, transitions, and reduced-motion support.
- `shared/quests.ts`: the eight quest definitions, category and reward information, completion steps, and level names. The server and client share this source of truth.
- `db/schema.ts`: Drizzle table definitions for anonymous profiles, goals, quest runs, daily check-ins, and independent savings deposits.
- `db/index.ts`: Netlify Database Drizzle client.
- `netlify/server/index.mjs`: the single server entry point; exports the Hono app from `app.ts`.
- `netlify/server/app.ts`: browser isolation, input validation, transactional progress mutations, and progress reads.
- `netlify/database/migrations`: generated SQL migrations and schema snapshots.
- `public`: favicon and static assets.

## Conventions and decisions

Keep all monetary values in integer cents. Never trust client-provided XP, quest metadata, completion dates, or goal ownership. Read quest rewards from the shared definitions, derive dates on the server using the browser's IANA time zone, and scope every operation to the cookie-derived profile. Expose no profile identifiers in API responses. The opaque cookie is HTTP-only, SameSite Strict, and secure on HTTPS; only its SHA-256 digest is persisted.

Progress must persist in Netlify Database. Browser state contains the currently displayed snapshot, not a persistence fallback. A failed save must display an error and preserve form values. Success messages follow a successful server response. No bank integrations, authentication flow, real money transfers, or offline synchronization are included.

Daily runs use the local date as their unique period. One-time runs use `once`. A unique profile/quest/period index and conditional completion updates prevent duplicate XP. Check-ins have a composite primary key and are worth 10 XP; completed quests also create that day's check-in. XP and total savings are derived from records. Levels advance every 300 XP. Streaks retain yesterday's chain until the visitor misses a full day.

Goal creation and independent deposits use the modal's UUID as an idempotency key. Preserve that key when retrying a failed request. Quest savings allocated to a goal increment the goal balance but do not create a deposit; this avoids counting the same money twice in overall savings. Initial goal savings are independent deposits.

The server imports erasable TypeScript through explicit `.ts` paths, which Node.js 24 supports natively. Keep the server entry as `index.mjs`, avoid runtime TypeScript features that need transpilation, and do not add another entry file. Keep Drizzle ORM and Kit on the `beta` tag required by the Netlify Database adapter. Schema changes need a corresponding generated migration; let Netlify apply it.

Use native dialogs for focus containment, Escape dismissal, and focus restoration. Keep labels, visible focus styles, reduced-motion behavior, and all four screen widths working. Financial state starts empty; do not seed fake accomplishments or balances. SVG art and Lucide icons keep the interface self-contained. Fonts use Google Fonts with a sans-serif fallback.

## Development

Install with `npm install`. Use `netlify dev --port 8889` for the frontend and API together. Deployment runs the Vite build and automatically applies pending database migrations. Do not run local build, start, or test commands during automated Netlify agent runs; review edited files and leave validation to the build pipeline.
