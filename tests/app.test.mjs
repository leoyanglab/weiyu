import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp, safeJSON, fetchApp } from "../dist/server/worker.js";
function harness() {
  const rows = new Map();
  const repo = {
    async load(id) {
      return rows.has(id) ? structuredClone(rows.get(id)) : null;
    },
    async save(id, state) {
      rows.set(id, structuredClone(state));
    },
  };
  const app = createApp(repo);
  return { app, rows };
}
async function visitor(app) {
  const r = await app.fetch(new Request("https://test.local/"));
  assert.equal(r.status, 200);
  const cookie = r.headers.get("set-cookie").split(";")[0];
  return {
    cookie,
    html: await r.text(),
    get: () =>
      app.fetch(
        new Request("https://test.local/api/state", { headers: { cookie } }),
      ),
    action: (a, headers = {}) =>
      app.fetch(
        new Request("https://test.local/api/action", {
          method: "POST",
          headers: {
            cookie,
            origin: "https://test.local",
            "content-type": "application/json",
            ...headers,
          },
          body: JSON.stringify(a),
        }),
      ),
  };
}
test("SSR has real feed content, hydration data and built assets on every route", async () => {
  const { app } = harness();
  for (const path of ["/", "/match", "/messages", "/me"]) {
    const r = await app.fetch(new Request("https://test.local" + path));
    const html = await r.text();
    assert.equal(r.status, 200);
    assert.match(html, /<div id="app"><div/);
    assert.match(html, /<script type="application\/json" id="bootstrap">/);
    assert.match(html, /\/assets\/index-.*\.js/);
    assert.match(html, /\.css/);
    assert.equal(r.headers.get("cache-control"), "private, no-store");
    assert.match(
      r.headers.get("set-cookie"),
      /HttpOnly; SameSite=Strict; Max-Age=604800; Secure/,
    );
  }
  const v = await visitor(app);
  assert.match(v.html, /理想中的约会/);
  assert.match(v.html, /演示角色/);
});
test("publishing, likes, comments, saves and reload stay isolated between visitors", async () => {
  const { app } = harness(),
    a = await visitor(app),
    b = await visitor(app);
  assert.notEqual(a.cookie, b.cookie);
  let r = await a.action({
    type: "publish",
    content: "今天想一起看日落",
    topic: "城市漫游",
  });
  assert.equal(r.status, 200);
  let state = await r.json(),
    id = state.posts[0].id;
  for (const action of [
    { type: "like", id },
    { type: "save", id },
    { type: "comment", id, text: "那就约好。" },
  ])
    assert.equal((await a.action(action)).status, 200);
  state = await (await a.get()).json();
  assert.equal(state.posts[0].liked, true);
  assert.equal(state.posts[0].saved, true);
  assert.equal(state.posts[0].comments[0].text, "那就约好。");
  assert.equal((await (await b.get()).json()).posts.length, 5);
  const html = await (
    await app.fetch(
      new Request("https://test.local/", { headers: { cookie: a.cookie } }),
    )
  ).text();
  assert.match(html, /今天想一起看日落/);
});
test("match, demo messages, heart and consent have a complete lifecycle", async () => {
  const { app } = harness(),
    a = await visitor(app);
  assert.equal((await a.action({ type: "message", text: "hi" })).status, 400);
  await a.action({ type: "match" });
  let state = await (
    await a.action({ type: "message", text: "一起散步吧" })
  ).json();
  assert.equal(state.messages.length, 3);
  assert.match(state.messages[2].text, /演示回复/);
  state = await (await a.action({ type: "heart" })).json();
  assert.equal(state.heart, true);
  state = await (
    await a.action({ type: "decision", value: "申请交换资料" })
  ).json();
  assert.equal(state.decision, "申请交换资料");
  assert.equal(state.matched, true);
  state = await (
    await a.action({ type: "decision", value: "结束这段相遇" })
  ).json();
  assert.equal(state.matched, false);
  assert.equal(state.heart, false);
  assert.equal(state.messages.length, 1);
});
test("profile, blocking, reporting and reset persist", async () => {
  const { app } = harness(),
    a = await visitor(app);
  await a.action({
    type: "profile",
    name: "小星星",
    bio: "慢慢认识",
    intent: "先做朋友，顺其自然",
  });
  await a.action({ type: "report", id: "p1" });
  let state = await (await a.action({ type: "block", id: "p1" })).json();
  assert.equal(state.profile.name, "小星星");
  assert.deepEqual(state.reports, ["p1"]);
  assert.deepEqual(state.blocked, ["把月亮寄给你"]);
  assert.equal(
    (await a.action({ type: "comment", id: "p1", text: "不能再操作" })).status,
    400,
  );
  state = await (await a.action({ type: "reset" })).json();
  assert.equal(state.profile.name, "路过的星星");
  assert.equal(state.blocked.length, 0);
});
test("untrusted text cannot break out of SSR bootstrap or inject markup", async () => {
  const { app } = harness(),
    a = await visitor(app);
  const payload =
    "</script><script>alert(1)</script><img src=x onerror=alert(2)>";
  await a.action({ type: "publish", content: payload, topic: "日常碎片" });
  const html = await (
    await app.fetch(
      new Request("https://test.local/", { headers: { cookie: a.cookie } }),
    )
  ).text();
  assert.ok(!html.includes(payload));
  const bootstrap = html.match(/id="bootstrap">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(bootstrap).posts[0].content, payload);
  assert.ok(!safeJSON({ a: payload }).includes("<"));
  assert.match(html, /&lt;script>/);
});
test("cross-origin, malformed, oversized and invalid actions are rejected", async () => {
  const { app } = harness(),
    a = await visitor(app);
  assert.equal(
    (await a.action({ type: "reset" }, { origin: "https://evil.local" }))
      .status,
    403,
  );
  assert.equal(
    (await a.action({ type: "reset" }, { "content-type": "text/plain" }))
      .status,
    415,
  );
  for (const action of [
    { type: "publish", content: "", topic: "日常碎片" },
    { type: "publish", content: "a".repeat(501), topic: "日常碎片" },
    { type: "publish", content: "hello", topic: "假话题" },
    { type: "like", id: "missing" },
    { type: "nope" },
    null,
  ])
    assert.equal((await a.action(action)).status, 400);
  assert.equal(
    (
      await a.action({
        type: "publish",
        content: "x".repeat(11000),
        topic: "日常碎片",
      })
    ).status,
    413,
  );
  const bad = await app.fetch(
    new Request("https://test.local/api/action", {
      method: "POST",
      headers: {
        origin: "https://test.local",
        "content-type": "application/json",
      },
      body: "{",
    }),
  );
  assert.equal(bad.status, 400);
  assert.equal(
    (await app.fetch(new Request("https://test.local/not-found"))).status,
    404,
  );
});

test("Workers adapter returns native, empty-body HEAD responses", async () => {
  const { app } = harness();
  for (const path of ["/", "/api/health", "/missing"]) {
    const response = await fetchApp(
      app,
      new Request("https://test.local" + path, { method: "HEAD" }),
    );
    assert.ok(response instanceof Response);
    assert.equal(response.status, path === "/missing" ? 404 : 200);
    assert.equal(await response.text(), "");
  }
});
