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
  if (user.role !== "admin") return json({ ok: false, error: "无权限" }, 403);

  try {
    const { postId, action } = await request.json();
    if (!postId || !["approve", "reject"].includes(action)) {
      return json({ ok: false, error: "参数错误" }, 400);
    }

    const status = action === "approve" ? "approved" : "rejected";
    const now = Math.floor(Date.now() / 1000);

        db.prepare(
      `UPDATE posts SET status = ?, reviewed_at = ?, reviewed_by = ?, updated_at = ?
       WHERE id = ?`
    ).run(status, now, user.id, now, postId);

    // 通知文章作者
    const postRow = db.prepare(`SELECT author_id, title, slug FROM posts WHERE id = ?`).get(postId) as any;
    if (postRow && postRow.author_id !== user.id) {
      const { notify } = await import("@/lib/notify");
      if (status === "approved") {
        notify(postRow.author_id, "approved", `你的文章《${postRow.title}》已通过审核`, `/community/${postRow.slug}/`);
      } else if (status === "rejected") {
        notify(postRow.author_id, "rejected", `你的文章《${postRow.title}》被拒绝`, `/dashboard/`);
      }
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error("review error:", err);
    return json({ ok: false, error: "服务器错误" }, 500);
  }
};