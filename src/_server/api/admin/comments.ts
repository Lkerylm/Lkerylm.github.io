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

  const comments = db
    .prepare(
      `SELECT c.id, c.content, c.created_at,
              u.username AS author,
              p.title AS post_title, p.slug AS post_slug
       FROM comments c
       JOIN users u ON u.id = c.author_id
       JOIN posts p ON p.id = c.post_id
       ORDER BY c.created_at DESC`
    )
    .all() as any[];

  return json({ ok: true, comments }, 200);
};