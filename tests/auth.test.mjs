import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  createApp,
  createAuthRepository,
  fetchApp,
} from "../dist/server/worker.js";
function harness() {
  const sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys=ON");
  sql.exec(
    readFileSync(
      new URL("../migrations/0001_demo.sql", import.meta.url),
      "utf8",
    ),
  );
  sql.exec(
    readFileSync(
      new URL("../migrations/0002_accounts.sql", import.meta.url),
      "utf8",
    ),
  );
  const db = {
    prepare(query) {
      let values = [];
      return {
        bind(...v) {
          values = v;
          return this;
        },
        async first() {
          return sql.prepare(query).get(...values) || null;
        },
        async run() {
          return {
            meta: { changes: sql.prepare(query).run(...values).changes },
          };
        },
      };
    },
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sql.exec("COMMIT");
        return results;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
  const repo = {
    async load(id) {
      const row = sql
        .prepare("SELECT state FROM demo_sessions WHERE id=? AND expires_at>?")
        .get(id, Date.now());
      return row ? JSON.parse(row.state) : null;
    },
    async save(id, state) {
      sql
        .prepare(
          "INSERT INTO demo_sessions VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,expires_at=excluded.expires_at",
        )
        .run(id, JSON.stringify(state), Date.now() + 604800000);
    },
  };
  const app = createApp(repo, createAuthRepository(db));
  let number = 0;
  function browser() {
    const cookies = new Map();
    const ip = "test-ip-" + ++number;
    return {
      cookies,
      header: () => Array.from(cookies, ([k, v]) => k + "=" + v).join("; "),
      async call(path, body, extra = {}) {
        const headers = {
          cookie: this.header(),
          "cf-connecting-ip": ip,
          ...(body !== undefined
            ? {
                origin: "https://test.local",
                "content-type": "application/json",
              }
            : {}),
          ...extra,
        };
        const request = new Request("https://test.local" + path, {
          method: body !== undefined ? "POST" : "GET",
          headers,
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        const r = await fetchApp(app, request);
        for (const c of r.headers.getSetCookie()) {
          const [name, ...value] = c.split(";")[0].split("=");
          if (c.includes("Max-Age=0")) cookies.delete(name);
          else cookies.set(name, value.join("="));
        }
        return r;
      },
    };
  }
  return { sql, app, browser };
}
const credentials = (name = "moonlight") => ({
  username: name,
  nickname: "小月亮",
  password: "a long test password",
  confirmPassword: "a long test password",
  adult: true,
  importGuest: true,
});
async function signup(browser, name) {
  const r = await browser.call("/api/auth/register", credentials(name));
  assert.equal(r.status, 200);
  return r.json();
}
test("registration imports guest data, hashes secrets, and returns only public account fields", async () => {
  const { sql, browser } = harness(),
    b = browser();
  await b.call("/");
  await b.call("/api/action", {
    type: "publish",
    topic: "日常碎片",
    content: "保留这颗星",
  });
  const result = await signup(b);
  assert.equal(result.state.posts[0].content, "保留这颗星");
  assert.equal(result.state.posts[0].author, "小月亮");
  assert.equal(result.state.account.username, "moonlight");
  assert.equal(result.recoveryCode.length, 32);
  assert.equal(b.cookies.has("weiyu_demo"), false);
  const stored = sql.prepare("SELECT * FROM users").get();
  assert.match(stored.password_hash, /^pbkdf2-sha256:100000:/);
  assert.ok(!stored.password_hash.includes(credentials().password));
  assert.notEqual(stored.recovery_hash, result.recoveryCode);
  const session = sql.prepare("SELECT * FROM auth_sessions").get();
  assert.notEqual(session.token_hash, b.cookies.get("weiyu_auth"));
  assert.equal(session.token_hash.length, 64);
  const html = await (await b.call("/me")).text();
  assert.match(html, /你的小宇宙，已妥善保存/);
  assert.ok(!html.includes(stored.password_hash));
  assert.ok(!html.includes(stored.recovery_hash));
  assert.ok(!html.includes(result.recoveryCode));
  assert.deepEqual(Object.keys(result.state.account).sort(), [
    "createdAt",
    "id",
    "username",
  ]);
});
test("validation and normalized duplicate accounts are rejected without partial records", async () => {
  const { sql, browser } = harness();
  for (const patch of [
    { adult: false },
    { nickname: "" },
    { username: "ab" },
    { username: "a@example.com" },
    { password: "short", confirmPassword: "short" },
    { confirmPassword: "different" },
  ]) {
    const r = await browser().call("/api/auth/register", {
      ...credentials(),
      ...patch,
    });
    assert.equal(r.status, 400);
  }
  assert.equal(sql.prepare("SELECT count(*) n FROM users").get().n, 0);
  const b = browser();
  await signup(b, "MoonLight");
  assert.equal(
    (await browser().call("/api/auth/register", credentials("MOONLIGHT")))
      .status,
    409,
  );
  assert.equal(sql.prepare("SELECT count(*) n FROM users").get().n, 1);
  assert.equal(sql.prepare("SELECT count(*) n FROM account_states").get().n, 1);
});
test("login restores across devices without merging guest data and isolates accounts", async () => {
  const { browser } = harness(),
    a = browser(),
    b = browser(),
    c = browser();
  await signup(a, "account_a");
  await a.call("/api/action", {
    type: "publish",
    topic: "日常碎片",
    content: "A 的私有记录",
  });
  await b.call("/");
  await b.call("/api/action", {
    type: "publish",
    topic: "日常碎片",
    content: "B 的游客记录",
  });
  const login = await b.call("/api/auth/login", {
    username: "ACCOUNT_A",
    password: credentials().password,
    remember: true,
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.getSetCookie().join(";"), /Max-Age=2592000/);
  let state = (await login.json()).state;
  assert.ok(state.posts.some((p) => p.content === "A 的私有记录"));
  assert.ok(!state.posts.some((p) => p.content === "B 的游客记录"));
  await signup(c, "account_c");
  state = await (await c.call("/api/state")).json();
  assert.equal(state.posts.length, 5);
  assert.notEqual(
    state.account.id,
    (await (await a.call("/api/state")).json()).account.id,
  );
  await c.call("/api/action", {
    type: "publish",
    topic: "日常碎片",
    content: "C 的记录",
    userId: state.account.id,
  });
  assert.equal((await (await a.call("/api/state")).json()).posts.length, 6);
});
test("logout revokes the token and leaves a fresh guest space", async () => {
  const { app, browser } = harness(),
    b = browser();
  await signup(b);
  const old = b.header();
  await b.call("/api/action", {
    type: "publish",
    topic: "日常碎片",
    content: "退出后不显示",
  });
  const r = await b.call("/api/auth/logout", {});
  assert.equal(r.status, 200);
  const state = (await r.json()).state;
  assert.equal(state.account, null);
  assert.equal(state.posts.length, 5);
  assert.equal(b.cookies.has("weiyu_auth"), false);
  const replay = await fetchApp(
    app,
    new Request("https://test.local/api/action", {
      method: "POST",
      headers: {
        cookie: old,
        origin: "https://test.local",
        "content-type": "application/json",
      },
      body: JSON.stringify({ type: "reset" }),
    }),
  );
  assert.equal(replay.status, 401);
});
test("password change revokes other sessions, rotates recovery code and preserves data", async () => {
  const { browser } = harness(),
    a = browser(),
    b = browser();
  const original = await signup(a);
  await b.call("/api/auth/login", {
    username: "moonlight",
    password: credentials().password,
  });
  await a.call("/api/action", { type: "save", id: "p1" });
  assert.equal(
    (
      await a.call("/api/auth/password", {
        currentPassword: "wrong",
        password: "new long test password",
        confirmPassword: "new long test password",
      })
    ).status,
    401,
  );
  const r = await a.call("/api/auth/password", {
    currentPassword: credentials().password,
    password: "new long test password",
    confirmPassword: "new long test password",
  });
  assert.equal(r.status, 200);
  const changed = await r.json();
  assert.notEqual(changed.recoveryCode, original.recoveryCode);
  assert.equal(changed.state.posts[0].saved, true);
  assert.equal((await (await b.call("/api/auth/me")).json()).account, null);
  assert.equal(
    (
      await browser().call("/api/auth/login", {
        username: "moonlight",
        password: credentials().password,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await browser().call("/api/auth/login", {
        username: "moonlight",
        password: "new long test password",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await browser().call("/api/auth/recover", {
        username: "moonlight",
        code: original.recoveryCode,
        password: "another new long password",
        confirmPassword: "another new long password",
      })
    ).status,
    401,
  );
});
test("recovery is single-use, rotates credentials and revokes all previous sessions", async () => {
  const { browser } = harness(),
    a = browser(),
    b = browser();
  const original = await signup(a);
  const payload = {
    username: "moonlight",
    code: original.recoveryCode
      .toUpperCase()
      .match(/.{1,8}/g)
      .join("-"),
    password: "recovered long password",
    confirmPassword: "recovered long password",
  };
  const r = await b.call("/api/auth/recover", payload);
  assert.equal(r.status, 200);
  const recovered = await r.json();
  assert.notEqual(recovered.recoveryCode, original.recoveryCode);
  assert.equal((await (await a.call("/api/auth/me")).json()).account, null);
  assert.equal(
    (await browser().call("/api/auth/recover", payload)).status,
    401,
  );
  assert.equal(
    (
      await browser().call("/api/auth/login", {
        username: "moonlight",
        password: "recovered long password",
      })
    ).status,
    200,
  );
});
test("logout all needs the current password and revokes every device", async () => {
  const { browser } = harness(),
    a = browser(),
    b = browser();
  await signup(a);
  await b.call("/api/auth/login", {
    username: "moonlight",
    password: credentials().password,
  });
  assert.equal(
    (await a.call("/api/auth/logout-all", { password: "wrong" })).status,
    401,
  );
  assert.equal(
    (await a.call("/api/auth/logout-all", { password: credentials().password }))
      .status,
    200,
  );
  assert.equal((await (await a.call("/api/auth/me")).json()).account, null);
  assert.equal((await (await b.call("/api/auth/me")).json()).account, null);
});
test("expired and fabricated sessions cannot read account data", async () => {
  const { sql, browser } = harness(),
    a = browser();
  await signup(a);
  sql.prepare("UPDATE auth_sessions SET expires_at=0").run();
  assert.equal((await (await a.call("/api/state")).json()).account, null);
  const b = browser();
  b.cookies.set("weiyu_auth", "a".repeat(64));
  assert.equal((await (await b.call("/api/state")).json()).account, null);
  assert.equal(sql.prepare("SELECT count(*) n FROM users").get().n, 1);
});
test("auth endpoints enforce same-origin JSON requests, body limits and rate limits", async () => {
  const { browser, app } = harness(),
    a = browser();
  assert.equal(
    (
      await a.call("/api/auth/register", credentials(), {
        origin: "https://evil.local",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await a.call("/api/auth/register", credentials(), {
        "content-type": "text/plain",
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await a.call("/api/auth/register", {
        ...credentials(),
        nickname: "x".repeat(20000),
      })
    ).status,
    413,
  );
  for (let i = 0; i < 12; i++)
    assert.equal(
      (
        await a.call("/api/auth/login", {
          username: "unknown_account",
          password: "not-the-password",
        })
      ).status,
      401,
    );
  const limited = await a.call("/api/auth/login", {
    username: "unknown_account",
    password: "not-the-password",
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "900");
  const malformed = await fetchApp(
    app,
    new Request("https://test.local/api/auth/login", {
      method: "POST",
      headers: {
        origin: "https://test.local",
        "content-type": "application/json",
      },
      body: "{",
    }),
  );
  assert.equal(malformed.status, 400);
});
test("direct login/register/recover pages SSR the corresponding form", async () => {
  const { browser } = harness(),
    b = browser();
  for (const [path, label] of [
    ["/login", "欢迎回到未遇"],
    ["/register", "认识你，很高兴"],
    ["/recover", "找回你的小宇宙"],
  ]) {
    const r = await b.call(path);
    assert.equal(r.status, 200);
    assert.match(await r.text(), new RegExp(label));
  }
});
