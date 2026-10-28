export const prerender = false;

import type { APIRoute } from "astro";
import {
  findUserByUsername,
  findUserByEmail,
  createUser,
  hashPassword,
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
    const { username, email, password } = body || {};

    if (!username || !email || !password) {
      return json({ ok: false, error: "请填写完整信息" }, 400);
    }
    if (username.length < 2 || username.length > 20) {
      return json({ ok: false, error: "用户名长度需要 2~20 位" }, 400);
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ ok: false, error: "邮箱格式不正确" }, 400);
    }
    if (password.length < 6) {
      return json({ ok: false, error: "密码至少 6 位" }, 400);
    }

    if (findUserByUsername(username)) {
      return json({ ok: false, error: "用户名已被使用" }, 400);
    }
    if (findUserByEmail(email)) {
      return json({ ok: false, error: "邮箱已被注册" }, 400);
    }

    const hash = await hashPassword(password);
    const user = createUser(username, email, hash, "user");

    const session = createSession(user.id);
    const headers = new Headers({ "Content-Type": "application/json" });
    setSessionCookie(headers, session.id);

    return new Response(
      JSON.stringify({
        ok: true,
        user: { id: user.id, username: user.username, email: user.email },
      }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error("register error:", err);
    return json({ ok: false, error: "服务器错误" }, 500);
  }
};