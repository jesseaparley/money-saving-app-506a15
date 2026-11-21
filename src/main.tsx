import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  CircleHelp,
  Clock3,
  Coffee,
  CreditCard,
  Flame,
  Flag,
  Leaf,
  LockKeyhole,
  Mountain,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Share2,
  MessageSquare,
  Sparkles,
  Sprout,
  Target,
  TrendingUp,
  Trophy,
  Utensils,
  Wallet,
  X,
  Zap,
  Carrot,
  LoaderCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { quests, levelNames, XP_PER_LEVEL } from "../shared/quests";
import {
  DAILY_BONUS_XP,
  WEEKLY_TARGET_CENTS,
  dailyBonus,
  dailyChallenges,
  weekStart,
} from "../shared/challenges";
import { Achievements } from "./achievements";
import "./styles.css";
import "./game.css";
import "./welcome.css";
import {
  AnalyticsChoice,
  WelcomeSteps,
  SHARE_URL,
  analyticsAllowed,
  analyticsHeader,
  analyticsPreference,
  hasSeenWelcome,
  recordVisit,
  rememberWelcome,
  saveAnalyticsPreference,
} from "./welcome";

type Quest = (typeof quests)[number];
type Page = "overview" | "quests" | "goals" | "history";
type Goal = {
  id: string;
  title: string;
  targetCents: number;
  savedCents: number;
  createdAt: string;
};
type Run = {
  id: string;
  questId: string;
  period: string;
  status: string;
  savingsCents: number;
  xp: number;
  goalId: string | null;
  startedAt: string;
  completedAt: string | null;
  localDate: string;
};
type Progress = {
  goals: Goal[];
  runs: Run[];
  checkIns: { date: string; createdAt: string }[];
  deposits: {
    id: string;
    goalId: string;
    amountCents: number;
    createdAt: string;
  }[];
  today: string;
};
type Modal =
  | { type: "quest"; quest: Quest }
  | { type: "goal" }
  | { type: "deposit"; goal: Goal }
  | { type: "help" | "welcome" | "feedback" | "privacy" | "share" }
  | null;
const questIcons: Record<string, LucideIcon> = {
  coffee: Coffee,
  utensils: Utensils,
  credit: CreditCard,
  wallet: Wallet,
  carrot: Carrot,
  clock: Clock3,
  receipt: ReceiptText,
  sprout: Sprout,
};
const money = (cents: number, decimals = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: decimals ? 2 : 0,
    minimumFractionDigits: decimals ? 2 : 0,
  }).format(cents / 100);
const localToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const offsetDay = (date: string, delta: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};
const emptyProgress = (): Progress => ({
  goals: [],
  runs: [],
  checkIns: [],
  deposits: [],
  today: localToday(),
});
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const siteName = "MoneyQuest";
const siteDescription =
  "Make saving a little more rewarding. Take on everyday money quests, earn XP, build a streak, and bring your personal savings goals closer.";

async function api(path: string, body?: object, analytics = false): Promise<Progress> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Time-Zone": timeZone,
        ...(analytics ? { [analyticsHeader]: "1" } : {}),
      },
      signal: AbortSignal.timeout(20000),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error("MoneyQuest couldn’t connect. Check your connection and try again.");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "MoneyQuest is having trouble connecting. Please try again.",
    );
  }
  if (!response.ok)
    throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}

function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M8 24V14l7 6 7-10 7 5v11"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="29" cy="8" r="2.6" fill="#e3bd70" />
        </svg>
      </span>
      Money<span className="brand-quest">Quest</span>
      <span className="beta">BETA</span>
    </span>
  );
}

function QuestLandscape() {
  return (
    <svg
      className="quest-landscape"
      viewBox="0 0 430 255"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="274" cy="126" r="111" fill="#dbe6cb" opacity=".6" />
      <path
        d="M55 208 126 114q9-12 18 0l45 49 75-115q7-11 15 0l113 160Z"
        fill="#91b191"
      />
      <path
        d="m189 163 75-115q7-11 15 0l36 58-36-18-16 9-17-19Z"
        fill="#edf2df"
      />
      <path d="m55 208 71-94q9-12 18 0l45 49 23-34 67 79Z" fill="#b4cba6" />
      <path d="M15 226q71-79 145-29 76-83 154-37 58 0 102 66Z" fill="#709779" />
      <path
        d="M113 253c-21-28-5-47 35-54 39-7 102 6 103-24 0-16-43-17-33-36 7-14 32-12 45-23 16-14-2-23 7-35"
        stroke="#f6efd3"
        strokeWidth="17"
        strokeLinecap="round"
      />
      <path
        d="M113 253c-21-28-5-47 35-54 39-7 102 6 103-24 0-16-43-17-33-36 7-14 32-12 45-23 16-14-2-23 7-35"
        stroke="#b8ac80"
        strokeWidth="1.5"
        strokeDasharray="4 8"
        strokeLinecap="round"
      />
      <path
        d="M7 246q60-34 109-7 83-22 126-1 103-38 180-2v19H7Z"
        fill="#406b50"
      />
      <path
        d="M270 53V16"
        stroke="#3c6146"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="m272 16 29 5-7 9-22-3Z" fill="#d9a34f" />
      <g transform="translate(315 124) rotate(12)">
        <ellipse cx="0" cy="0" rx="20" ry="23" fill="#cfa04e" />
        <ellipse
          cx="-4"
          cy="-2"
          rx="19"
          ry="23"
          fill="#efc978"
          stroke="#cba14e"
          strokeWidth="2"
        />
        <ellipse
          cx="-4"
          cy="-2"
          rx="13"
          ry="17"
          stroke="#d1a64f"
          strokeWidth="1.3"
        />
        <path
          d="M0-11h-6c-6 0-6 8 0 9s6 9 0 9h-7m8-21V11"
          stroke="#9d783a"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(145 172) rotate(-15)">
        <ellipse cx="0" cy="0" rx="16" ry="19" fill="#cfa04e" />
        <ellipse
          cx="-3"
          cy="-2"
          rx="15"
          ry="19"
          fill="#f1cd82"
          stroke="#cba14e"
          strokeWidth="1.7"
        />
        <path
          d="M0-10h-5c-5 0-5 7 0 8s5 8 0 8h-6m7-19V10"
          stroke="#a7813d"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <g stroke="#527c55" strokeWidth="2" strokeLinecap="round">
        <path
          d="m56 224-1-24m0 11c-18-1-17-15-17-15 15 0 17 15 17 15Zm1-6c15 0 15-15 15-15-14 1-15 15-15 15Z"
          fill="#86a577"
        />
        <path
          d="m360 231 1-25m0 12c-16-2-16-15-16-15 14 1 16 15 16 15Zm0-8c13-1 14-13 14-13-11 0-14 13-14 13Z"
          fill="#a7bc8e"
        />
      </g>
      <path
        d="M80 69h37a11 11 0 0 0-18-9c-2-15-26-12-26 2a4 4 0 0 0 7 7ZM337 69h31a8 8 0 0 0-13-8c-5-14-25-7-23 3"
        fill="#f5f6e9"
      />
      <g stroke="#c59e53" strokeWidth="2" strokeLinecap="round">
        <path d="M188 58v12m-6-6h12m163 34v9m-4.5-4.5h9M98 134v9m-4.5-4.5h9" />
      </g>
      <circle cx="329" cy="40" r="3" fill="#94ac83" />
      <circle cx="212" cy="96" r="2" fill="#94ac83" />
    </svg>
  );
}

function Dialog({
  title,
  label,
  children,
  onClose,
}: {
  title: string;
  label?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const rect = ref.current!.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          )
            onClose();
        }
      }}
      aria-labelledby="dialog-title"
    >
      <button
        className="icon-button modal-close"
        onClick={onClose}
        aria-label="Close dialog"
      >
        <X size={20} />
      </button>
      {label && <p className="eyebrow">{label}</p>}
      <h2 id="dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}

function GoalCard({
  goal,
  compact = false,
  onDeposit,
}: {
  goal: Goal;
  compact?: boolean;
  onDeposit: (goal: Goal) => void;
}) {
  const percent = Math.min(
    100,
    Math.floor((goal.savedCents / goal.targetCents) * 100),
  );
  return (
    <div className={`goal-item ${compact ? "compact" : ""}`}>
      <div className="goal-title">
        <span className="icon-tile sage">
          <Target size={21} />
        </span>
        <div>
          <h3>{goal.title}</h3>
          <span>
            {percent === 100
              ? "You made it. Look at you go!"
              : "A little closer with every win"}
          </span>
        </div>
        {percent === 100 && <CheckCheck size={20} className="green" />}
      </div>
      <div className="goal-numbers">
        <strong>{money(goal.savedCents, true)}</strong>
        <span>of {money(goal.targetCents, goal.targetCents % 100 !== 0)}</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={`${goal.title} progress`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ transform: `scaleX(${percent / 100})` }} />
      </div>
      <div className="goal-bottom">
        <span>{percent}% of the way there</span>
        <button className="text-button" onClick={() => onDeposit(goal)}>
          <Plus size={14} /> Add savings
        </button>
      </div>
    </div>
  );
}

function QuestCard({
  quest,
  index,
  bonus,
  run,
  onOpen,
}: {
  quest: Quest;
  index: number;
  bonus: number;
  run?: Run;
  onOpen: (quest: Quest) => void;
}) {
  const Icon = questIcons[quest.icon],
    done = run?.status === "completed";
  return (
    <article
      className={`quest-card ${done ? "is-complete" : ""}`}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="quest-card-top">
        <span className={`icon-tile ${quest.color}`}>
          <Icon size={23} strokeWidth={1.7} />
        </span>
        <span className={`quest-category ${done ? "done-label" : ""}`}>
          {done ? (
            <>
              <Check size={12} /> Completed
            </>
          ) : run ? (
            <>
              <span className="tiny-dot" /> In progress
            </>
          ) : (
            <>
              <Clock3 size={12} />
              {quest.duration}
            </>
          )}
        </span>
      </div>
      <button className="quest-title-button" onClick={() => onOpen(quest)}>
        <h3>{quest.title}</h3>
      </button>
      <p>{quest.description}</p>
      <div className="quest-card-bottom">
        <div className="quest-rewards">
          <span>
            <Zap size={14} fill="currentColor" />
            {done ? run.xp : quest.xp + bonus} XP
          </span>
          <span className="reward-separator" />
          <span className="save-estimate">
            {done
              ? `${money(run.savingsCents, true)} saved`
              : `Save ~${money(quest.estimate * 100)}`}
          </span>
        </div>
        <button
          className={`quest-action ${run ? "started" : ""}`}
          aria-label={`${done ? "View" : run ? "Continue" : "Start"} ${quest.title}`}
          onClick={() => onOpen(quest)}
        >
          {done ? (
            <Check size={17} />
          ) : run ? (
            <ArrowRight size={17} />
          ) : (
            <Plus size={18} />
          )}
        </button>
      </div>
    </article>
  );
}

function LevelCard({
  level,
  levelName,
  levelProgress,
}: {
  level: number;
  levelName: string;
  levelProgress: number;
}) {
  return (
    <section className="panel level-panel">
      <div className="panel-heading">
        <h2>Your adventurer profile</h2>
        <span className="level-mini">LEVEL {level}</span>
      </div>
      <div className="level-identity">
        <div className="level-badge">
          <div>
            <Sprout size={31} strokeWidth={1.5} />
          </div>
          <span>{level}</span>
        </div>
        <div>
          <p className="eyebrow">GROWING AT YOUR OWN PACE</p>
          <h3>{levelName}</h3>
          <p>
            {level === 1
              ? "Great things start with small steps."
              : "Look at the good habits you’re growing."}
          </p>
        </div>
      </div>
      <div className="xp-caption">
        <strong>Level {level}</strong>
        <span>
          {levelProgress} <span>/ {XP_PER_LEVEL} XP</span>
        </span>
      </div>
      <div
        className="progress-track xp-track"
        role="progressbar"
        aria-label="Progress to next level"
        aria-valuenow={levelProgress}
        aria-valuemin={0}
        aria-valuemax={XP_PER_LEVEL}
      >
        <span
          style={{ transform: `scaleX(${levelProgress / XP_PER_LEVEL})` }}
        />
      </div>
      <p className="next-level">
        <Sparkles size={13} />
        <strong>{XP_PER_LEVEL - levelProgress} XP</strong> to your next level
      </p>
    </section>
  );
}
function StreakCard({
  todayDate,
  dates,
  streak,
}: {
  todayDate: string;
  dates: Set<string>;
  streak: number;
}) {
  const checkedToday = dates.has(todayDate);
  const mondayOffset = (new Date(`${todayDate}T12:00:00Z`).getUTCDay() + 6) % 7;
  return (
    <section className="panel streak-panel">
      <div className="panel-heading">
        <h2>Keep your spark alive</h2>
        <span className="streak-number">
          <Flame size={17} /> {streak}
        </span>
      </div>
      <div className="week-days">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => {
          const date = offsetDay(todayDate, index - mondayOffset),
            checked = dates.has(date),
            today = date === todayDate;
          return (
            <div
              key={index}
              className={`week-day ${today ? "today" : ""} ${checked ? "is-checked" : ""}`}
              title={`${date}${checked ? ": checked in" : ""}`}
            >
              <span>{day}</span>
              <div>
                {checked ? (
                  <Check size={14} />
                ) : today ? (
                  <Flame size={15} />
                ) : (
                  <span />
                )}
              </div>
              {today && <i />}
            </div>
          );
        })}
      </div>
      <p>
        {checkedToday ? (
          <>
            You showed up today. <strong>See you tomorrow.</strong>
          </>
        ) : (
          <>
            One check-in. <strong>A little more momentum.</strong>
          </>
        )}
      </p>
    </section>
  );
}
function App() {
  const [page, setPage] = useState<Page>("overview");
  const [data, setData] = useState<Progress>(emptyProgress);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [celebration, setCelebration] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [modalError, setModalError] = useState("");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(analyticsPreference);
  const [welcomeHandled, setWelcomeHandled] = useState(hasSeenWelcome);
  const visitAttempted = useRef(false);
  const [category, setCategory] = useState("All quests");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [historyFilter, setHistoryFilter] = useState("all");
  const requestId = useRef(crypto.randomUUID());
  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await api("/progress"));
      setConnected(true);
    } catch (e) {
      setError((e as Error).message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    document.title = `${siteName} — Small steps. Real savings.`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", siteDescription);
    void load();
  }, []);
  useEffect(() => {
    if (!connected || loading || welcomeHandled || modal) return;
    if (data.goals.length || data.runs.length || data.checkIns.length || data.deposits.length) {
      rememberWelcome();
      setWelcomeHandled(true);
      return;
    }
    setModal({ type: "welcome" });
  }, [connected, loading, welcomeHandled, modal, data]);
  useEffect(() => {
    if (!connected || !analyticsEnabled || !analyticsAllowed() || visitAttempted.current) return;
    visitAttempted.current = true;
    recordVisit();
  }, [connected, analyticsEnabled]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(() => setCelebration(""), 1500);
    return () => clearTimeout(timer);
  }, [celebration]);
  useEffect(() => {
    function refreshDay() {
      if (
        document.visibilityState === "visible" &&
        data.today !== localToday() &&
        !busy &&
        !loading
      )
        void load();
    }
    const midnight = new Date();
    midnight.setHours(24, 0, 1, 0);
    const timer = window.setTimeout(
      refreshDay,
      Math.max(1000, midnight.getTime() - Date.now()),
    );
    window.addEventListener("focus", refreshDay);
    document.addEventListener("visibilitychange", refreshDay);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refreshDay);
      document.removeEventListener("visibilitychange", refreshDay);
    };
  }, [data.today, busy, loading]);
  function navigate(next: Page) {
    setPage(next);
    setCategory("All quests");
    setStatus("all");
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function open(next: Modal) {
    requestId.current = crypto.randomUUID();
    setModalError("");
    setModal(next);
  }
  function updateAnalytics(enabled: boolean) {
    saveAnalyticsPreference(enabled);
    setAnalyticsEnabled(enabled);
  }
  function closeModal() {
    if (busy) return;
    if (modal?.type === "welcome") {
      rememberWelcome();
      setWelcomeHandled(true);
    }
    setModal(null);
  }
  async function shareApp() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: siteName, url: SHARE_URL });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setToast("MoneyQuest link copied.");
    } catch {
      open({ type: "share" });
    }
  }
  async function sendFeedback(message: string) {
    setBusy(true);
    setModalError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, requestId: requestId.current }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Feedback could not be sent. Please try again.");
      }
      setModal(null);
      setToast("Thanks for sharing your feedback.");
    } catch (e) {
      setModalError(e instanceof Error && e.name === "Error"
        ? e.message
        : "Feedback could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function mutate(
    path: string,
    body: object,
    message: string,
    close = false,
    completingQuest?: Quest,
  ) {
    if (busy) return false;
    setBusy(true);
    setModalError("");
    setError("");
    try {
      const result = await api(
        path,
        { ...body, requestId: requestId.current },
        Boolean(completingQuest && analyticsEnabled && analyticsAllowed()),
      );
      setData(result);
      setConnected(true);
      if (completingQuest) {
        const run = result.runs.find((entry) =>
          entry.questId === completingQuest.id &&
          entry.period === (completingQuest.repeat ? result.today : "once") &&
          entry.status === "completed",
        );
        if (run) {
          const bonus = run.xp - completingQuest.xp;
          setToast(bonus > 0
            ? `Challenge complete! +${run.xp} XP, including ${bonus} bonus XP.`
            : `Quest complete! +${run.xp} XP.`);
          if (!data.runs.some((entry) => entry.id === run.id && entry.status === "completed"))
            setCelebration(run.id);
        } else {
          setToast(message);
        }
      } else {
        setToast(message);
      }
      if (close) setModal(null);
      return true;
    } catch (e) {
      const message = (e as Error).message;
      if (modal) setModalError(message);
      else setError(message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const completed = data.runs.filter((r) => r.status === "completed");
  const totalSaved =
    completed.reduce((sum, r) => sum + r.savingsCents, 0) +
    data.deposits.reduce((sum, d) => sum + d.amountCents, 0);
  const xp =
    completed.reduce((sum, r) => sum + r.xp, 0) + data.checkIns.length * 10;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const levelName = levelNames[Math.min(level - 1, levelNames.length - 1)];
  const levelProgress = xp % XP_PER_LEVEL;
  const checkedToday = data.checkIns.some((d) => d.date === data.today);
  const dates = new Set(data.checkIns.map((d) => d.date));
  let streak = 0,
    cursor = checkedToday ? data.today : offsetDay(data.today, -1);
  while (dates.has(cursor)) {
    streak++;
    cursor = offsetDay(cursor, -1);
  }
  const runFor = (quest: Quest) =>
    data.runs.find(
      (r) =>
        r.questId === quest.id &&
        r.period === (quest.repeat ? data.today : "once"),
    );
  const isDone = (quest: Quest) => runFor(quest)?.status === "completed";
  const active = quests.filter((q) => runFor(q)?.status === "active").length;
  const currentDone = quests.filter(isDone).length;
  const daily = dailyChallenges(data.today);
  const monday = weekStart(data.today);
  const depositDay = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const isThisWeek = (date: string) => date >= monday && date <= data.today;
  const weeklySaved = completed.reduce((sum, run) =>
    sum + (isThisWeek(run.localDate) ? run.savingsCents : 0), 0) +
    data.deposits.reduce((sum, deposit) =>
      sum + (isThisWeek(depositDay.format(new Date(deposit.createdAt))) ? deposit.amountCents : 0), 0);
  const baseXp = new Map<string, number>(quests.map((quest) => [quest.id, quest.xp]));
  const earnedDailyBonus = completed.some((run) => run.xp > (baseXp.get(run.questId) ?? Infinity));
  const featuredGoal =
    data.goals.find((g) => g.savedCents < g.targetCents) || data.goals[0];
  const filteredQuests = quests.filter(
    (q) =>
      (category === "All quests" || q.category === category) &&
      (!query ||
        `${q.title} ${q.description}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (status === "all" ||
        (status === "active"
          ? runFor(q)?.status === "active"
          : status === "completed"
            ? isDone(q)
            : !runFor(q))),
  );
  const visibleQuests =
    page === "overview" ? filteredQuests.slice(0, 4) : filteredQuests;

  function exportProgress() {
    const rows: (string | number)[][] = [
      [
        "Record type",
        "Name",
        "Status",
        "Date",
        "Savings USD",
        "XP",
        "Goal",
        "Target USD",
      ],
      [
        "Summary",
        "MoneyQuest progress",
        `Level ${level} · ${levelName} · ${streak} day streak`,
        data.today,
        (totalSaved / 100).toFixed(2),
        xp,
        "",
        "",
      ],
      ...data.runs.map((r) => [
        "Quest",
        quests.find((q) => q.id === r.questId)?.title || r.questId,
        r.status,
        r.completedAt || r.startedAt,
        (r.savingsCents / 100).toFixed(2),
        r.xp,
        data.goals.find((g) => g.id === r.goalId)?.title || "",
        "",
      ]),
      ...data.checkIns.map((d) => [
        "Check-in",
        "Daily check-in",
        "completed",
        d.date,
        "0.00",
        10,
        "",
        "",
      ]),
      ...data.goals.map((g) => [
        "Goal",
        g.title,
        g.savedCents >= g.targetCents ? "reached" : "in progress",
        g.createdAt,
        (g.savedCents / 100).toFixed(2),
        "",
        g.title,
        (g.targetCents / 100).toFixed(2),
      ]),
      ...data.deposits.map((d) => [
        "Goal deposit",
        "Savings added",
        "completed",
        d.createdAt,
        (d.amountCents / 100).toFixed(2),
        "",
        data.goals.find((g) => g.id === d.goalId)?.title || "",
        "",
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map((value) => {
              let cell = String(value);
              if (/^\s*[=+\-@]|^[\t\r\n]/.test(cell)) cell = "'" + cell;
              return '"' + cell.replaceAll('"', '""') + '"';
            })
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `moneyquest-progress-${data.today}.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Your progress is ready. CSV downloaded.");
  }

  const history = [
    ...completed.map((r) => ({
      id: r.id,
      type: "quest",
      title: quests.find((q) => q.id === r.questId)?.title || "Quest complete",
      date: r.completedAt!,
      savings: r.savingsCents,
      xp: r.xp,
      icon: Trophy,
    })),
    ...data.checkIns.map((d) => ({
      id: `check-${d.date}`,
      type: "checkin",
      title: "Showed up for your future self",
      date: d.createdAt,
      savings: 0,
      xp: 10,
      icon: Flame,
    })),
    ...data.deposits.map((d) => ({
      id: d.id,
      type: "deposit",
      title: `Saved toward ${data.goals.find((g) => g.id === d.goalId)?.title || "your goal"}`,
      date: d.createdAt,
      savings: d.amountCents,
      xp: 0,
      icon: Target,
    })),
  ]
    .filter((h) => historyFilter === "all" || h.type === historyFilter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand-button"
            aria-label="MoneyQuest overview"
            onClick={() => navigate("overview")}
          >
            <Brand />
          </button>
          <nav aria-label="Main navigation">
            {(
              [
                { id: "overview", label: "Overview" },
                { id: "quests", label: "Quests" },
                { id: "goals", label: "My goals" },
                { id: "history", label: "History" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                className={page === item.id ? "nav-active" : ""}
                aria-current={page === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                {item.label}
                {item.id === "quests" && <span className="nav-count">8</span>}
              </button>
            ))}
          </nav>
          <div className="header-right">
            <span
              className={`save-status ${error || (modal && modalError) ? "has-error" : ""}`}
            >
              <span
                className={loading || busy ? "status-dot pulse" : "status-dot"}
              />
              {loading
                ? "Connecting…"
                : busy
                  ? "Saving…"
                  : error || (modal && modalError)
                    ? "Needs attention"
                    : connected
                      ? "Progress saved"
                      : "Not connected"}
            </span>
            <button
              className="avatar"
              aria-label="How MoneyQuest works"
              onClick={() => open({ type: "help" })}
            >
              <Sprout size={21} />
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button onClick={() => void load()} disabled={loading}>
              Try again <ArrowRight size={14} />
            </button>
          </div>
        )}
        <section className="page-heading">
          <div>
            <p className="eyebrow">
              <span className="little-line" />
              {page === "overview"
                ? "A LITTLE BETTER, EVERY DAY"
                : page === "quests"
                  ? "YOUR NEXT SMALL WIN"
                  : page === "goals"
                    ? "DREAM IT. SAVE FOR IT."
                    : "LOOK HOW FAR YOU’VE COME"}
            </p>
            <h1>
              {page === "overview" ? (
                <>
                  Small steps. <span>Real savings.</span>
                </>
              ) : page === "quests" ? (
                <>
                  Good habits start <span>with a quest.</span>
                </>
              ) : page === "goals" ? (
                <>
                  Big plans. <span>Little by little.</span>
                </>
              ) : (
                <>
                  Every win <span>counts.</span>
                </>
              )}
            </h1>
            <p className="heading-description">
              {page === "overview"
                ? "Turn everyday choices into a future you’re excited about."
                : page === "quests"
                  ? "Pick a challenge, take action, and make your money go a little further."
                  : page === "goals"
                    ? "Give your savings a purpose. Make the things that matter happen."
                    : "Your small steps are adding up. Here’s the story so far."}
            </p>
          </div>
          <div className="heading-action">
            {page === "goals" ? (
              <button
                className="button primary"
                onClick={() => open({ type: "goal" })}
                disabled={loading}
              >
                <Plus size={17} /> Create a goal
              </button>
            ) : page === "history" ? (
              <button
                className="button secondary"
                disabled={loading || !connected}
                onClick={exportProgress}
              >
                <ArrowDownToLine size={16} /> Export CSV
              </button>
            ) : (
              <button
                className={`button check-in-button ${checkedToday ? "checked-in" : ""}`}
                aria-label={
                  checkedToday
                    ? "Already checked in today"
                    : "Daily check-in: earn 10 XP"
                }
                disabled={busy || loading || checkedToday}
                onClick={() =>
                  void mutate(
                    "/check-in",
                    {},
                    "You showed up! +10 XP. Keep the streak growing.",
                  )
                }
              >
                <span className="check-in-icon">
                  {checkedToday ? <Check size={18} /> : <Flame size={19} />}
                </span>
                <span>
                  {checkedToday ? "Checked in for today" : "Daily check-in"}
                  <small>
                    {checkedToday
                      ? "A small win, well earned"
                      : "+10 XP · Keep your streak alive"}
                  </small>
                </span>
                {!checkedToday && <Plus size={15} />}
              </button>
            )}
          </div>
        </section>

        <section
          className={`stats-grid ${loading ? "is-loading" : ""}`}
          aria-label="Your progress"
          aria-busy={loading}
        >
          <Stat
            icon={Wallet}
            color="sage"
            label="Total saved"
            value={money(totalSaved, true)}
            detail="Your choices, adding up"
            trend
          />
          <Stat
            icon={CheckCheck}
            color="peach"
            label="Quests completed"
            value={String(completed.length).padStart(2, "0")}
            detail="Small wins. Big difference."
          />
          <Stat
            icon={Zap}
            color="lavender"
            label="Total XP earned"
            value={xp.toLocaleString()}
            detail={`Level ${level} · ${levelName}`}
          />
          <Stat
            icon={Flame}
            color="yellow"
            label="Current streak"
            value={
              <>
                {streak}{" "}
                <span className="stat-unit">
                  {streak === 1 ? "day" : "days"}
                </span>
              </>
            }
            detail={
              streak ? "Look at that momentum" : "Your next habit starts today"
            }
          />
        </section>

        {page === "overview" && connected && (
          <div className="game-grid">
            <section className="daily-challenges" aria-labelledby="daily-title">
              <div className="game-heading">
                <div>
                  <h2 id="daily-title">Daily challenges</h2>
                  <p>Rotates at midnight · +{DAILY_BONUS_XP} bonus XP each</p>
                </div>
                <span>{daily.filter(isDone).length} / {daily.length} complete</span>
              </div>
              <ul className="daily-list">
                {daily.map((quest) => {
                  const Icon = questIcons[quest.icon];
                  const run = runFor(quest);
                  const done = run?.status === "completed";
                  return (
                    <li key={quest.id}>
                      <button onClick={() => open({ type: "quest", quest })}>
                        <span className={`daily-icon ${quest.color}`}><Icon size={19} aria-hidden="true" /></span>
                        <span className="daily-label">
                          <strong>{quest.title}</strong>
                          <small>{done ? "Completed" : run ? "Continue challenge" : "Start challenge"}</small>
                        </span>
                        <span className="daily-reward">
                          {done ? <Check size={15} aria-hidden="true" /> : <Zap size={14} aria-hidden="true" />}
                          {done ? run.xp : quest.xp + DAILY_BONUS_XP} XP
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className="weekly-mission" aria-labelledby="weekly-title">
              <div className="weekly-icon"><Flag size={22} aria-hidden="true" /></div>
              <h2 id="weekly-title">Weekly savings mission</h2>
              <p>Quest savings and goal deposits count. Resets Mondays.</p>
              <div className="weekly-amount">
                <strong>{money(weeklySaved, true)}</strong> / {money(WEEKLY_TARGET_CENTS)}
              </div>
              <progress aria-label="Weekly savings mission progress" value={Math.min(weeklySaved, WEEKLY_TARGET_CENTS)} max={WEEKLY_TARGET_CENTS} />
              <p className="weekly-status">
                {weeklySaved >= WEEKLY_TARGET_CENTS
                  ? "Mission complete!"
                  : `${money(WEEKLY_TARGET_CENTS - weeklySaved, true)} to go`}
              </p>
            </section>
          </div>
        )}

        {page === "overview" && (
          <div className="dashboard-layout">
            <div className="main-column">
              <section className="adventure-banner">
                <div className="adventure-copy">
                  <span className="banner-kicker">
                    <Sparkles size={13} /> YOUR ADVENTURE STARTS SMALL
                  </span>
                  <h2>
                    A richer life.
                    <br />
                    One quest at a time.
                  </h2>
                  <p>
                    You don’t need to change everything.
                    <br />
                    Just take the next little step.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => navigate("quests")}
                  >
                    Find your next quest <ArrowRight size={16} />
                  </button>
                </div>
                <QuestLandscape />
                <span className="banner-caption">
                  <span /> SMALL WINS. BIG POSSIBILITIES.
                </span>
              </section>
              <section className="quests-section">
                <div className="section-heading">
                  <div>
                    <h2>
                      Your next quests <span className="count-badge">8</span>
                    </h2>
                    <p>A little challenge. A rewarding change.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("quests")}
                  >
                    View all quests <ArrowUpRight size={16} />
                  </button>
                </div>
                <div
                  className="filter-tabs"
                  role="group"
                  aria-label="Filter quests by category"
                >
                  {[
                    "All quests",
                    "Quick wins",
                    "Lifestyle",
                    "Money habits",
                  ].map((cat) => (
                    <button
                      key={cat}
                      className={category === cat ? "selected" : ""}
                      aria-pressed={category === cat}
                      onClick={() => setCategory(cat)}
                    >
                      {cat === "Quick wins" && <Zap size={13} />} {cat}
                    </button>
                  ))}
                </div>
                <div className="quests-grid">
                  {visibleQuests.map((q, i) => (
                    <QuestCard
                      quest={q}
                      index={i}
                      bonus={dailyBonus(q.id, data.today)}
                      key={q.id}
                      run={runFor(q)}
                      onOpen={(quest) => open({ type: "quest", quest })}
                    />
                  ))}
                </div>
              </section>
              <div className="gentle-note">
                <span className="note-spark">
                  <Sparkles size={18} />
                </span>
                <p>
                  Progress isn’t about being perfect.{" "}
                  <strong>It’s about showing up.</strong>
                </p>
                <span className="note-line" />
              </div>
            </div>
            <aside className="sidebar">
              {connected && (
                <Achievements
                  completedCount={completed.length}
                  dates={dates}
                  savings={totalSaved}
                  reachedGoal={data.goals.some((goal) => goal.savedCents >= goal.targetCents)}
                  earnedDailyBonus={earnedDailyBonus}
                />
              )}
              <LevelCard
                level={level}
                levelName={levelName}
                levelProgress={levelProgress}
              />
              <StreakCard
                todayDate={data.today}
                dates={dates}
                streak={streak}
              />
              <section className="panel savings-panel">
                <div className="panel-heading">
                  <h2>Your next big thing</h2>
                  <Target size={17} />
                </div>
                {featuredGoal ? (
                  <GoalCard
                    goal={featuredGoal}
                    compact
                    onDeposit={(goal) => open({ type: "deposit", goal })}
                  />
                ) : (
                  <div className="empty-goal">
                    <div className="goal-illustration">
                      <Target size={31} strokeWidth={1.4} />
                      <Sparkles size={15} />
                    </div>
                    <h3>A dream with a plan.</h3>
                    <p>
                      A rainy day fund? A weekend away?
                      <br />
                      Give your savings something to chase.
                    </p>
                    <button
                      className="button goal-create"
                      onClick={() => open({ type: "goal" })}
                    >
                      <Plus size={15} /> Create your first goal
                    </button>
                  </div>
                )}
                {featuredGoal && (
                  <button
                    className="text-button all-goals"
                    onClick={() => navigate("goals")}
                  >
                    See all goals <ArrowRight size={14} />
                  </button>
                )}
              </section>
              <div className="privacy-note">
                <ShieldCheck size={15} />
                <span>
                  Your journey. Your pace.
                  <br />
                  <strong>No bank connections needed.</strong>
                </span>
              </div>
            </aside>
          </div>
        )}

        {page === "quests" && (
          <section className="full-quests">
            <div className="quest-page-summary">
              <div>
                <span className="summary-dot" />{" "}
                <strong>{quests.length - currentDone}</strong> quests to explore{" "}
                <span className="summary-divider" /> <strong>{active}</strong>{" "}
                in progress
              </div>
              <span>
                <Leaf size={14} /> Daily quests refresh each morning
              </span>
            </div>
            <div className="quest-toolbar">
              <div
                className="filter-tabs"
                role="group"
                aria-label="Filter quests by category"
              >
                {["All quests", "Quick wins", "Lifestyle", "Money habits"].map(
                  (cat) => (
                    <button
                      key={cat}
                      className={category === cat ? "selected" : ""}
                      aria-pressed={category === cat}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </button>
                  ),
                )}
              </div>
              <div className="quest-search">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a quest…"
                  aria-label="Search quests"
                />
              </div>
              <select
                className="status-select"
                aria-label="Filter quest status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="available">Not started</option>
                <option value="active">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="quests-grid full-grid">
              {visibleQuests.map((q, i) => (
                <QuestCard
                  quest={q}
                  index={i}
                  bonus={dailyBonus(q.id, data.today)}
                  key={q.id}
                  run={runFor(q)}
                  onOpen={(quest) => open({ type: "quest", quest })}
                />
              ))}
            </div>
            {!visibleQuests.length && (
              <EmptyState
                icon={Search}
                title="No quests in this corner."
                text="Try another filter to find your next small win."
                action="Clear filters"
                onClick={() => {
                  setCategory("All quests");
                  setQuery("");
                  setStatus("all");
                }}
              />
            )}
            <p className="disclaimer">
              <CircleHelp size={14} /> Savings shown on quests are estimates.
              You log what you actually save. Daily quests can be completed once
              per calendar day.
            </p>
          </section>
        )}

        {page === "goals" && (
          <>
            <div className="goals-page-intro">
              <span className="icon-tile sage">
                <Sprout size={24} />
              </span>
              <div>
                <h2>A place for every possibility.</h2>
                <p>
                  Allocate quest savings to a goal, or add money you’ve set
                  aside yourself.
                </p>
              </div>
              <span className="goals-count">
                {data.goals.length} {data.goals.length === 1 ? "goal" : "goals"}{" "}
                growing
              </span>
            </div>
            {data.goals.length ? (
              <div className="goals-grid">
                {data.goals.map((g) => (
                  <section className="panel" key={g.id}>
                    <GoalCard
                      goal={g}
                      onDeposit={(goal) => open({ type: "deposit", goal })}
                    />
                  </section>
                ))}
                <button
                  className="new-goal-card"
                  onClick={() => open({ type: "goal" })}
                >
                  <span>
                    <Plus size={24} />
                  </span>
                  <strong>Make room for another dream</strong>
                  <span>Create a savings goal</span>
                </button>
              </div>
            ) : (
              <EmptyState
                icon={Flag}
                title="Every great adventure needs a destination."
                text="Start with something that matters to you. A safety net, a trip, or just a little breathing room."
                action="Create your first goal"
                onClick={() => open({ type: "goal" })}
              />
            )}
            <div className="goals-tip">
              <Sparkles size={21} />
              <div>
                <strong>Start small. You can always dream bigger.</strong>
                <p>
                  A goal of $50 is just as worth celebrating as a goal of
                  $5,000.
                </p>
              </div>
            </div>
          </>
        )}

        {page === "history" && (
          <section className="panel history-panel">
            <div className="section-heading">
              <div>
                <h2>Your trail of small wins</h2>
                <p>Quests, check-ins, and savings worth remembering.</p>
              </div>
              <select
                className="status-select"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                aria-label="Filter history"
              >
                <option value="all">All activity</option>
                <option value="quest">Completed quests</option>
                <option value="checkin">Daily check-ins</option>
                <option value="deposit">Goal deposits</option>
              </select>
            </div>
            {history.length ? (
              <div className="history-list">
                {history.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="history-row" key={item.id}>
                      <span
                        className={`icon-tile ${item.type === "checkin" ? "yellow" : "sage"}`}
                      >
                        <Icon size={20} />
                      </span>
                      <div className="history-name">
                        <h3>{item.title}</h3>
                        <span>
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(item.date))}
                        </span>
                      </div>
                      <div className="history-reward">
                        {item.savings > 0 && (
                          <strong>+{money(item.savings, true)}</strong>
                        )}
                        {item.xp > 0 && (
                          <span>
                            <Zap size={12} /> +{item.xp} XP
                          </span>
                        )}
                      </div>
                      <span className="history-check">
                        <Check size={15} />
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Mountain}
                title={
                  historyFilter === "all"
                    ? "Your story starts with one small win."
                    : "No activity here just yet."
                }
                text={
                  historyFilter === "all"
                    ? "Complete your first quest or check in today. Your progress will appear right here."
                    : "Try another activity filter, or go make your next small win."
                }
                action="Explore your quests"
                onClick={() => navigate("quests")}
              />
            )}
            <div className="history-footer">
              <LockKeyhole size={13} />
              <span>Progress is private to this browser.</span>
              <button
                className="text-button"
                onClick={exportProgress}
                disabled={!connected}
              >
                <ArrowDownToLine size={14} /> Export progress
              </button>
            </div>
          </section>
        )}

        <footer className="site-footer">
          <span>
            <Sprout size={15} /> A little more mindful. A little more saved.
          </span>
          <div className="footer-actions">
            <button onClick={() => void shareApp()}>
              <Share2 size={14} aria-hidden="true" /> Share app
            </button>
            <button onClick={() => open({ type: "feedback" })}>
              <MessageSquare size={14} aria-hidden="true" /> Feedback
            </button>
            <button onClick={() => open({ type: "privacy" })}>Privacy settings</button>
            <button onClick={() => open({ type: "help" })}>
              How it works <CircleHelp size={13} />
            </button>
          </div>
        </footer>
      </main>
      {celebration && (
        <div className="quest-celebration" key={celebration} aria-hidden="true">
          <span className="celebration-medal"><Trophy size={42} /></span>
          {Array.from({ length: 16 }, (_, index) => (
            <i key={index} style={{ "--angle": `${index * 22.5}deg` } as React.CSSProperties} />
          ))}
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {modal && (
        <Dialog
          title={
            modal.type === "quest"
              ? modal.quest.title
              : modal.type === "goal"
                ? "What are you saving for?"
                : modal.type === "deposit"
                  ? "A little closer to your goal."
                  : {
                      help: "Small steps. Real rewards.",
                      welcome: "Welcome to MoneyQuest",
                      feedback: "Send feedback",
                      privacy: "Privacy settings",
                      share: "Share MoneyQuest",
                    }[modal.type]
          }
          label={
            modal.type === "quest"
              ? "YOUR NEXT MONEY QUEST"
              : modal.type === "goal"
                ? "GIVE YOUR SAVINGS A PURPOSE"
                : modal.type === "deposit"
                  ? modal.goal.title
                  : undefined
          }
          onClose={closeModal}
        >
          {modal.type === "welcome" && (
            <>
              <WelcomeSteps />
              <AnalyticsChoice enabled={analyticsEnabled} onChange={updateAnalytics} />
              <button className="button primary full-width" onClick={() => {
                closeModal();
                navigate("quests");
              }}>
                Explore quests <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button className="button full-width" onClick={closeModal}>Stay on overview</button>
            </>
          )}
          {modal.type === "privacy" && (
            <>
              <p className="modal-description">
                A browser cookie keeps your savings progress connected to this device. Usage analytics are optional, and you can change your choice here anytime.
              </p>
              <AnalyticsChoice enabled={analyticsEnabled} onChange={updateAnalytics} />
              <button className="button primary full-width" onClick={closeModal}>Done</button>
            </>
          )}
          {modal.type === "feedback" && (
            <form onSubmit={(event) => {
              event.preventDefault();
              if (!busy) void sendFeedback(String(new FormData(event.currentTarget).get("message") ?? ""));
            }}>
              <label htmlFor="feedback-message">What would you like us to know?</label>
              <p className="field-hint" id="feedback-hint">
                Up to 1,000 characters. Please leave out account details and other personal information.
              </p>
              <textarea id="feedback-message" name="message" rows={5} maxLength={1000}
                aria-describedby="feedback-hint" required readOnly={busy} />
              <button className="button primary full-width" type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send feedback"}
              </button>
            </form>
          )}
          {modal.type === "share" && (
            <>
              <p className="modal-description">Copy this link to invite someone to MoneyQuest.</p>
              <label className="share-link-label" htmlFor="share-link">MoneyQuest link</label>
              <input id="share-link" type="url" readOnly value={SHARE_URL} onFocus={(event) => event.currentTarget.select()} />
            </>
          )}
          {modal.type === "quest" &&
            (() => {
              const q = modal.quest,
                run = runFor(q),
                done = run?.status === "completed",
                Icon = questIcons[q.icon];
              const bonus = dailyBonus(q.id, data.today);
              return (
                <>
                  <div className="quest-dialog-meta">
                    <span className={`icon-tile ${q.color}`}>
                      <Icon size={23} />
                    </span>
                    <span>
                      <Zap size={14} /> {done ? run.xp : q.xp + bonus} XP
                    </span>
                    <span>
                      <Clock3 size={14} /> {q.duration}
                    </span>
                    <span>{q.repeat ? "Daily quest" : "One-time quest"}</span>
                  </div>
                  <p className="modal-description">{q.description}</p>
                  {!done && bonus > 0 && <p className="daily-bonus-note">Includes +{bonus} daily challenge XP.</p>}
                  <ol className="quest-steps">
                    {q.steps.map((step, i) => (
                      <li key={step}>
                        <span>{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  {done ? (
                    <div className="completed-message">
                      <CheckCheck size={26} />
                      <h3>A small win worth celebrating.</h3>
                      <p>
                        You saved {money(run.savingsCents, true)} and earned{" "}
                        {run.xp} XP.
                      </p>
                      <span>
                        {q.repeat
                          ? "This quest is ready for another round tomorrow."
                          : "You’ve added a new good habit to your story."}
                      </span>
                    </div>
                  ) : !run ? (
                    <>
                      <div className="modal-note">
                        <Leaf size={18} />
                        <p>
                          No timers, no pressure. Start the quest, give it a go,
                          and come back to log your win.
                        </p>
                      </div>
                      <button
                        className="button primary full-width"
                        disabled={busy || loading}
                        onClick={() =>
                          void mutate(
                            `/quests/${q.id}/start`,
                            {},
                            "Quest started. Your next small win is waiting.",
                          )
                        }
                      >
                        {busy ? (
                          <LoaderCircle className="spin" size={17} />
                        ) : (
                          <Flag size={17} />
                        )}{" "}
                        Start this quest <ArrowRight size={16} />
                      </button>
                    </>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const savings = Math.round(
                          Number(f.get("amount")) * 100,
                        );
                        await mutate(
                          `/quests/${q.id}/complete`,
                          {
                            savingsCents: savings,
                            goalId: f.get("goalId") || null,
                          },
                          "Quest complete!",
                          true,
                          q,
                        );
                      }}
                    >
                      <div className="form-divider" />
                      <label htmlFor="quest-amount">
                        How much did you actually save?
                      </label>
                      <div className="money-input">
                        <span>$</span>
                        <input
                          id="quest-amount"
                          name="amount"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="1000000"
                          step="0.01"
                          placeholder={String(q.estimate)}
                          required
                          autoFocus
                        />
                      </div>
                      <p className="field-hint">
                        The estimate is {money(q.estimate * 100)}. Every amount
                        counts, including $0.
                      </p>
                      {data.goals.length > 0 && (
                        <>
                          <label htmlFor="quest-goal">
                            Put this toward a goal{" "}
                            <span className="optional">(optional)</span>
                          </label>
                          <select id="quest-goal" name="goalId" defaultValue="">
                            <option value="">Just log my savings</option>
                            {data.goals.map((g) => (
                              <option value={g.id} key={g.id}>
                                {g.title}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                      <button
                        className="button primary full-width"
                        type="submit"
                        disabled={busy}
                      >
                        {busy ? (
                          <LoaderCircle className="spin" size={16} />
                        ) : (
                          <CheckCheck size={17} />
                        )}{" "}
                        Complete quest · +{q.xp + bonus} XP
                      </button>
                    </form>
                  )}
                </>
              );
            })()}
          {modal.type === "goal" && (
            <>
              <p className="modal-description">
                Big dreams grow from small, consistent steps. Pick something
                that’s yours.
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await mutate(
                    "/goals",
                    {
                      title: f.get("title"),
                      targetCents: Math.round(Number(f.get("target")) * 100),
                      savedCents: Math.round(Number(f.get("saved") || 0) * 100),
                    },
                    "A new goal. A new possibility. Let’s make it happen.",
                    true,
                  );
                }}
              >
                <label htmlFor="goal-title">My goal is…</label>
                <input
                  id="goal-title"
                  name="title"
                  maxLength={60}
                  placeholder="A rainy day fund, a weekend away…"
                  required
                  autoFocus
                />
                <div className="form-columns">
                  <div>
                    <label htmlFor="goal-target">Target amount</label>
                    <div className="money-input">
                      <span>$</span>
                      <input
                        id="goal-target"
                        name="target"
                        type="number"
                        min="0.01"
                        max="1000000"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="1,000"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="goal-saved">Already saved</label>
                    <div className="money-input">
                      <span>$</span>
                      <input
                        id="goal-saved"
                        name="saved"
                        type="number"
                        min="0"
                        max="1000000"
                        step="0.01"
                        inputMode="decimal"
                        defaultValue="0"
                      />
                    </div>
                  </div>
                </div>
                <p className="field-hint">
                  Only add money you’ve actually set aside. This is your own
                  savings record; no money moves through MoneyQuest.
                </p>
                <button
                  className="button primary full-width"
                  type="submit"
                  disabled={busy || loading}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Target size={17} />
                  )}{" "}
                  Create my goal <ArrowRight size={16} />
                </button>
              </form>
            </>
          )}
          {modal.type === "deposit" && (
            <>
              <p className="modal-description">
                You’ve saved{" "}
                <strong>{money(modal.goal.savedCents, true)}</strong> of your{" "}
                {money(modal.goal.targetCents)} goal. Every little addition
                matters.
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await mutate(
                    `/goals/${modal.goal.id}/deposit`,
                    { amountCents: Math.round(Number(f.get("amount")) * 100) },
                    "Savings added. Your future self says thanks.",
                    true,
                  );
                }}
              >
                <label htmlFor="deposit-amount">How much are you adding?</label>
                <div className="money-input">
                  <span>$</span>
                  <input
                    id="deposit-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>
                <p className="field-hint">
                  Add new savings only. Money already allocated from a quest is
                  counted automatically.
                </p>
                <button
                  className="button primary full-width"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Plus size={17} />
                  )}{" "}
                  Add to my goal
                </button>
              </form>
            </>
          )}
          {modal.type === "help" && (
            <div className="help-content">
              <p className="modal-description">
                A calmer, more rewarding way to build your money habits.
              </p>
              <div>
                <span className="icon-tile sage">
                  <Flag size={21} />
                </span>
                <p>
                  <strong>Pick a quest. Make a small change.</strong>Eight
                  practical challenges help you find savings in your everyday
                  routine. Log the amount you actually save.
                </p>
              </div>
              <div>
                <span className="icon-tile yellow">
                  <Zap size={21} />
                </span>
                <p>
                  <strong>Collect XP. Keep showing up.</strong>Earn XP from
                  quests and 10 XP for a daily check-in. Every 300 XP unlocks a
                  new level. Completing a quest also checks you in.
                </p>
              </div>
              <div>
                <span className="icon-tile peach">
                  <Target size={21} />
                </span>
                <p>
                  <strong>Give your progress a purpose.</strong>Create goals,
                  add savings, and watch them grow. Your history and CSV export
                  keep the full picture.
                </p>
              </div>
              <div className="modal-note">
                <ShieldCheck size={21} />
                <p>
                  Progress is saved securely and linked to this browser using a
                  cookie. No account or bank connection needed. Clearing
                  cookies, using private browsing, or switching devices starts a
                  separate journey. Export a CSV to keep a copy.
                </p>
              </div>
              <button
                className="button primary full-width"
                onClick={() => setModal(null)}
              >
                Let’s take a small step <ArrowRight size={16} />
              </button>
            </div>
          )}
          {modalError && (
            <p className="form-error" role="alert">
              {modalError}
            </p>
          )}
        </Dialog>
      )}
    </>
  );
}

function Stat({
  icon: Icon,
  color,
  label,
  value,
  detail,
  trend,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  value: React.ReactNode;
  detail: string;
  trend?: boolean;
}) {
  return (
    <article className="stat-card">
      <div className="stat-label">
        <span>{label}</span>
        <span className={`stat-icon ${color}`}>
          <Icon size={18} strokeWidth={1.7} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <p>
        {trend && <TrendingUp size={13} />} {detail}
      </p>
    </article>
  );
}
function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon size={36} strokeWidth={1.3} />
        <Sparkles size={17} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="button primary" onClick={onClick}>
        {action}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
