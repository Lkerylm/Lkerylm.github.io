import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db, type User, type Session } from "./db";

const SESSION_DAYS = 30;
const SESSION_COOKIE = "blog_session";

// ========== 密码 ==========
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ========== Session ==========
export function createSession(userId: number): Session {
  const id = crypto.randomBytes(32).toString("hex");
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_DAYS * 24 * 3600;

  db.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(id, userId, now, expiresAt);

  return { id, user_id: userId, created_at: now, expires_at: expiresAt };
}

export function getSession(sessionId: string): Session | null {
  const now = Math.floor(Date.now() / 1000);
  const s = db
    .prepare(`SELECT * FROM sessions WHERE id = ? AND expires_at > ?`)
    .get(sessionId, now) as Session | undefined;
  return s ?? null;
}

export function deleteSession(sessionId: string): void {
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
}

export function getUserBySession(sessionId: string): User | null {
  const session = getSession(sessionId);
  if (!session) return null;
  const user = db
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(session.user_id) as User | undefined;
  return user ?? null;
}

// ========== Cookie 工具 ==========
export function setSessionCookie(headers: Headers, sessionId: string): void {
  const maxAge = SESSION_DAYS * 24 * 3600;
  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${sessionId}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
  );
}

export function clearSessionCookie(headers: Headers): void {
  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
  );
}

export function getSessionIdFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

// ========== 用户 ==========
export function findUserByUsername(username: string): User | null {
  const u = db
    .prepare(`SELECT * FROM users WHERE username = ?`)
    .get(username) as User | undefined;
  return u ?? null;
}

export function findUserByEmail(email: string): User | null {
  const u = db
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email) as User | undefined;
  return u ?? null;
}

export function createUser(
  username: string,
  email: string,
  passwordHash: string,
  role: "user" | "admin" = "user"
): User {
  const result = db
    .prepare(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES (?, ?, ?, ?)`
    )
    .run(username, email, passwordHash, role);

  const id = Number(result.lastInsertRowid);
  return db
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(id) as User;
}