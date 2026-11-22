import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import { analyticsDaily, feedback } from "../db/schema.ts";
import { cookieName, csv, dateRange, newSession, ownerPath, validSession } from "../netlify/server/owner-security.ts";

const origin = "https://owner.example";
const key = "a".repeat(64);
const savedKey = process.env.MONEYQUEST_OWNER_KEY;
const savedOrigin = process.env.MONEYQUEST_OWNER_ORIGIN;
process.env.MONEYQUEST_OWNER_KEY = key;
process.env.MONEYQUEST_OWNER_ORIGIN = origin;
after(() => {
  if (savedKey === undefined) delete process.env.MONEYQUEST_OWNER_KEY;
  else process.env.MONEYQUEST_OWNER_KEY = savedKey;
  if (savedOrigin === undefined) delete process.env.MONEYQUEST_OWNER_ORIGIN;
  else process.env.MONEYQUEST_OWNER_ORIGIN = savedOrigin;
});

const selections = mock.fn(() => ({
  from(table) {
    return {
      where() {
        return {
          orderBy() {
            if (table === analyticsDaily)
              return Promise.resolve([{ day: "2025-01-01", metric: "visit", count: 9 }]);
            assert.equal(table, feedback);
            return { limit: () => ({ offset: async () => [{
              message: '=1+1 <script>alert("feedback")</script>',
              createdAt: new Date("2025-01-01T12:00:00Z"),
            }] }) };
          },
        };
      },
    };
  },
}));
mock.module("../db/index.ts", {
  exports: { db: { select: selections } },
});
const { default: app } = await import("../netlify/server/app.ts");

function request(path, options) {
  return app.request(origin + ownerPath + path, options);
}

function post(path, value, requestOrigin = origin) {
  return request(path, {
    method: "POST",
    headers: { Origin: requestOrigin },
    body: new URLSearchParams({ key: value }),
  });
}

test("configuration failures are distinguished in server logs and stay private", async (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  const cases = [
    { key: "", origin: "", reasons: ["key_missing", "origin_missing"] },
    { key: "invalid-secret", origin: "https://private.example/path", reasons: ["key_invalid", "origin_invalid"] },
    { key, origin: "https://private.example", reasons: ["request_url_origin_mismatch"] },
  ];
  const before = selections.mock.callCount();
  try {
    for (const config of cases) {
      process.env.MONEYQUEST_OWNER_KEY = config.key;
      process.env.MONEYQUEST_OWNER_ORIGIN = config.origin;
      for (let i = 0; i < 2; i++) {
        const response = await request("", {
          headers: { "X-Forwarded-Host": "private.example", "X-Forwarded-Proto": "https" },
        });
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), { error: "Not found." });
        assert.equal(response.headers.get("set-cookie"), null);
        assert.match(response.headers.get("cache-control"), /no-store/);
      }
    }
  } finally {
    process.env.MONEYQUEST_OWNER_KEY = key;
    process.env.MONEYQUEST_OWNER_ORIGIN = origin;
  }
  assert.deepEqual(warn.mock.calls.map(({ arguments: args }) => args),
    cases.flatMap(({ reasons }) => reasons.map((reason) => [`MoneyQuest owner configuration: ${reason}`])));
  assert.equal(selections.mock.callCount(), before);
});

test("equivalent HTTPS origins and hex key formatting work with sign-in", async () => {
  process.env.MONEYQUEST_OWNER_KEY = ` ${key.toUpperCase()}\n`;
  process.env.MONEYQUEST_OWNER_ORIGIN = " HTTPS://OWNER.EXAMPLE:443/ ";
  try {
    assert.equal((await request("")).status, 401);
    assert.equal((await post("/login", key.toUpperCase())).status, 303);
    for (const invalid of ["http://owner.example", origin + "?", origin + "#",
      origin + "/other/..", "https://user@owner.example"]) {
      process.env.MONEYQUEST_OWNER_ORIGIN = invalid;
      assert.equal((await request("")).status, 404);
    }
  } finally {
    process.env.MONEYQUEST_OWNER_KEY = key;
    process.env.MONEYQUEST_OWNER_ORIGIN = origin;
  }
});

test("owner routes fail closed and do not query the database before authentication", async () => {
  const before = selections.mock.callCount();
  assert.equal((await request("")).status, 401);
  for (const path of ["/export/activity", "/export/feedback", "/unknown"]) {
    const response = await request(path);
    assert.equal(response.status, 401);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.equal((await post("/login", key, "https://other.example")).status, 403);
  assert.equal((await post("/login", "b".repeat(64))).status, 401);
  assert.equal((await app.request("https://other.example" + ownerPath)).status, 404);
  delete process.env.MONEYQUEST_OWNER_KEY;
  try {
    assert.equal((await request("")).status, 404);
  } finally {
    process.env.MONEYQUEST_OWNER_KEY = key;
  }
  assert.equal(selections.mock.callCount(), before);
});

test("owner form verifies matching Origin or a same-origin browser fallback", async () => {
  const signIn = await request("");
  assert.equal(signIn.headers.get("referrer-policy"), "same-origin");
  const verify = (headers, path = "/login") => request(path, {
    method: "POST", headers, body: new URLSearchParams({ key }),
  });

  const accepted = [
    { Origin: origin },
    { Referer: origin + ownerPath },
    { "Sec-Fetch-Site": "same-origin" },
    { Origin: "null", "Sec-Fetch-Site": "same-origin" },
    { Origin: "null", Referer: origin + ownerPath },
  ];
  for (const headers of accepted) {
    const response = await verify(headers);
    assert.equal(response.status, 303, JSON.stringify(headers));
    assert.equal(response.headers.get("location"), ownerPath);
    const cookie = response.headers.get("set-cookie");
    assert.match(cookie, /; Max-Age=7200/i);
    assert.match(cookie, /; Path=\/api\/owner/i);
    assert.match(cookie, /; Secure/i);
    assert.match(cookie, /; HttpOnly/i);
    assert.match(cookie, /; SameSite=Strict/i);
    assert.equal((await request("?start=2025-01-01&end=2025-01-02", {
      headers: { Cookie: cookie.split(";")[0] },
    })).status, 200);
  }

  const denied = [
    {},
    { Origin: "null" },
    { Origin: "https://other.example", Referer: origin, "Sec-Fetch-Site": "same-origin" },
    { Origin: "", Referer: origin },
    { Origin: origin, "Sec-Fetch-Site": "same-site" },
    { Origin: "null", Referer: origin, "Sec-Fetch-Site": "cross-site" },
    { Referer: "https://other.example", "Sec-Fetch-Site": "same-origin" },
    { Referer: "blob:" + origin + "/id" },
    { "X-Forwarded-Host": "owner.example" },
  ];
  for (const headers of denied) {
    const response = await verify(headers);
    assert.equal(response.status, 403, JSON.stringify(headers));
    assert.equal(response.headers.get("set-cookie"), null);
  }

  const login = await verify(accepted[1]);
  const Cookie = login.headers.get("set-cookie").split(";")[0];
  const rejectedLogout = await verify({ Cookie, Origin: "https://other.example" }, "/logout");
  assert.equal(rejectedLogout.status, 403);
  assert.equal(rejectedLogout.headers.get("set-cookie"), null);
  const logout = await verify({ Cookie, Referer: origin + ownerPath }, "/logout");
  assert.equal(logout.status, 303);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await request("", { headers: { Cookie: logout.headers.get("set-cookie").split(";")[0] } })).status, 401);
});

test("owner session protects dashboard and CSV, and feedback renders as text", async () => {
  const login = await post("/login", key);
  assert.equal(login.status, 303);
  const setCookie = login.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=Strict/i);
  assert.match(setCookie, /Path=\/api\/owner/);
  assert.ok(!setCookie.includes(key));
  const Cookie = setCookie.split(";")[0];
  const headers = { Cookie };
  const query = "?start=2025-01-01&end=2025-01-02";
  const page = await request(query, { headers });
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  const body = await page.text();
  assert.match(body, /2025-01-02/);
  assert.match(body, /&lt;script&gt;/);
  assert.doesNotMatch(body, /<script>/);
  const activity = await request("/export/activity" + query, { headers });
  assert.equal(activity.status, 200);
  assert.match(activity.headers.get("content-disposition"), /^attachment;/);
  assert.match(await activity.text(), /"2025-01-01",9,0\r\n"2025-01-02",0,0/);
  const messages = await request("/export/feedback" + query, { headers });
  assert.equal(messages.status, 200);
  assert.match(await messages.text(), /"2025-01-01T12:00:00.000Z","'=1\+1/);
  assert.equal((await request("/export/feedback?start=2025-02-30", { headers })).status, 400);
  assert.equal((await request(query, { headers: { Cookie: Cookie + "f" } })).status, 401);
  const logout = await request("/logout", { method: "POST", headers: { ...headers, Origin: origin } });
  assert.equal(logout.status, 303);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
});

test("sessions expire and are bound to the origin and current key", () => {
  const now = Date.UTC(2025, 0, 1);
  const session = newSession(key, origin, now);
  assert.equal(validSession(session, key, origin, now), true);
  assert.equal(validSession(session, key, origin, now + 7_200_000), false);
  assert.equal(validSession(session, "b".repeat(64), origin, now), false);
  assert.equal(validSession(session, key, "https://other.example", now), false);
  assert.equal(validSession("", key, origin, now), false);
  assert.equal(cookieName.startsWith("__Secure-"), true);
});

test("date filters use inclusive UTC days and CSV escapes cells", () => {
  const now = Date.UTC(2025, 2, 30);
  const range = dateRange(new URLSearchParams("start=2025-03-29&end=2025-03-30"), now);
  assert.deepEqual(range.days, ["2025-03-29", "2025-03-30"]);
  assert.equal(range.until.toISOString(), "2025-03-31T00:00:00.000Z");
  for (const query of ["end=2025-02-30", "end=2025-03-31", "start=2024-03-29", "start=2025-03-30&end=2025-03-29"])
    assert.equal(dateRange(new URLSearchParams(query), now), undefined);
  assert.equal(csv([['"quoted",\nmessage', "  =1+1"]]), '"""quoted"",\nmessage","\'  =1+1"\r\n');
});
