import { quests } from "./quests.ts";

export const DAILY_BONUS_XP = 25;
export const WEEKLY_TARGET_CENTS = 2500;

const dayMs = 86_400_000;
const dailyPool = quests.filter((quest) => quest.repeat);

function calendarDay(date: string) {
  return Date.parse(date + "T00:00:00Z") / dayMs;
}

export function dailyChallenges(date: string) {
  const first = ((calendarDay(date) % dailyPool.length) + dailyPool.length) % dailyPool.length;
  return [0, 1, 2].map((offset) => dailyPool[(first + offset) % dailyPool.length]);
}

export function dailyBonus(questId: string, date: string) {
  return dailyChallenges(date).some((quest) => quest.id === questId) ? DAILY_BONUS_XP : 0;
}

export function weekStart(date: string) {
  const day = calendarDay(date);
  // 1970-01-01 was Thursday, three days after Monday.
  const daysSinceMonday = (((day + 3) % 7) + 7) % 7;
  return new Date((day - daysSinceMonday) * dayMs).toISOString().slice(0, 10);
}

export function longestStreak(dates: Iterable<string>) {
  let previous = -Infinity;
  let current = 0;
  let longest = 0;
  for (const date of [...new Set(dates)].sort()) {
    const day = calendarDay(date);
    current = day === previous + 1 ? current + 1 : 1;
    longest = Math.max(current, longest);
    previous = day;
  }
  return longest;
}
