export const prerender = false;

import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { getUserBySession, getSessionIdFromCookies } from "@/lib/auth";

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookies(request.headers.get("cookie"));
  if (!sid) return new Response(JSON.stringify({ ok: false }), { status: 401 });
  const user = getUserBySession(sid);
  if (!user) return new Response(JSON.stringify({ ok: false }), { status: 401 });

  try {
    const { ids } = await request.json();
    if (Array.isArray(ids) && ids.length > 0) {
      const stmt = db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`);
      for (const id of ids) stmt.run(id, user.id);
    } else {
      db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(user.id);
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
};