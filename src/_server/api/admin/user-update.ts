export const prerender = false;

import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { getUserBySession, getSessionIdFromCookies } from "@/lib/auth";

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookies(request.headers.get("cookie"));
  if (!sid) return json({ ok: false, error: "请先登录" }, 401);
  const admin = getUserBySession(sid);
  if (!admin) return json({ ok: false, error: "会话已过期" }, 401);
  if (admin.role !== "admin") return json({ ok: false, error: "无权限" }, 403);

  try {
    const { userId, action } = await request.json();
    if (!userId || !["promote", "demote", "delete"].includes(action)) {
      return json({ ok: false, error: "参数错误" }, 400);
    }

    const target = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as any;
    if (!target) return json({ ok: false, error: "用户不存在" }, 404);
    if (target.id === admin.id) return json({ ok: false, error: "不能操作自己" }, 400);

    if (action === "promote") {
      db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(userId);
    } else if (action === "demote") {
      db.prepare(`UPDATE users SET role = 'user' WHERE id = ?`).run(userId);
    } else if (action === "delete") {
      db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error("admin user-update error:", err);
    return json({ ok: false, error: "服务器错误" }, 500);
  }
};