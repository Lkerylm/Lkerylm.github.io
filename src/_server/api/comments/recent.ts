export const prerender = false;

import type { APIRoute } from "astro";
import { db } from "@/lib/db";

export const GET: APIRoute = async () => {
  const comments = db
    .prepare(
      `SELECT c.id, c.content, c.created_at,
              u.username AS author, u.avatar AS avatar,
              p.title AS post_title, p.slug AS post_slug
       FROM comments c
       JOIN users u ON u.id = c.author_id
       JOIN posts p ON p.id = c.post_id
       WHERE c.status = 'approved' AND p.status = 'approved'
       ORDER BY c.created_at DESC
       LIMIT 5`
    )
    .all() as any[];

  return new Response(JSON.stringify({ ok: true, comments }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};