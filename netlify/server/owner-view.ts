import { html } from "hono/html";
import { ownerPath } from "./owner-security.ts";
import type { dateRange } from "./owner-security.ts";

type Day = { day: string; visits: number; completions: number };
type Entry = { message: string; createdAt: Date };

const number = new Intl.NumberFormat("en");
const timestamp = new Intl.DateTimeFormat("en", {
  dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
});

function layout(content: ReturnType<typeof html>) {
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MoneyQuest · Owner dashboard</title>
<style>
  :root { color-scheme: light; font: 100%/1.5 system-ui, sans-serif; color: #182f2b; background: #f3f7f4; }
  * { box-sizing: border-box; }
  body { margin: 0; }
  main { max-width: 68rem; margin: auto; padding: 1rem; }
  header, nav, .actions { display: flex; gap: .75rem; flex-wrap: wrap; align-items: center; justify-content: space-between; }
  h1 { font-size: clamp(1.75rem, 6vw, 2.6rem); margin: .25rem 0 1rem; line-height: 1.15; }
  h2, p { margin: 0 0 .75rem; }
  section, .card { background: #fff; border: 1px solid #d6e2da; border-radius: 1rem; padding: 1rem; margin: 1rem 0; }
  .login { max-width: 30rem; margin: 8vh auto 0; }
  .muted, time { color: #4c665e; }
  .brand { font-weight: 750; color: #175843; }
  .filters, .totals { display: grid; gap: .75rem; }
  label { display: grid; gap: .25rem; font-weight: 600; }
  input, button, .button { font: inherit; border-radius: .5rem; padding: .55rem .8rem; min-height: 44px; }
  input { width: 100%; min-width: 0; border: 1px solid #8da69a; color: inherit; background: #fff; }
  button, .button { display: inline-flex; align-items: center; border: 1px solid #175843; background: #175843; color: #fff; font-weight: 650; text-decoration: none; cursor: pointer; }
  .secondary { color: #175843; background: #fff; }
  :focus-visible { outline: 3px solid #2368bc; outline-offset: 3px; }
  .total { background: #e9f4ec; border-radius: .75rem; padding: .75rem 1rem; }
  .total strong { display: block; font-size: 1.9rem; }
  .table-wrap { overflow-x: auto; max-height: 28rem; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: .45rem .35rem; border-bottom: 1px solid #d6e2da; }
  thead th { position: sticky; top: 0; background: #fff; }
  tbody th { white-space: nowrap; font-weight: 500; }
  meter { display: block; width: 100%; max-width: 13rem; min-width: 1.5rem; }
  .feedback { list-style: none; padding: 0; }
  .feedback li { padding: .75rem 0; border-top: 1px solid #d6e2da; }
  .feedback p { white-space: pre-wrap; overflow-wrap: anywhere; margin: .35rem 0 0; }
  .error { color: #9d2626; }
  @media (min-width: 38rem) {
    main, section { padding: 1.5rem; }
    .filters { grid-template-columns: 1fr 1fr auto; align-items: end; }
    .totals { grid-template-columns: 1fr 1fr; }
  }
</style>
</head>
<body><main>${content}</main></body>
</html>`;
}

export function login(error?: string) {
  return layout(html`<section class="login">
    <p class="brand">MoneyQuest 2.2</p>
    <h1>Owner sign-in</h1>
    ${error ? html`<p class="error" role="alert">${error}</p>` : ""}
    <form action="${ownerPath}/login" method="post">
      <p><label>Owner access key
        <input name="key" type="password" autocomplete="current-password" maxlength="64" required>
      </label></p>
      <button type="submit">Sign in</button>
    </form>
  </section>`);
}

export function dashboard({ range, activity = [], entries = [], page = 1, next = false, error }: {
  range: NonNullable<ReturnType<typeof dateRange>>;
  activity?: Day[];
  entries?: Entry[];
  page?: number;
  next?: boolean;
  error?: string;
}) {
  const query = new URLSearchParams({ start: range.start, end: range.end }).toString();
  const totalVisits = activity.reduce((sum, day) => sum + day.visits, 0);
  const totalCompletions = activity.reduce((sum, day) => sum + day.completions, 0);
  const max = Math.max(1, ...activity.flatMap((day) => [day.visits, day.completions]));
  return layout(html`
    <header>
      <span class="brand">MoneyQuest 2.2</span>
      <form method="post" action="${ownerPath}/logout"><button class="secondary">Sign out</button></form>
    </header>
    <h1>Owner dashboard</h1>
    <section aria-label="Date filters">
      <form class="filters" method="get" action="${ownerPath}">
        <label>From (UTC)<input required type="date" name="start" value="${range.start}" max="${range.today}"></label>
        <label>Through (UTC)<input required type="date" name="end" value="${range.end}" max="${range.today}"></label>
        <button type="submit">Apply dates</button>
      </form>
    </section>
    ${error ? html`<p class="error" role="alert">${error}</p>` : html`
    <section>
      <div class="actions"><h2>Opted-in activity</h2>
      <a class="button secondary" href="${ownerPath}/export/activity?${query}">Export activity CSV</a></div>
      <p class="muted">Recorded events by UTC day. A visit represents an opted-in tab session. Today’s counts are in progress.</p>
      <div class="totals">
        <div class="total"><strong>${number.format(totalVisits)}</strong> Visits in range</div>
        <div class="total"><strong>${number.format(totalCompletions)}</strong> Quest completions in range</div>
      </div>
      <h3 id="daily-heading">Daily trends</h3>
      <div class="table-wrap" tabindex="0" role="region" aria-labelledby="daily-heading">
        <table>
          <thead><tr><th scope="col">UTC date</th><th scope="col">Visits</th><th scope="col">Quest completions</th></tr></thead>
          <tbody>${activity.map(({ day, visits, completions }) => html`<tr>
            <th scope="row"><time datetime="${day}">${day}</time></th>
            <td>${number.format(visits)}<meter aria-hidden="true" value="${visits}" max="${max}"></meter></td>
            <td>${number.format(completions)}<meter aria-hidden="true" value="${completions}" max="${max}"></meter></td>
          </tr>`)}</tbody>
        </table>
      </div>
    </section>
    <section id="feedback">
      <div class="actions"><h2>Anonymous feedback</h2>
      <a class="button secondary" href="${ownerPath}/export/feedback?${query}">Export feedback CSV</a></div>
      ${entries.length ? html`<ul class="feedback">${entries.map(({ message, createdAt }) => html`
        <li><time datetime="${createdAt.toISOString()}">${timestamp.format(createdAt)} UTC</time>
        <p>${message}</p></li>`)}</ul>` : html`<p class="muted">${page === 1 ? "No feedback in this date range." : "No feedback on this page."}</p>`}
      ${page > 1 || next ? html`<nav aria-label="Feedback pages">
        ${page > 1 ? html`<a class="button secondary" href="${ownerPath}?${query}&page=${page - 1}#feedback">Previous</a>` : ""}
        <span>Page ${page}</span>
        ${next ? html`<a class="button secondary" href="${ownerPath}?${query}&page=${page + 1}#feedback">Next</a>` : ""}
      </nav>` : ""}
    </section>`}
  `);
}
