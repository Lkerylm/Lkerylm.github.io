export const prerender = false;

import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { getUserBySession, getSessionIdFromCookies } from "@/lib/auth";

export const GET: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookies(request.headers.get("cookie"));
  if (!sid) {
    return new Response(JSON.stringify({ ok: false, error: "请先登录" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }
  const user = getUserBySession(sid);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "会话已过期" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const list = db
    .prepare(
      `SELECT id, type, title, link, is_read, created_at
       FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`
    )
    .all(user.id) as any[];

  const unread = (db
    .prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`)
    .get(user.id) as any).c;

  return new Response(JSON.stringify({ ok: true, list, unread }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
};