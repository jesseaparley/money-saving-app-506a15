import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { getCookie, setCookie } from "hono/cookie";
import { and, asc, desc, gte, lte, lt } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { analyticsDaily, feedback } from "../../db/schema.ts";
import {
  cookieName, csv, dateRange, matchesKey, newSession, ownerConfig,
  ownerPath, sessionSeconds, validSession,
} from "./owner-security.ts";
import { dashboard, login } from "./owner-view.ts";

const owner = new Hono();
const cookie = { httpOnly: true, secure: true, sameSite: "Strict", path: ownerPath } as const;
const pageSize = 30;
const exportLimit = 10_000;

owner.use("*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  c.header("Netlify-CDN-Cache-Control", "no-store");
  c.header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Robots-Tag", "noindex, nofollow");

  const config = ownerConfig();
  if (!config || new URL(c.req.url).origin !== config.origin)
    return c.json({ error: "Not found." }, 404);
  if (c.req.method === "POST" && c.req.header("Origin") !== config.origin)
    return c.json({ error: "Request origin could not be verified." }, 403);

  const { path, method } = c.req;
  if ((path === ownerPath + "/login" && method === "POST") ||
      validSession(getCookie(c, cookieName) ?? "", config.key, config.origin)) {
    await next();
    return;
  }
  if (path === ownerPath && method === "GET") return c.html(login(), 401);
  return c.json({ error: "Owner sign-in required." }, 401);
});

owner.post("/login", bodyLimit({ maxSize: 1024 }), async (c) => {
  const body = await c.req.parseBody().catch(() => null);
  const key = body?.key;
  const config = ownerConfig();
  if (!config || typeof key !== "string" || !matchesKey(key, config.key))
    return c.html(login("The access key was incorrect."), 401);
  setCookie(c, cookieName, newSession(config.key, config.origin), {
    ...cookie, maxAge: sessionSeconds,
  });
  return c.redirect(ownerPath, 303);
});

owner.post("/logout", (c) => {
  setCookie(c, cookieName, "", { ...cookie, maxAge: 0 });
  return c.redirect(ownerPath, 303);
});

type Range = NonNullable<ReturnType<typeof dateRange>>;

async function daily(range: Range) {
  const rows = await db.select().from(analyticsDaily)
    .where(and(gte(analyticsDaily.day, range.start), lte(analyticsDaily.day, range.end)))
    .orderBy(asc(analyticsDaily.day));
  const counts = new Map(rows.map(({ day, metric, count }) => [`${day}/${metric}`, count]));
  return range.days.map((day) => ({
    day,
    visits: counts.get(`${day}/visit`) ?? 0,
    completions: counts.get(`${day}/quest_completion`) ?? 0,
  }));
}

function feedbackRows(range: Range, limit: number, offset = 0) {
  return db.select({ message: feedback.message, createdAt: feedback.createdAt })
    .from(feedback)
    .where(and(gte(feedback.createdAt, range.from), lt(feedback.createdAt, range.until)))
    .orderBy(desc(feedback.createdAt), desc(feedback.id))
    .limit(limit).offset(offset);
}

owner.get("/", async (c) => {
  const query = new URL(c.req.url).searchParams;
  const range = dateRange(query);
  const page = Number(query.get("page") ?? "1");
  if (!range || !Number.isSafeInteger(page) || page < 1 || page > 10_000)
    return c.html(dashboard({ range: dateRange(new URLSearchParams())!, error: "Choose a valid date range of up to 366 days, ending today or earlier (UTC)." }), 400);

  const [activity, entries] = await Promise.all([
    daily(range),
    feedbackRows(range, pageSize + 1, (page - 1) * pageSize),
  ]);
  return c.html(dashboard({ range, activity, entries: entries.slice(0, pageSize), page, next: entries.length > pageSize }));
});

owner.get("/export/:dataset", async (c) => {
  const range = dateRange(new URL(c.req.url).searchParams);
  if (!range) return c.json({ error: "Choose a valid date range of up to 366 days." }, 400);
  const dataset = c.req.param("dataset");
  let rows: (string | number)[][];
  if (dataset === "activity") {
    rows = [["UTC date", "Opted-in visits", "Opted-in quest completions"],
      ...(await daily(range)).map(({ day, visits, completions }) => [day, visits, completions])];
  } else if (dataset === "feedback") {
    const entries = await feedbackRows(range, exportLimit + 1);
    if (entries.length > exportLimit)
      return c.json({ error: "Narrow the date range to export up to 10,000 submissions at a time." }, 422);
    rows = [["Submitted at (UTC)", "Message"],
      ...entries.map(({ createdAt, message }) => [createdAt.toISOString(), message])];
  } else {
    return c.json({ error: "Not found." }, 404);
  }
  return c.body(csv(rows), 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="moneyquest-${dataset}-${range.start}-${range.end}.csv"`,
  });
});

owner.all("*", (c) => c.json({ error: "Not found." }, 404));
owner.onError((_error, c) => c.json({ error: "The owner dashboard could not complete the request. Try again." }, 500));

export default owner;
