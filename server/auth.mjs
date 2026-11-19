/**
 * Firefly 独立后端 - 账号 / 会话
 * 密码：scrypt（node:crypto，无额外依赖）；兼容老库里的 bcrypt 哈希（登录成功后自动升级为 scrypt）
 */
import crypto from "node:crypto";
import { db } from "./db.mjs";

export const SESSION_DAYS = 30;
export const TOKEN_TTL = SESSION_DAYS * 24 * 3600;

/* ---------------- 密码 ---------------- */

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(String(plain), salt, 64).toString("hex");
  return `scrypt$${salt}$${key}`;
}

async function bcryptCompare(plain, stored) {
  try {
    const mod = await import("bcryptjs");
    const bcrypt = mod.default ?? mod;
    return await bcrypt.compare(String(plain), stored);
  } catch (e) {
    return false;
  }
}

export async function verifyPassword(plain, stored) {
  if (!stored) return false;
  if (stored.startsWith("scrypt$")) {
    const [, salt, key] = stored.split("$");
    if (!salt || !key) return false;
    const calc = crypto.scryptSync(String(plain), salt, 64).toString("hex");
    const a = Buffer.from(calc, "hex");
    const b = Buffer.from(key, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  // bcrypt: $2a$ / $2b$ / $2y$
  if (/^\$2[aby]\$/.test(stored)) return bcryptCompare(plain, stored);
  return false;
}

export function isLegacyHash(stored) {
  return /^\$2[aby]\$/.test(String(stored || ""));
}

/* ---------------- 会话 ---------------- */

export function createSession(userId, ip = "") {
  const id = crypto.randomBytes(32).toString("hex");
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + TOKEN_TTL;
  db.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).run(id, userId, now, expiresAt);
  try {
    db.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`).run(now, userId);
  } catch (e) {
    /* 列不存在时忽略 */
  }
  void ip;
  return { id, user_id: userId, created_at: now, expires_at: expiresAt };
}

export function getSessionUser(token) {
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const s = db
    .prepare(`SELECT * FROM sessions WHERE id = ? AND expires_at > ?`)
    .get(token, now);
  if (!s) return null;
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(s.user_id);
  return user ?? null;
}

export function deleteSession(token) {
  if (!token) return;
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(token);
}

export function deleteUserSessions(userId) {
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}

/** 从请求里取 token：优先 Authorization: Bearer，其次 Cookie blog_session */
export function getToken(req) {
  const auth = req.headers["authorization"] || "";
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (m) return m[1].trim();
  const cookie = req.headers["cookie"] || "";
  const c = /(?:^|;\s*)blog_session=([^;]+)/.exec(cookie);
  return c ? decodeURIComponent(c[1]) : null;
}

export function getUserFromRequest(req) {
  return getSessionUser(getToken(req));
}

/* ---------------- 用户工具 ---------------- */

export function findUserByUsername(username) {
  return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username) ?? null;
}

export function findUserByEmail(email) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) ?? null;
}

/* ---------------- 邮箱验证码账号（无密码） ---------------- */

/** 无密码账号在 password_hash 里放这个标记，永远不会被密码登录命中 */
export const PASSWORDLESS_MARK = "!passwordless";

export function isPasswordless(user) {
  return String(user?.password_hash || "").startsWith("!");
}

/** 用邮箱前缀生成一个不与现有用户冲突的用户名 */
export function suggestUsername(email) {
  const local = String(email || "").split("@")[0] || "";
  const base =
    local
      .normalize("NFKC")
      .replace(/[^\w\u4e00-\u9fa5.-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 16) || "user";
  const safeBase = base.length < 2 ? `user-${base}`.slice(0, 16) : base;

  let name = safeBase;
  for (let i = 2; findUserByUsername(name) && i < 10000; i++) {
    const suffix = `-${i}`;
    name = safeBase.slice(0, Math.max(1, 20 - suffix.length)) + suffix;
  }
  if (findUserByUsername(name)) name = `user-${crypto.randomBytes(3).toString("hex")}`;
  return name;
}

/** 邮箱验证码首次登录：自动建号（不需要密码、不需要单独注册） */
export function createUserByEmail(email, role = "user") {
  const username = suggestUsername(email);
  const result = db
    .prepare(
      `INSERT INTO users (username, email, password_hash, role, email_verified)
       VALUES (?, ?, ?, ?, 1)`
    )
    .run(username, email, PASSWORDLESS_MARK, role);
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(Number(result.lastInsertRowid));
}

export function markEmailVerified(userId) {
  db.prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(userId);
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
}

export function createUser(username, email, passwordHash, role = "user") {
  const result = db
    .prepare(`INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`)
    .run(username, email, passwordHash, role);
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(Number(result.lastInsertRowid));
}

/** 对外输出的用户对象（绝不包含 password_hash） */
export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    bio: u.bio || "",
    avatar: u.avatar || "",
    created_at: u.created_at,
    last_login_at: u.last_login_at || null,
    email_verified: !!u.email_verified,
    // 验证码账号没有密码；老账号 / 管理员重置过密码的是 true
    has_password: !isPasswordless(u),
  };
}

export function countUsers() {
  return db.prepare(`SELECT COUNT(*) AS c FROM users`).get().c;
}
