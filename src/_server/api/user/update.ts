export const prerender = false;

import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { getUserBySession, getSessionIdFromCookies } from "@/lib/auth";

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookies(request.headers.get("cookie"));
  if (!sid) return json({ ok: false, error: "请先登录" }, 401);
  const user = getUserBySession(sid);
  if (!user) return json({ ok: false, error: "会话已过期" }, 401);

  try {
    const { email, bio, avatar } = await request.json();

    if (email !== undefined) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return json({ ok: false, error: "邮箱格式不正确" }, 400);
      }
      const exists = db
        .prepare(`SELECT id FROM users WHERE email = ? AND id != ?`)
        .get(email, user.id);
      if (exists) return json({ ok: false, error: "该邮箱已被使用" }, 400);
    }

    // 检查列是否存在（首次自动加）
    const cols = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
    const has = (n: string) => cols.some((c) => c.name === n);
    if (!has("bio"))    db.exec(`ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''`);
    if (!has("avatar")) db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''`);

    const updates: string[] = [];
    const values: any[] = [];
    if (email !== undefined) { updates.push("email = ?"); values.push(email); }
    if (bio !== undefined)   { updates.push("bio = ?");   values.push(bio); }
    if (avatar !== undefined){ updates.push("avatar = ?");values.push(avatar); }

    if (updates.length === 0) return json({ ok: false, error: "没有要更新的内容" }, 400);

    values.push(user.id);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    return json({ ok: true }, 200);
  } catch (err) {
    console.error("update user error:", err);
    return json({ ok: false, error: "服务器错误" }, 500);
  }
};