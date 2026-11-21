import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ownerPath = "/api/owner";
export const sessionSeconds = 2 * 60 * 60;
export const cookieName = "__Secure-mq_owner";

export function ownerConfig() {
  const key = process.env.MONEYQUEST_OWNER_KEY ?? "";
  const origin = process.env.MONEYQUEST_OWNER_ORIGIN ?? "";
  if (!/^[a-f0-9]{64}$/.test(key)) return;
  const url = URL.parse(origin);
  if (!url || url.protocol !== "https:" || url.origin !== origin) return;
  return { key, origin };
}

export function matchesKey(value: string, key: string) {
  return /^[a-f0-9]{64}$/.test(value) &&
    timingSafeEqual(Buffer.from(value, "hex"), Buffer.from(key, "hex"));
}

function signature(key: string, origin: string, payload: string) {
  return createHmac("sha256", Buffer.from(key, "hex"))
    .update(`moneyquest-owner-session-v1|${origin}|${payload}`)
    .digest("hex");
}

export function newSession(key: string, origin: string, now = Date.now()) {
  const payload = `${now + sessionSeconds * 1000}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${signature(key, origin, payload)}`;
}

export function validSession(token: string, key: string, origin: string, now = Date.now()) {
  if (!/^\d{13}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires, nonce, mac] = token.split(".");
  return Number(expires) > now &&
    Number(expires) <= now + sessionSeconds * 1000 &&
    matchesKey(mac, signature(key, origin, `${expires}.${nonce}`));
}

const dayMs = 86_400_000;

function utcDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return NaN;
  const stamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(stamp) || isoDay(stamp) !== value) return NaN;
  return stamp;
}

function isoDay(stamp: number) {
  return new Date(stamp).toISOString().slice(0, 10);
}

export function dateRange(query: URLSearchParams, now = Date.now()) {
  const today = isoDay(now);
  const end = query.get("end") ?? today;
  const finish = utcDay(end);
  if (!Number.isFinite(finish) || end > today) return;
  const start = query.get("start") ?? isoDay(finish - 29 * dayMs);
  const begin = utcDay(start);
  if (!Number.isFinite(begin) || begin > finish || finish - begin >= 366 * dayMs) return;
  return {
    start, end, today, from: new Date(begin), until: new Date(finish + dayMs),
    days: Array.from({ length: (finish - begin) / dayMs + 1 }, (_, i) => isoDay(begin + i * dayMs)),
  };
}

export function csv(rows: (string | number)[][]) {
  return rows.map((row) => row.map((value) => {
    if (typeof value === "number") return String(value);
    // Spreadsheet apps may ignore leading whitespace or control characters.
    const safe = /^[\s\p{Cc}\p{Cf}]*[=+@\-＝＋＠－]|^[\t\r\n]/u.test(value) ? "'" + value : value;
    return '"' + safe.replaceAll('"', '""') + '"';
  }).join(",")).join("\r\n") + "\r\n";
}
