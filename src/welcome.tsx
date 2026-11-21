import { Flag, Target, Zap } from "lucide-react";

export const SHARE_URL = "https://money-saving-app-506a15.netlify.app/";
const analyticsKey = "moneyquest:analytics";
const welcomeKey = "moneyquest:welcome";
const visitKey = "moneyquest:visit";
export const analyticsHeader = "X-MoneyQuest-Analytics";

function readPreference(key: string) {
  try {
    return localStorage.getItem(key) === "yes";
  } catch {
    return false;
  }
}

function writePreference(key: string, enabled: boolean) {
  try {
    localStorage.setItem(key, enabled ? "yes" : "no");
  } catch {
    // The current page can still use the visitor's choice.
  }
}

export const hasSeenWelcome = () => readPreference(welcomeKey);
export const rememberWelcome = () => writePreference(welcomeKey, true);
export const analyticsAllowed = () =>
  (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl !== true;
export const analyticsPreference = () => analyticsAllowed() && readPreference(analyticsKey);
export const saveAnalyticsPreference = (enabled: boolean) =>
  writePreference(analyticsKey, enabled && analyticsAllowed());

export function recordVisit() {
  try {
    if (sessionStorage.getItem(visitKey)) return;
    sessionStorage.setItem(visitKey, "yes");
  } catch {
    // Without a session marker, avoid counting repeat page loads.
    return;
  }
  void fetch("/api/analytics/visit", {
    method: "POST",
    headers: { [analyticsHeader]: "1" },
    credentials: "omit",
    referrerPolicy: "no-referrer",
    keepalive: true,
  }).catch(() => {});
}

export function AnalyticsChoice({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const available = analyticsAllowed();
  return (
    <div className="analytics-choice">
      <label>
        <input
          type="checkbox"
          checked={available && enabled}
          disabled={!available}
          onChange={(event) => onChange(event.currentTarget.checked)}
          aria-describedby="analytics-description"
        />
        <span>Share anonymous usage counts</span>
      </label>
      <p id="analytics-description">
        {available
          ? "Help improve MoneyQuest by sharing daily totals for visits and quest completions. These totals contain no profile identifiers, savings amounts, or goals."
          : "Your browser’s Global Privacy Control signal keeps optional analytics off."}
      </p>
    </div>
  );
}

export function WelcomeSteps() {
  return (
    <>
      <p className="modal-description">Build a savings habit one small win at a time.</p>
      <ul className="welcome-steps">
        <li><span className="icon-tile lavender"><Flag size={19} aria-hidden="true" /></span> Pick a daily challenge and log what you save.</li>
        <li><span className="icon-tile yellow"><Zap size={19} aria-hidden="true" /></span> Earn XP, build a streak, and unlock badges.</li>
        <li><span className="icon-tile sage"><Target size={19} aria-hidden="true" /></span> Set a goal or try the weekly savings mission.</li>
      </ul>
      <p className="field-hint">Your progress is saved to this browser. No account or bank connection is needed.</p>
    </>
  );
}
