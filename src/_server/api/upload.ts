export const prerender = false;

import type { APIRoute } from "astro";
import { getUserBySession, getSessionIdFromCookies } from "@/lib/auth";
import fs from "node:fs";
import path from "node:path";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export const POST: APIRoute = async ({ request }) => {
  // 1. 检查登录
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

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ ok: false, error: "没有文件" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. 检查大小
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ ok: false, error: "文件不能超过 5MB" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. 检查类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ ok: false, error: "只支持 JPG / PNG / GIF / WebP" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. 生成唯一文件名
    const ext = path.extname(file.name).toLowerCase() || ".jpg";
    const random = Math.random().toString(36).slice(2, 10);
    const filename = `${Date.now()}-${random}${ext}`;

    // 5. 按年月建目录
    const now = new Date();
    const subDir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const uploadDir = path.resolve(process.cwd(), "public", "uploads", subDir);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 6. 写文件
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    // 7. 返回访问 URL
    const url = `/uploads/${subDir}/${filename}`;

    return new Response(JSON.stringify({ ok: true, url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("upload error:", err);
    return new Response(JSON.stringify({ ok: false, error: "上传失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};