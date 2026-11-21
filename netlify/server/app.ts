import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { getCookie, setCookie } from "hono/cookie";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "../../db/index.ts";
import {
  profiles,
  goals,
  questRuns,
  checkIns,
  deposits,
  analyticsDaily,
  feedback,
} from "../../db/schema.ts";
import { quests } from "../../shared/quests.ts";
import { dailyBonus } from "../../shared/challenges.ts";

const app = new Hono<{ Variables: { profileId: string; today: string } }>();
const MAX_CENTS = 100_000_000;
function cents(value: unknown, allowZero = true) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < (allowZero ? 0 : 1) ||
    value > MAX_CENTS
  )
    throw new Error("Enter a valid amount up to $1,000,000.");
  return value;
}
function title(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 60)
    throw new Error("Give your goal a name between 1 and 60 characters.");
  return value.trim();
}
function requestId(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      value,
    )
  )
    throw new Error("Please refresh the page and try again.");
  return value;
}
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  if (c.req.header("sec-fetch-site") === "cross-site")
    return c.json({ error: "Please use MoneyQuest directly." }, 403);
  const length = Number(c.req.header("content-length") || 0);
  if (length > 8192) return c.json({ error: "Request is too large." }, 413);
  await next();
});

async function recordMetric(metric: (typeof analyticsDaily.$inferInsert)["metric"]) {
  const day = new Date().toISOString().slice(0, 10);
  await db.insert(analyticsDaily).values({ day, metric, count: 1 }).onConflictDoUpdate({
    target: [analyticsDaily.day, analyticsDaily.metric],
    set: { count: sql`${analyticsDaily.count} + 1` },
  });
}

app.post("/api/analytics/visit", async (c) => {
  if (c.req.header("X-MoneyQuest-Analytics") !== "1" || c.req.header("Sec-GPC") === "1")
    return c.body(null, 204);
  await recordMetric("visit");
  return c.body(null, 204);
});

app.post("/api/feedback", bodyLimit({
  maxSize: 8192,
  onError: (c) => c.json({ error: "Feedback is too long." }, 413),
}), async (c) => {
  const body = await c.req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 1000)
    return c.json({ error: "Enter feedback between 1 and 1,000 characters." }, 400);

  const id = requestId(body.requestId);
  try {
    await db.insert(feedback).values({ id, message }).onConflictDoNothing();
  } catch {
    return c.json({ error: "Feedback could not be sent. Please try again." }, 503);
  }
  return c.body(null, 204);
});

app.use("/api/*", async (c, next) => {
  let token = getCookie(c, "mq_browser");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = randomBytes(32).toString("hex");
    setCookie(c, "mq_browser", token, {
      httpOnly: true,
      secure: new URL(c.req.url).protocol === "https:",
      sameSite: "Strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  const profileId = createHash("sha256").update(token).digest("hex");
  let today: string;
  try {
    today = new Intl.DateTimeFormat("en-CA", {
      timeZone: c.req.header("x-time-zone") || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return c.json(
      { error: "Your time zone could not be read. Refresh and try again." },
      400,
    );
  }
  c.set("profileId", profileId);
  c.set("today", today);
  await db.insert(profiles).values({ id: profileId }).onConflictDoNothing();
  await next();
});

async function state(profileId: string, today: string) {
  const [userGoals, runs, days, contributions] = await Promise.all([
    db
      .select()
      .from(goals)
      .where(eq(goals.profileId, profileId))
      .orderBy(goals.createdAt),
    db
      .select()
      .from(questRuns)
      .where(eq(questRuns.profileId, profileId))
      .orderBy(desc(questRuns.startedAt)),
    db
      .select()
      .from(checkIns)
      .where(eq(checkIns.profileId, profileId))
      .orderBy(desc(checkIns.localDate)),
    db
      .select()
      .from(deposits)
      .where(eq(deposits.profileId, profileId))
      .orderBy(desc(deposits.createdAt)),
  ]);
  return {
    goals: userGoals.map(({ profileId: _, ...g }) => g),
    runs: runs.map(({ profileId: _, ...r }) => r),
    checkIns: days.map((d) => ({ date: d.localDate, createdAt: d.createdAt })),
    deposits: contributions.map(({ profileId: _, ...d }) => d),
    today,
  };
}
app.get("/api/progress", async (c) =>
  c.json(await state(c.get("profileId"), c.get("today"))),
);
app.post("/api/check-in", async (c) => {
  await db
    .insert(checkIns)
    .values({ profileId: c.get("profileId"), localDate: c.get("today") })
    .onConflictDoNothing();
  return c.json(await state(c.get("profileId"), c.get("today")));
});
app.post("/api/quests/:id/start", async (c) => {
  const quest = quests.find((q) => q.id === c.req.param("id"));
  if (!quest) return c.json({ error: "Quest not found." }, 404);
  const profileId = c.get("profileId"),
    today = c.get("today");
  await db
    .insert(questRuns)
    .values({
      id: randomUUID(),
      profileId,
      questId: quest.id,
      period: quest.repeat ? today : "once",
      localDate: today,
    })
    .onConflictDoNothing();
  return c.json(await state(profileId, today));
});
app.post("/api/quests/:id/complete", async (c) => {
  const quest = quests.find((q) => q.id === c.req.param("id"));
  if (!quest) return c.json({ error: "Quest not found." }, 404);
  const body = await c.req.json();
  const saved = cents(body.savingsCents),
    profileId = c.get("profileId"),
    today = c.get("today");
  const goalId =
    typeof body.goalId === "string" && body.goalId ? body.goalId : null;
  const completed = await db.transaction(async (tx) => {
    if (goalId) {
      const [goal] = await tx
        .select()
        .from(goals)
        .where(and(eq(goals.id, goalId), eq(goals.profileId, profileId)));
      if (!goal) throw new Error("Choose one of your savings goals.");
    }
    const [run] = await tx
      .update(questRuns)
      .set({
        status: "completed",
        savingsCents: saved,
        xp: quest.xp + dailyBonus(quest.id, today),
        goalId,
        completedAt: new Date(),
        localDate: today,
      })
      .where(
        and(
          eq(questRuns.profileId, profileId),
          eq(questRuns.questId, quest.id),
          eq(questRuns.period, quest.repeat ? today : "once"),
          eq(questRuns.status, "active"),
        ),
      )
      .returning();
    if (!run) {
      const [existing] = await tx
        .select()
        .from(questRuns)
        .where(
          and(
            eq(questRuns.profileId, profileId),
            eq(questRuns.questId, quest.id),
            eq(questRuns.period, quest.repeat ? today : "once"),
          ),
        );
      if (existing?.status === "completed") return false;
      throw new Error(
        "Start this quest first. If it is already complete, choose another quest.",
      );
    }
    if (goalId)
      await tx
        .update(goals)
        .set({ savedCents: sql`${goals.savedCents} + ${saved}` })
        .where(and(eq(goals.id, goalId), eq(goals.profileId, profileId)));
    await tx
      .insert(checkIns)
      .values({ profileId, localDate: today })
      .onConflictDoNothing();
    return true;
  });
  if (completed && c.req.header("X-MoneyQuest-Analytics") === "1" && c.req.header("Sec-GPC") !== "1") {
    try {
      await recordMetric("quest_completion");
    } catch {
      console.warn("MoneyQuest could not record an aggregate quest completion.");
    }
  }
  return c.json(await state(profileId, today));
});
app.post("/api/goals", async (c) => {
  const body = await c.req.json();
  const name = title(body.title),
    target = cents(body.targetCents, false),
    initial = cents(body.savedCents ?? 0);
  const profileId = c.get("profileId"),
    id = requestId(body.requestId);
  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(goals)
      .values({
        id,
        profileId,
        title: name,
        targetCents: target,
        savedCents: initial,
      })
      .onConflictDoNothing()
      .returning();
    if (!created) return;
    if (initial)
      await tx
        .insert(deposits)
        .values({
          id: randomUUID(),
          profileId,
          goalId: id,
          amountCents: initial,
        });
  });
  return c.json(await state(profileId, c.get("today")), 201);
});
app.post("/api/goals/:id/deposit", async (c) => {
  const body = await c.req.json(),
    amount = cents(body.amountCents, false),
    profileId = c.get("profileId"),
    id = c.req.param("id");
  const depositId = requestId(body.requestId);
  await db.transaction(async (tx) => {
    const [goal] = await tx
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.profileId, profileId)));
    if (!goal) throw new Error("This goal could not be found.");
    const [inserted] = await tx
      .insert(deposits)
      .values({ id: depositId, profileId, goalId: id, amountCents: amount })
      .onConflictDoNothing()
      .returning();
    if (inserted)
      await tx
        .update(goals)
        .set({ savedCents: sql`${goals.savedCents} + ${amount}` })
        .where(and(eq(goals.id, id), eq(goals.profileId, profileId)));
  });
  return c.json(await state(profileId, c.get("today")));
});
app.onError((error, c) => {
  const known = [
    "Enter a valid",
    "Give your goal",
    "Choose one",
    "Start this quest",
    "This goal",
    "Please refresh",
  ];
  const safe = known.some((prefix) => error.message.startsWith(prefix));
  return c.json(
    {
      error: safe
        ? error.message
        : "Your progress could not be saved. Please try again.",
    },
    safe ? 400 : 500,
  );
});
app.notFound((c) => c.json({ error: "Not found." }, 404));
export default app;
