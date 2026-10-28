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
    const { commentId } = await request.json();
    if (!commentId) return json({ ok: false, error: "参数错误" }, 400);

    const c = db.prepare(`SELECT * FROM comments WHERE id = ?`).get(commentId) as any;
    if (!c) return json({ ok: false, error: "评论不存在" }, 404);

    if (c.author_id !== user.id && user.role !== "admin") {
      return json({ ok: false, error: "无权限" }, 403);
    }

    db.prepare(`DELETE FROM comments WHERE id = ?`).run(commentId);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error("delete comment error:", err);
    return json({ ok: false, error: "服务器错误" }, 500);
  }
};