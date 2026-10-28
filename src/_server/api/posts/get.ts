export const prerender = false;

import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { getUserBySession, getSessionIdFromCookies } from "@/lib/auth";

export const GET: APIRoute = async ({ url, request }) => {
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

  const id = url.searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ ok: false, error: "缺少 id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(id) as any;
  if (!post) {
    return new Response(JSON.stringify({ ok: false, error: "文章不存在" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (post.author_id !== user.id && user.role !== "admin") {
    return new Response(JSON.stringify({ ok: false, error: "无权限" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, post }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};