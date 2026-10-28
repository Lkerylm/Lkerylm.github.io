export const prerender = false;

import type { APIRoute } from "astro";
import {
  deleteSession,
  clearSessionCookie,
  getSessionIdFromCookies,
} from "@/lib/auth";

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookies(request.headers.get("cookie"));
  if (sid) deleteSession(sid);

  const headers = new Headers({ "Content-Type": "application/json" });
  clearSessionCookie(headers);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
};