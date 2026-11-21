import {
  pgTable,
  text,
  integer,
  timestamp,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const goals = pgTable("goals", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  targetCents: integer("target_cents").notNull(),
  savedCents: integer("saved_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const questRuns = pgTable(
  "quest_runs",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    questId: text("quest_id").notNull(),
    period: text("period").notNull(),
    status: text("status").notNull().default("active"),
    savingsCents: integer("savings_cents").notNull().default(0),
    xp: integer("xp").notNull().default(0),
    goalId: text("goal_id").references(() => goals.id, {
      onDelete: "set null",
    }),
    localDate: text("local_date").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("quest_run_period_unique").on(
      table.profileId,
      table.questId,
      table.period,
    ),
  ],
);
export const checkIns = pgTable(
  "check_ins",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.localDate] })],
);
export const deposits = pgTable("deposits", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const analyticsDaily = pgTable(
  "analytics_daily",
  {
    day: text("day").notNull(),
    metric: text("metric", { enum: ["visit", "quest_completion"] }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.day, table.metric] })],
);

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
