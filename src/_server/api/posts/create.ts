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

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return base + "-" + Date.now().toString(36);
}

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookies(request.headers.get("cookie"));
  if (!sid) return json({ ok: false, error: "请先登录" }, 401);

  const user = getUserBySession(sid);
  if (!user) return json({ ok: false, error: "会话已过期" }, 401);

  try {
       const { title, content, cover } = await request.json();
    if (!title || !content) {
      return json({ ok: false, error: "标题和内容不能为空" }, 400);
    }
    if (title.length > 100) {
      return json({ ok: false, error: "标题不能超过 100 字" }, 400);
    }

    const slug = slugify(title);
        const result = db
      .prepare(
        `INSERT INTO posts (author_id, title, slug, content, cover, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`
      )
      .run(user.id, title, slug, content, cover || "");

    return json(
      { ok: true, id: Number(result.lastInsertRowid), slug },
      200
    );
  } catch (err) {
    console.error("create post error:", err);
    return json({ ok: false, error: "服务器错误" }, 500);
  }
};