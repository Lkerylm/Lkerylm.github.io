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
    const { postId } = await request.json();
    if (!postId) return json({ ok: false, error: "参数错误" }, 400);

    const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId) as any;
    if (!post) return json({ ok: false, error: "文章不存在" }, 404);
    if (post.author_id !== user.id && user.role !== "admin") {
      return json({ ok: false, error: "无权限" }, 403);
    }

    db.prepare(`DELETE FROM posts WHERE id = ?`).run(postId);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error("delete post error:", err);
    return json({ ok: false, error: "服务器错误" }, 500);
  }
};