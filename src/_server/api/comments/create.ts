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
    const { postId, content } = await request.json();
    if (!postId || !content || !content.trim()) {
      return json({ ok: false, error: "评论不能为空" }, 400);
    }
    if (content.length > 1000) {
      return json({ ok: false, error: "评论不能超过 1000 字" }, 400);
    }

    const post = db
      .prepare(`SELECT id FROM posts WHERE id = ? AND status = 'approved'`)
      .get(postId);
    if (!post) return json({ ok: false, error: "文章不存在" }, 404);

        const result = db
      .prepare(`INSERT INTO comments (post_id, author_id, content) VALUES (?, ?, ?)`)
      .run(postId, user.id, content.trim());

    // 通知文章作者（不通知自己）
    const postRow = db.prepare(`SELECT author_id, title, slug FROM posts WHERE id = ?`).get(postId) as any;
    if (postRow && postRow.author_id !== user.id) {
      const { notify } = await import("@/lib/notify");
      notify(
        postRow.author_id,
        "comment",
        `${user.username} 评论了你的文章《${postRow.title}》`,
        `/community/${postRow.slug}/`
      );
    }

    return json({ ok: true, id: Number(result.lastInsertRowid) }, 200);
  } catch (err) {
    console.error("create comment error:", err);
    return json({ ok: false, error: "服务器错误" }, 500);
  }
};