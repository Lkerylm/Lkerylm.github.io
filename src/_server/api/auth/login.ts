export const prerender = false;

import type { APIRoute } from "astro";
import {
  findUserByUsername,
  verifyPassword,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return json({ ok: false, error: "请输入用户名和密码" }, 400);
    }

    const user = findUserByUsername(username);
    if (!user) {
      return json({ ok: false, error: "用户名或密码错误" }, 400);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return json({ ok: false, error: "用户名或密码错误" }, 400);
    }

    const session = createSession(user.id);
    const headers = new Headers({ "Content-Type": "application/json" });
    setSessionCookie(headers, session.id);

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error("login error:", err);
    return json({ ok: false, error: "服务器错误" }, 500);
  }
};