export const prerender = false;

import type { APIRoute } from "astro";
import { getUserBySession, getSessionIdFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";

export const GET: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookies(request.headers.get("cookie"));
  if (!sid) {
    return new Response(JSON.stringify({ ok: false, user: null }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
  const user = getUserBySession(sid);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, user: null }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  // 确保 bio/avatar 列存在
  const cols = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
  const hasBio = cols.some((c) => c.name === "bio");
  const hasAvatar = cols.some((c) => c.name === "avatar");
  if (!hasBio) db.exec(`ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''`);
  if (!hasAvatar) db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''`);

  const full = db.prepare(`SELECT id, username, email, role, bio, avatar FROM users WHERE id = ?`).get(user.id) as any;

  return new Response(
    JSON.stringify({
      ok: true,
      user: {
        id: full.id,
        username: full.username,
        email: full.email,
        role: full.role,
        bio: full.bio || "",
        avatar: full.avatar || "",
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};