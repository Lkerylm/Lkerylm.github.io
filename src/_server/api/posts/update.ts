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
        const { postId, title, content, cover } = await request.json();
    if (!postId || !title || !content) {
      return json({ ok: false, error: "请填写完整" }, 400);
    }
    if (title.length > 100) {
      return json({ ok: false, error: "标题不能超过 100 字" }, 400);
    }

    const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId) as any;
    if (!post) return json({ ok: false, error: "文章不存在" }, 404);
    if (post.author_id !== user.id && user.role !== "admin") {
      return json({ ok: false, error: "无权限" }, 403);
    }

    // 编辑后重新审核（管理员编辑除外）
    const newStatus = user.role === "admin" ? post.status : "pending";
    const now = Math.floor(Date.now() / 1000);

     db.prepare(
      `UPDATE posts SET title = ?, content = ?, cover = ?, status = ?, updated_at = ? WHERE id = ?`
    ).run(title, content, cover || "", newStatus, now, postId);

    return json({ ok: true }, 200);
  } catch (err) {
    console.error("update post error:", err);
    return json({ ok: false, error: "服务器错误" }, 500);
  }
};