import { type State, type Account } from "../data";
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number } }>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<{ meta?: { changes?: number } }[]>;
}
export interface User extends Account {
  password_hash: string;
  recovery_hash: string;
}
export interface AuthRepository {
  find(username: string): Promise<User | null>;
  session(hash: string): Promise<User | null>;
  create(user: User, state: State): Promise<boolean>;
  load(userId: string): Promise<State | null>;
  save(userId: string, state: State): Promise<void>;
  issue(user: User, hash: string, expires: number): Promise<boolean>;
  revoke(hash: string): Promise<void>;
  revokeAll(userId: string): Promise<void>;
  replace(
    user: User,
    password: string,
    recovery: string,
    mode: "password" | "recovery",
  ): Promise<boolean>;
  allow(key: string, max: number, seconds: number): Promise<boolean>;
}
export class AuthError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const encoder = new TextEncoder();
export const randomToken = (bytes = 32) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
export function equal(a: string, b: string) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
export function username(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[a-zA-Z][a-zA-Z0-9_]{3,23}$/.test(value.trim())
  )
    throw new AuthError("账号需为 4–24 位字母、数字或下划线，以字母开头");
  return value.trim().toLowerCase();
}
export function password(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128)
    throw new AuthError("密码需为 12–128 位，可以使用长口令");
  return value;
}
export async function hashPassword(value: string, salt = randomToken(16)) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(value),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      iterations: 100000,
    },
    key,
    256,
  );
  return `pbkdf2-sha256:100000:${salt}:${Array.from(new Uint8Array(bits), (x) => x.toString(16).padStart(2, "0")).join("")}`;
}
const dummy =
  "pbkdf2-sha256:100000:00000000000000000000000000000000:" + "0".repeat(64);
export async function verifyPassword(value: unknown, stored = dummy) {
  const valid =
    typeof value === "string" && value.length > 0 && value.length <= 128;
  const parts = stored.split(":");
  const derived = await hashPassword(
    valid ? value : "invalid-password",
    parts[2],
  );
  return valid && equal(derived, stored);
}
export const publicAccount = (u: User): Account => ({
  id: u.id,
  username: u.username,
  createdAt: u.createdAt,
});
export function cookie(req: Request, name: string) {
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + "="))
    ?.slice(name.length + 1);
}
export const sessionHash = (token: string) => digest("session:" + token);
export const recoveryHash = (code: string) =>
  digest("recovery:" + code.toLowerCase().replace(/[\s-]/g, ""));
export function sessionCookie(req: Request, token: string, seconds: number) {
  return `weiyu_auth=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
export async function currentUser(repo: AuthRepository, req: Request) {
  const token = cookie(req, "weiyu_auth");
  return token && /^[a-f0-9]{64}$/.test(token)
    ? repo.session(await sessionHash(token))
    : null;
}
export function createAuthRepository(db: Database): AuthRepository {
  return {
    async find(name) {
      const row = await db
        .prepare("SELECT * FROM users WHERE username = ?")
        .bind(name)
        .first<Record<string, unknown>>();
      return row ? userRow(row) : null;
    },
    async session(hash) {
      const row = await db
        .prepare(
          "SELECT u.* FROM users u JOIN auth_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?",
        )
        .bind(hash, Date.now())
        .first<Record<string, unknown>>();
      return row ? userRow(row) : null;
    },
    async create(user, state) {
      try {
        await db.batch([
          db
            .prepare(
              "INSERT INTO users (id,username,password_hash,recovery_hash,created_at) VALUES (?,?,?,?,?)",
            )
            .bind(
              user.id,
              user.username,
              user.password_hash,
              user.recovery_hash,
              user.createdAt,
            ),
          db
            .prepare("INSERT INTO account_states (user_id,state) VALUES (?,?)")
            .bind(user.id, JSON.stringify({ ...state, account: null })),
        ]);
        return true;
      } catch (error) {
        if (String(error).includes("UNIQUE constraint failed: users.username"))
          return false;
        throw error;
      }
    },
    async load(id) {
      const row = await db
        .prepare("SELECT state FROM account_states WHERE user_id=?")
        .bind(id)
        .first<{ state: string }>();
      return row ? JSON.parse(row.state) : null;
    },
    async save(id, state) {
      await db
        .prepare("UPDATE account_states SET state=? WHERE user_id=?")
        .bind(JSON.stringify({ ...state, account: null }), id)
        .run();
    },
    async issue(user, hash, expires) {
      const r = await db
        .prepare(
          "INSERT INTO auth_sessions (token_hash,user_id,expires_at) SELECT ?,id,? FROM users WHERE id=? AND password_hash=? AND recovery_hash=?",
        )
        .bind(hash, expires, user.id, user.password_hash, user.recovery_hash)
        .run();
      return r.meta?.changes === 1;
    },
    async revoke(hash) {
      await db
        .prepare("DELETE FROM auth_sessions WHERE token_hash=?")
        .bind(hash)
        .run();
    },
    async revokeAll(id) {
      await db
        .prepare("DELETE FROM auth_sessions WHERE user_id=?")
        .bind(id)
        .run();
    },
    async replace(user, pass, recovery, mode) {
      const expected =
        mode === "password" ? user.password_hash : user.recovery_hash;
      const column = mode === "password" ? "password_hash" : "recovery_hash";
      const result = await db.batch([
        db
          .prepare(
            `UPDATE users SET password_hash=?,recovery_hash=? WHERE id=? AND ${column}=?`,
          )
          .bind(pass, recovery, user.id, expected),
        db
          .prepare(
            "DELETE FROM auth_sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND password_hash=?)",
          )
          .bind(user.id, user.id, pass),
      ]);
      return result[0].meta?.changes === 1;
    },
    async allow(key, max, seconds) {
      const now = Date.now();
      const row = await db
        .prepare(
          "INSERT INTO auth_limits (key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END, expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING attempts",
        )
        .bind(key, now + seconds * 1000, now, now)
        .first<{ attempts: number }>();
      return !!row && row.attempts <= max;
    },
  };
}
function userRow(r: Record<string, unknown>): User {
  return {
    id: String(r.id),
    username: String(r.username),
    createdAt: Number(r.created_at),
    password_hash: String(r.password_hash),
    recovery_hash: String(r.recovery_hash),
  };
}
