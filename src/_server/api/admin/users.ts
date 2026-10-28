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

  const users = db
    .prepare(
      `SELECT id, username, email, role, created_at,
        (SELECT COUNT(*) FROM posts WHERE author_id = users.id) AS post_count,
        (SELECT COUNT(*) FROM comments WHERE author_id = users.id) AS comment_count
       FROM users ORDER BY created_at DESC`
    )
    .all() as any[];

  return json({ ok: true, users }, 200);
};