import { H3 } from "h3";
import { renderToString } from "preact-render-to-string";
import { App } from "../app";
import { createStore, StoreContext } from "../store";
import {
  initialState,
  mutate,
  viewFromPath,
  authModalFromPath,
  type State,
  type Action,
} from "../data";
import {
  createAuthRepository,
  currentUser,
  publicAccount,
  cookie,
  sessionCookie,
  type AuthRepository,
  type Database,
} from "./auth";
import { registerAuthRoutes } from "./auth-routes";
export { createAuthRepository } from "./auth";
declare const __CLIENT_ASSETS__: { file: string; css?: string[] };
export interface Repository {
  load(id: string): Promise<State | null>;
  save(id: string, state: State): Promise<void>;
}
interface Env {
  DB: Database;
  ASSETS: { fetch(req: Request): Promise<Response> };
}
const WEEK = 7 * 86400;
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export const safeJSON = (v: unknown) =>
  JSON.stringify(v)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
export function createApp(repo: Repository, auth?: AuthRepository) {
  const app = new H3();
  const guest = async (request: Request) => {
    let id = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)weiyu_demo=([a-f0-9]{64})(?:;|$)/)?.[1];
    let state = id ? await repo.load(id) : null;
    if (!state) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
        x.toString(16).padStart(2, "0"),
      ).join("");
      state = initialState();
      await repo.save(id, state);
    }
    return { id: id!, state: { ...state, account: null } };
  };
  if (auth) registerAuthRoutes(app, auth, guest);
  const session = async (request: Request) => {
    const user = auth ? await currentUser(auth, request) : null;
    if (user && auth) {
      const state = await auth.load(user.id);
      if (!state) throw new Error("Missing account state");
      return {
        id: "",
        state: { ...state, account: publicAccount(user) },
        user,
      };
    }
    return { ...(await guest(request)), user: null };
  };
  const withCookie = (r: Response, id: string, req: Request) => {
    if (!id) return r;
    if (cookie(req, "weiyu_auth"))
      r.headers.append("Set-Cookie", sessionCookie(req, "", 0));
    r.headers.append(
      "Set-Cookie",
      `weiyu_demo=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${WEEK}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
    );
    return r;
  };
  app.get("/api/health", () =>
    json({
      ok: true,
      app: "weiyu",
      render: "preact-ssr",
      server: "h3-v2",
      database: auth ? "accounts-and-isolated-demo" : "isolated-demo",
    }),
  );
  app.get("/api/state", async (e) => {
    const req = e.req as Request;
    const { id, state } = await session(req);
    return withCookie(json(state), id, req);
  });
  app.post("/api/action", async (e) => {
    const req = e.req as Request;
    if (req.headers.get("origin") !== new URL(req.url).origin)
      return json({ error: "请求来源不匹配" }, 403);
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      return json({ error: "需要 JSON 请求" }, 415);
    try {
      if (Number(req.headers.get("content-length")) > 10000)
        return json({ error: "请求过大" }, 413);
      const raw = await req.text();
      if (raw.length > 10000) return json({ error: "请求过大" }, 413);
      const action = JSON.parse(raw) as Action;
      if (!action || typeof action !== "object" || Array.isArray(action))
        return json({ error: "无效操作" }, 400);
      const { id, state, user } = await session(req);
      if (auth && cookie(req, "weiyu_auth") && !user)
        return json({ error: "会话已失效，请重新登录" }, 401);
      const next = mutate(state, action);
      next.account = user ? publicAccount(user) : null;
      if (user && auth) await auth.save(user.id, next);
      else await repo.save(id, next);
      return withCookie(json(next), id, req);
    } catch (error) {
      if (error instanceof SyntaxError)
        return json({ error: "JSON 格式错误" }, 400);
      if (
        error instanceof Error &&
        [
          "请填写",
          "动态不存在",
          "话题不存在",
          "消息已达",
          "评论已达",
          "演示动态已达",
          "请先开启",
          "无效选择",
          "不支持的操作",
          "不能屏蔽",
        ].some((x) => error.message.startsWith(x))
      )
        return json({ error: error.message }, 400);
      console.error("Demo action failed");
      return json({ error: "演示服务暂时不可用，请稍后再试" }, 503);
    }
  });
  for (const path of [
    "/",
    "/match",
    "/messages",
    "/me",
    "/login",
    "/register",
    "/recover",
  ])
    app.get(path, async (e) => {
      const req = e.req as Request;
      const { id, state } = await session(req);
      const store = createStore(
        state,
        viewFromPath(path),
        state.account ? "" : authModalFromPath(path),
      );
      const body = renderToString(
        <StoreContext.Provider value={store}>
          <App />
        </StoreContext.Provider>,
      );
      const assets = __CLIENT_ASSETS__;
      const title =
        path === "/login"
          ? "登录"
          : path === "/register"
            ? "注册"
            : path === "/recover"
              ? "找回账号"
              : path === "/match"
                ? "遇见同频"
                : path === "/messages"
                  ? "私语信箱"
                  : path === "/me"
                    ? "我的小宇宙"
                    : "心动广场";
      const response = new Response(
        `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f7f8fc"><meta name="robots" content="noindex,nofollow"><meta name="description" content="未遇：先对话，再心动。匿名恋爱社交 Web 原型，所有角色和互动均为模拟。"><title>${title} · 未遇 WEIYU</title><link rel="icon" href="/favicon.svg">${(assets.css || []).map((p) => `<link rel="stylesheet" href="/${p}">`).join("")}</head><body><div id="app">${body}</div><script type="application/json" id="bootstrap">${safeJSON(state)}</script><script type="module" src="/${assets.file}"></script></body></html>`,
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "same-origin",
            "X-Frame-Options": "DENY",
            "Content-Security-Policy":
              "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
          },
        },
      );
      return withCookie(response, id, req);
    });
  app.all("/api/**", () => json({ error: "接口不存在" }, 404));
  app.all(
    "/**",
    () =>
      new Response("这个小宇宙还没有这颗星。", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
  );
  return app;
}
function repository(env: Env): Repository {
  return {
    async load(id) {
      const row = await env.DB.prepare(
        "SELECT state FROM demo_sessions WHERE id = ? AND expires_at > ?",
      )
        .bind(id, Date.now())
        .first<{ state: string }>();
      return row ? JSON.parse(row.state) : null;
    },
    async save(id, state) {
      await env.DB.prepare(
        "INSERT INTO demo_sessions (id, state, expires_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET state = excluded.state, expires_at = excluded.expires_at",
      )
        .bind(id, JSON.stringify(state), Date.now() + WEEK * 1000)
        .run();
    },
  };
}
// H3 can return srvx FastResponse for HEAD; Workers requires a native Response.
export function toNativeResponse(response: Response, head = false): Response {
  return new Response(head ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
export async function fetchApp(
  app: ReturnType<typeof createApp>,
  request: Request,
) {
  const head = request.method === "HEAD";
  const response = await app.fetch(
    head ? new Request(request, { method: "GET" }) : request,
  );
  return toNativeResponse(response, head);
}
export default {
  async fetch(request: Request, env: Env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/assets/") || path === "/favicon.svg")
      return env.ASSETS.fetch(request);
    try {
      return await fetchApp(
        createApp(repository(env), createAuthRepository(env.DB)),
        request,
      );
    } catch {
      console.error("Demo request failed");
      return json({ error: "演示服务暂时不可用，请稍后再试" }, 503);
    }
  },
  async scheduled(_controller: unknown, env: Env) {
    await env.DB.prepare("DELETE FROM demo_sessions WHERE expires_at <= ?")
      .bind(Date.now())
      .run();
    await env.DB.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?")
      .bind(Date.now())
      .run();
    await env.DB.prepare("DELETE FROM auth_limits WHERE expires_at <= ?")
      .bind(Date.now())
      .run();
  },
};
