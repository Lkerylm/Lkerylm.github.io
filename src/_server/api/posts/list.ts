export const prerender = false;

import type { APIRoute } from "astro";
import { db, type Post } from "@/lib/db";
import { getUserBySession, getSessionIdFromCookies } from "@/lib/auth";

export const GET: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookies(request.headers.get("cookie"));
  if (!sid) {
    return new Response(JSON.stringify({ ok: false, error: "请先登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = getUserBySession(sid);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "会话已过期" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 普通用户只看自己的文章；admin 看所有
  const posts =
    user.role === "admin"
      ? (db
          .prepare(
            `SELECT id, title, slug, status, created_at FROM posts ORDER BY created_at DESC`
          )
          .all() as Partial<Post>[])
      : (db
          .prepare(
            `SELECT id, title, slug, status, created_at FROM posts WHERE author_id = ? ORDER BY created_at DESC`
          )
          .all(user.id) as Partial<Post>[]);

  return new Response(JSON.stringify({ ok: true, posts }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};