export const prerender = false;

import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import {
  getUserBySession,
  getSessionIdFromCookies,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

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
    const { oldPassword, newPassword } = await request.json();
    if (!oldPassword || !newPassword) return json({ ok: false, error: "请填写完整" }, 400);
    if (newPassword.length < 6) return json({ ok: false, error: "新密码至少 6 位" }, 400);

    const valid = await verifyPassword(oldPassword, user.password_hash);
    if (!valid) return json({ ok: false, error: "原密码错误" }, 400);

    const hash = await hashPassword(newPassword);
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, user.id);

    return json({ ok: true }, 200);
  } catch (err) {
    console.error("change password error:", err);
    return json({ ok: false, error: "服务器错误" }, 500);
  }
};