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
