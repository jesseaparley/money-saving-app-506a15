import { Check, Flame, Flag, LockKeyhole, Sparkles, Target, Trophy, Wallet } from "lucide-react";
import { longestStreak } from "../shared/challenges";

export function Achievements({
  completedCount,
  dates,
  savings,
  reachedGoal,
  earnedDailyBonus,
}: {
  completedCount: number;
  dates: Set<string>;
  savings: number;
  reachedGoal: boolean;
  earnedDailyBonus: boolean;
}) {
  const badges = [
    { title: "First Quest", detail: "Complete a quest", icon: Flag, color: "peach", earned: completedCount >= 1 },
    { title: "Quest Ace", detail: "Complete 5 quests", icon: Trophy, color: "yellow", earned: completedCount >= 5 },
    { title: "Daily Dynamo", detail: "Earn a daily challenge bonus", icon: Sparkles, color: "lavender", earned: earnedDailyBonus },
    { title: "On a Roll", detail: "Build a 3-day streak", icon: Flame, color: "peach", earned: longestStreak(dates) >= 3 },
    { title: "Fifty Club", detail: "Save $50 in total", icon: Wallet, color: "sage", earned: savings >= 5000 },
    { title: "Goal Getter", detail: "Reach a savings goal", icon: Target, color: "lavender", earned: reachedGoal },
  ];

  return (
    <section className="panel badge-panel" aria-labelledby="badge-title">
      <div className="panel-heading">
        <h2 id="badge-title">Achievements</h2>
        <span>{badges.filter((badge) => badge.earned).length} / {badges.length} earned</span>
      </div>
      <ul className="badge-list">
        {badges.map(({ title, detail, icon: Icon, color, earned }) => (
          <li className={earned ? "badge-earned" : ""} key={title}>
            <span className={`badge-medal ${earned ? color : ""}`} aria-hidden="true">
              <Icon size={19} />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{detail}</p>
            </div>
            {earned ? <Check size={15} aria-label="Earned" role="img" /> : <LockKeyhole size={15} aria-label="Locked" role="img" />}
          </li>
        ))}
      </ul>
    </section>
  );
}
