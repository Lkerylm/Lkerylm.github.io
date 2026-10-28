export const prerender = false;

import type { APIRoute } from "astro";
import { db } from "@/lib/db";

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) {
    return new Response(JSON.stringify({ ok: true, posts: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const like = `%${q}%`;
  const posts = db
    .prepare(
      `SELECT p.id, p.title, p.slug, p.content, p.cover, p.created_at,
              u.username AS author,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.status = 'approved') AS comment_count
       FROM posts p
       JOIN users u ON u.id = p.author_id
       WHERE p.status = 'approved' AND (p.title LIKE ? OR p.content LIKE ?)
       ORDER BY p.created_at DESC
       LIMIT 30`
    )
    .all(like, like) as any[];

  return new Response(JSON.stringify({ ok: true, posts }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};