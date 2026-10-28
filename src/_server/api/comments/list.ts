export const prerender = false;

import type { APIRoute } from "astro";
import { db } from "@/lib/db";

export const GET: APIRoute = async ({ url }) => {
  const postId = url.searchParams.get("postId");
  if (!postId) {
    return new Response(JSON.stringify({ ok: false, error: "缺少 postId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const comments = db
    .prepare(
      `SELECT c.id, c.content, c.created_at, c.author_id,
              u.username AS author, u.avatar AS avatar
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.post_id = ? AND c.status = 'approved'
       ORDER BY c.created_at ASC`
    )
    .all(postId) as any[];

  return new Response(JSON.stringify({ ok: true, comments }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};