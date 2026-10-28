export const prerender = false;

import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { getUserBySession, getSessionIdFromCookies } from "@/lib/auth";

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookies(request.headers.get("cookie"));
  if (!sid) return json({ ok: false, error: "请先登录" }, 401);
  const user = getUserBySession(sid);
  if (!user) return json({ ok: false, error: "会话已过期" }, 401);
  if (user.role !== "admin") return json({ ok: false, error: "无权限" }, 403);

  const userCount = (db.prepare(`SELECT COUNT(*) AS c FROM users`).get() as any).c;
  const postCount = (db.prepare(`SELECT COUNT(*) AS c FROM posts`).get() as any).c;
  const pendingCount = (db.prepare(`SELECT COUNT(*) AS c FROM posts WHERE status = 'pending'`).get() as any).c;
  const commentCount = (db.prepare(`SELECT COUNT(*) AS c FROM comments`).get() as any).c;

  return json({ ok: true, stats: { userCount, postCount, pendingCount, commentCount } }, 200);
};