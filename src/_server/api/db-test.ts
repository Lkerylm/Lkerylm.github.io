export const prerender = false;

import type { APIRoute } from "astro";
import { db } from "@/lib/db";

export const GET: APIRoute = async () => {
  try {
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
      )
      .all() as { name: string }[];

    return new Response(
      JSON.stringify({
        ok: true,
        message: "数据库已就绪",
        tables: tables.map((t) => t.name),
        dbPath: "data/blog.db",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};