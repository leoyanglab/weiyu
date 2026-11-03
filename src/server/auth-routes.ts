import { type H3 } from "h3";
import { initialState, mutate, type State } from "../data";
import {
  AuthError,
  type AuthRepository,
  type User,
  cookie,
  currentUser,
  digest,
  equal,
  hashPassword,
  password,
  publicAccount,
  randomToken,
  recoveryHash,
  sessionCookie,
  sessionHash,
  username,
  verifyPassword,
} from "./auth";
type Guest = (request: Request) => Promise<{ id: string; state: State }>;
const DAY = 86400;
export function authJSON(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function readJSON(req: Request): Promise<Record<string, unknown>> {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    throw new AuthError("请求来源不匹配", 403);
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new AuthError("需要 JSON 请求", 415);
  if (Number(req.headers.get("content-length")) > 16000)
    throw new AuthError("请求过大", 413);
  let total = 0;
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > 16000) {
          await reader.cancel();
          throw new AuthError("请求过大", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw Error();
    return body;
  } catch {
    throw new AuthError("JSON 格式错误");
  }
}
export function registerAuthRoutes(
  app: H3,
  repo: AuthRepository,
  guest: Guest,
) {
  const limit = async (req: Request, operation: string, name?: string) => {
    const ip = req.headers.get("cf-connecting-ip") || "local";
    const seconds = operation === "register" ? 3600 : 900;
    const max =
      operation === "register" ? 6 : operation === "recover" ? 15 : 60;
    if (
      !(await repo.allow(await digest(`ip:${operation}:${ip}`), max, seconds))
    )
      throw new AuthError("操作过于频繁，请稍后再试", 429);
    if (
      name &&
      !(await repo.allow(
        await digest(`account:${operation}:${name}`),
        operation === "recover" ? 5 : 12,
        900,
      ))
    )
      throw new AuthError("操作过于频繁，请稍后再试", 429);
  };
  const requireUser = async (req: Request) => {
    const u = await currentUser(repo, req);
    if (!u) throw new AuthError("会话已失效，请重新登录", 401);
    return u;
  };
  const signedIn = async (
    req: Request,
    u: User,
    remember: boolean,
    recoveryCode?: string,
  ) => {
    const token = randomToken(),
      seconds = (remember ? 30 : 7) * DAY;
    if (
      !(await repo.issue(
        u,
        await sessionHash(token),
        Date.now() + seconds * 1000,
      ))
    )
      throw new AuthError("账号信息已更新，请重新登录", 409);
    const state = await repo.load(u.id);
    if (!state) throw new Error("Missing account state");
    const r = authJSON({
      state: { ...state, account: publicAccount(u) },
      ...(recoveryCode ? { recoveryCode } : {}),
    });
    r.headers.append("Set-Cookie", sessionCookie(req, token, seconds));
    r.headers.append(
      "Set-Cookie",
      `weiyu_demo=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
    );
    return r;
  };
  const signedOut = async (req: Request) => {
    const headers = new Headers(req.headers);
    headers.delete("cookie");
    const g = await guest(new Request(req.url, { method: "GET", headers }));
    const r = authJSON({ state: { ...g.state, account: null } });
    r.headers.append("Set-Cookie", sessionCookie(req, "", 0));
    r.headers.append(
      "Set-Cookie",
      `weiyu_demo=${g.id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * DAY}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
    );
    return r;
  };
  const post = (
    path: string,
    fn: (req: Request, body: Record<string, unknown>) => Promise<Response>,
  ) =>
    app.post("/api/auth/" + path, async (e) => {
      try {
        const req = e.req as Request;
        const body = await readJSON(req);
        return await fn(req, body);
      } catch (error) {
        if (error instanceof AuthError) {
          const r = authJSON({ error: error.message }, error.status);
          if (error.status === 429) r.headers.set("Retry-After", "900");
          return r;
        }
        console.error("Account operation failed");
        return authJSON({ error: "账号服务暂时不可用，请稍后再试" }, 503);
      }
    });
  app.get("/api/auth/me", async (e) => {
    const u = await currentUser(repo, e.req as Request);
    return authJSON({ account: u ? publicAccount(u) : null });
  });
  post("register", async (req, b) => {
    await limit(req, "register");
    const name = username(b.username),
      pass = password(b.password);
    if (b.confirmPassword !== pass) throw new AuthError("两次输入的密码不一致");
    if (b.adult !== true) throw new AuthError("仅限已满 18 周岁的用户注册");
    if (
      typeof b.nickname !== "string" ||
      !b.nickname.trim() ||
      b.nickname.trim().length > 16
    )
      throw new AuthError("昵称需为 1–16 个字");
    const base =
      b.importGuest === true ? (await guest(req)).state : initialState();
    const state = mutate(base, {
      type: "profile",
      name: b.nickname.trim(),
      bio: base.profile.bio,
      intent: base.profile.intent,
    });
    const code = randomToken(16),
      u: User = {
        id: crypto.randomUUID(),
        username: name,
        createdAt: Date.now(),
        password_hash: await hashPassword(pass),
        recovery_hash: await recoveryHash(code),
      };
    if (!(await repo.create(u, state)))
      throw new AuthError("这个账号已被使用，换一个试试", 409);
    return signedIn(req, u, b.remember === true, code);
  });
  post("login", async (req, b) => {
    const name = username(b.username);
    await limit(req, "login", name);
    const u = await repo.find(name);
    if (!(await verifyPassword(b.password, u?.password_hash)) || !u)
      throw new AuthError("账号或密码不正确", 401);
    return signedIn(req, u, b.remember === true);
  });
  post("logout", async (req) => {
    const token = cookie(req, "weiyu_auth");
    if (token) await repo.revoke(await sessionHash(token));
    return signedOut(req);
  });
  post("logout-all", async (req, b) => {
    const u = await requireUser(req);
    await limit(req, "security", u.username);
    if (!(await verifyPassword(b.password, u.password_hash)))
      throw new AuthError("当前密码不正确", 401);
    await repo.revokeAll(u.id);
    return signedOut(req);
  });
  post("password", async (req, b) => {
    const u = await requireUser(req);
    await limit(req, "security", u.username);
    if (!(await verifyPassword(b.currentPassword, u.password_hash)))
      throw new AuthError("当前密码不正确", 401);
    const pass = password(b.password);
    if (b.confirmPassword !== pass) throw new AuthError("两次输入的密码不一致");
    const nextHash = await hashPassword(pass),
      code = randomToken(16),
      nextRecovery = await recoveryHash(code);
    if (!(await repo.replace(u, nextHash, nextRecovery, "password")))
      throw new AuthError("账号信息已更新，请重新登录", 409);
    return signedIn(
      req,
      { ...u, password_hash: nextHash, recovery_hash: nextRecovery },
      false,
      code,
    );
  });
  post("recover", async (req, b) => {
    const name = username(b.username);
    await limit(req, "recover", name);
    const pass = password(b.password);
    if (b.confirmPassword !== pass) throw new AuthError("两次输入的密码不一致");
    const u = await repo.find(name),
      code = typeof b.code === "string" ? b.code.slice(0, 100) : "";
    const provided = await recoveryHash(code);
    if (!u || !equal(provided, u.recovery_hash))
      throw new AuthError("账号或恢复码不正确", 401);
    const nextHash = await hashPassword(pass),
      newCode = randomToken(16),
      nextRecovery = await recoveryHash(newCode);
    if (!(await repo.replace(u, nextHash, nextRecovery, "recovery")))
      throw new AuthError("恢复码已失效，请使用最新的恢复码", 409);
    return signedIn(
      req,
      { ...u, password_hash: nextHash, recovery_hash: nextRecovery },
      false,
      newCode,
    );
  });
}
