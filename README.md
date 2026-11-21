# MoneyQuest

MoneyQuest is a gamified savings prototype built around small, practical money habits. It includes eight quests, rotating daily challenges, a weekly savings mission, achievements, XP and levels, daily check-ins and streaks, personal savings goals, completed quest history, and a downloadable CSV of progress.

The responsive interface uses React 19, TypeScript, Vite, Lucide icons, and custom CSS. A Hono application runs on Netlify Server. Netlify Database and Drizzle ORM persist the progress.

## Run locally

Use Node.js 24 or later and the Netlify CLI. Install dependencies with `npm install`, then run:

```sh
netlify dev --port 8889
```

Open the local address printed by the CLI. Use the Netlify development environment so the API and database integration are available; running Vite alone only serves the frontend. Database provisioning and migrations are managed by Netlify during deployment. The deploy build runs `npm run build` and publishes `dist`.

## How progress works

All visitors begin with zero savings and XP. Each 300 XP advances a level. A daily check-in earns 10 XP once per local calendar day; finishing a quest also performs that day's check-in. The four daily quests can be repeated on subsequent days. The other four can be completed once. Completion amounts are self-reported; the suggested savings are estimates.

Each day, three repeatable quests are featured as daily challenges. Completing a featured quest earns 25 bonus XP through the same quest run. The weekly mission counts logged quest savings and independent goal deposits toward $25 and starts fresh each Monday. Six achievement badges unlock automatically as you reach milestones, including milestones already recorded in your history.

Create a goal with a target and optional existing savings. Completing a quest can allocate that quest's savings to a goal. Additional goal deposits record new money set aside. Total savings counts completed quest savings and independent deposits once, even when quest savings are allocated to a goal.

History includes quest completions, daily check-ins, and goal deposits. The CSV contains labeled record types for the summary, quests, check-ins, goals, and deposits. Summary and goal rows show totals and should not be summed with the underlying activity rows.

## Browser-linked persistence

Progress is stored in Netlify Database. An opaque, HTTP-only browser cookie links the visitor to their own records, with no sign-in or bank connection. This is browser-linked persistence and requires a network connection; financial records are not stored in localStorage. Clearing cookies, opening a private session, or switching browsers starts a separate profile. CSV export provides a portable snapshot; import is outside the prototype scope.

## Schema changes

Update `db/schema.ts` and generate a migration with `npx drizzle-kit generate --name describe_your_change`. Keep migrations in `netlify/database/migrations`. Netlify applies them at deploy time; do not apply migrations manually.

## Version 2.1 privacy and feedback

The welcome dialog appears on the first visit with no saved progress. Closing it or exploring quests remembers the choice in that browser. Returning visitors can open **How it works** for a refresher.

Usage analytics are off by default and can be changed in **Privacy settings**. MoneyQuest honors Global Privacy Control and stores only UTC daily counts of opted-in visits and newly completed quests in `analytics_daily`. A tab session attempts to record at most one visit. Analytics contain no profile IDs, IP addresses, savings amounts, goals, or individual quest IDs. Quest completion analytics are best effort and never change progress. These counts measure opted-in activity, not unique users.

The in-app feedback form stores up to 1,000 characters per submission in `feedback`, with a submission ID and time. It does not attach the visitor’s profile or financial records. Authorized maintainers can review these two tables in the Netlify database. **Share app** shares the public MoneyQuest URL through the device’s share sheet or a copyable link.

## Version 2.2 owner dashboard

Open `/api/owner` on the configured MoneyQuest site and sign in with the owner access key. The dashboard reads the existing `analytics_daily` and `feedback` tables. Its default range is 30 UTC days through today, and filters support up to 366 days. Daily totals count recorded opted-in visits and opted-in quest completions. Feedback is listed newest first, with its submission time and message.

Each CSV export uses the selected UTC date range. Feedback exports support up to 10,000 submissions at a time. If the range contains more, narrow the dates. Spreadsheet formula-like feedback is prefixed with an apostrophe in CSVs. Treat downloaded feedback as private because people may include personal details in their messages.

After release approval, configure these Netlify runtime environment variables in the production deploy context and Functions scope:

- `MONEYQUEST_OWNER_ORIGIN` is the exact HTTPS origin used to open the dashboard, such as `https://moneyquest.example`, without a trailing slash.
- `MONEYQUEST_OWNER_KEY` is a randomly generated 64-character lowercase hexadecimal key. Generate it privately with `openssl rand -hex 32` and store it in a password manager and Netlify's environment variable settings.

The dashboard and its exports require that configuration and an owner session. Sessions expire after two hours. Sign-out clears the browser's session cookie. Rotate the access key to invalidate all issued sessions. The dashboard uses read-only queries and requires no database migration.

Run the owner route security checks with `node --experimental-test-module-mocks test/owner.test.mjs`. The tests exercise the Hono routes with mocked database results.
