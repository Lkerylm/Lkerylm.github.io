/**
 * Firefly 独立后端 + 静态站点服务器
 *
 *   node server/server.mjs            # 监听 0.0.0.0:8787
 *   PORT=9000 node server/server.mjs  # 换端口
 *
 * 同一个地址同时提供：
 *   /            → 打包好的网站（dist/，没有 dist 时退回 public/）
 *   /api/*       → 注册 / 登录 / 投稿 / 审核 / 后台 / 实时活动
 *   /uploads/*   → 用户上传的图片
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { handleApi } from "./api.mjs";
import { ROOT_DIR, DB_PATH, ensureAdmin, db } from "./db.mjs";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const DIST = path.join(ROOT_DIR, "dist");
const PUBLIC = path.join(ROOT_DIR, "public");
const HAS_DIST = fs.existsSync(path.join(DIST, "index.html"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".pdf": "application/pdf",
  ".apk": "application/vnd.android.package-archive",
  ".zip": "application/zip",
  ".wasm": "application/wasm",
};

function corsHeaders(req) {
  const origin = req.headers.origin;
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function clientIp(req) {
  const fwd = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.socket.remoteAddress || "";
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, data, extra = {}) {
  send(res, status, JSON.stringify(data), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extra,
  });
}

async function readJsonBody(req, limit = 8 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error("body too large");
    chunks.push(c);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function safeJoin(base, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const full = path.resolve(base, "." + decoded);
  if (!full.startsWith(path.resolve(base))) return null;
  return full;
}

function fileExists(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function serveFile(res, filePath, req, cache) {
  const ext = path.extname(filePath).toLowerCase();
  const stat = fs.statSync(filePath);
  const headers = {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": cache || "public, max-age=0, must-revalidate",
    "Accept-Ranges": "bytes",
    ...corsHeaders(req),
  };

  const range = req.headers.range;
  if (range && /^bytes=\d*-\d*$/.test(range)) {
    const [startStr, endStr] = range.replace("bytes=", "").split("-");
    let start = startStr ? Number(startStr) : 0;
    let end = endStr ? Number(endStr) : stat.size - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stat.size) {
      send(res, 416, "", { "Content-Range": `bytes */${stat.size}` });
      return;
    }
    end = Math.min(end, stat.size - 1);
    headers["Content-Length"] = end - start + 1;
    headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
    res.writeHead(206, headers);
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
}

/** 静态文件：先 dist，再 public（uploads 始终来自 public） */
function tryStatic(req, res, pathname) {
  const candidates = [];
  if (pathname.startsWith("/uploads/")) candidates.push(safeJoin(PUBLIC, pathname));
  else {
    if (HAS_DIST) candidates.push(safeJoin(DIST, pathname));
    candidates.push(safeJoin(PUBLIC, pathname));
  }

  for (const c of candidates) {
    if (!c) continue;
    if (fileExists(c)) {
      const cache = pathname.startsWith("/_astro/")
        ? "public, max-age=31536000, immutable"
        : undefined;
      serveFile(res, c, req, cache);
      return true;
    }
  }

  const dirs = [];
  if (HAS_DIST) dirs.push(safeJoin(DIST, pathname.replace(/\/?$/, "/")));
  for (const d of dirs) {
    if (!d) continue;
    const idx = path.join(d, "index.html");
    if (fileExists(idx)) {
      serveFile(res, idx, req);
      return true;
    }
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  let pathname = "/";
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    pathname = url.pathname;
    const method = (req.method || "GET").toUpperCase();
    const apiPath = pathname.replace(/\/+$/, "") || "/";

    if (method === "OPTIONS") {
      send(res, 204, "", corsHeaders(req));
      return;
    }

    if (apiPath.startsWith("/api/")) {
      const ctx = {
        req,
        res,
        method,
        path: apiPath,
        query: url.searchParams,
        body: {},
        ip: clientIp(req),
        json: (status, data, extra) =>
          sendJson(res, status, data, { ...corsHeaders(req), ...(extra || {}) }),
      };

      if (method !== "GET" && method !== "HEAD" && !apiPath.endsWith("/upload")) {
        try {
          ctx.body = await readJsonBody(req);
        } catch (e) {
          sendJson(res, 400, { ok: false, error: "请求体不是合法 JSON" }, corsHeaders(req));
          return;
        }
      }

      const handled = await handleApi(ctx);
      if (!handled) {
        sendJson(res, 404, { ok: false, error: `接口不存在: ${method} ${apiPath}` }, corsHeaders(req));
      }
      return;
    }

    if (method === "GET" || method === "HEAD") {
      if (tryStatic(req, res, pathname)) return;

      const notFound = path.join(DIST, "404.html");
      if (fileExists(notFound)) {
        send(res, 404, fs.readFileSync(notFound), {
          "Content-Type": "text/html; charset=utf-8",
          ...corsHeaders(req),
        });
        return;
      }
      send(res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    sendJson(res, 405, { ok: false, error: "Method Not Allowed" }, corsHeaders(req));
  } catch (err) {
    console.error(`[server] ${req.method} ${pathname} 出错:`, err);
    if (!res.headersSent) {
      sendJson(res, 500, { ok: false, error: "服务器内部错误" }, corsHeaders(req));
    }
  } finally {
    if (process.env.FIREFLY_LOG !== "0") {
      console.log(`[${new Date().toLocaleTimeString("zh-CN")}] ${req.method} ${pathname} ${res.statusCode} ${Date.now() - started}ms`);
    }
  }
});

function lanIps() {
  const list = [];
  for (const items of Object.values(os.networkInterfaces())) {
    for (const it of items || []) {
      if (it.family === "IPv4" && !it.internal) list.push(it.address);
    }
  }
  return list;
}

server.listen(PORT, HOST, () => {
  const promoted = ensureAdmin();
  const userCount = db.prepare(`SELECT COUNT(*) AS c FROM users`).get().c;
  const adminCount = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role='admin'`).get().c;

  console.log("");
  console.log("  🦋 Firefly 后端已启动");
  console.log("  ────────────────────────────────────────────");
  console.log(`  本机:    http://localhost:${PORT}/`);
  for (const ip of lanIps()) console.log(`  局域网:  http://${ip}:${PORT}/`);
  console.log(`  接口:    http://localhost:${PORT}/api/health`);
  console.log(`  数据库:  ${DB_PATH}`);
  console.log(`  静态站:  ${HAS_DIST ? "dist/（已打包）" : "public/（未打包，建议先 pnpm build）"}`);
  console.log(`  用户: ${userCount} 个，管理员: ${adminCount} 个`);
  if (promoted) console.log(`  ⚠ 已自动把最早注册的用户「${promoted.username}」提升为管理员`);
  if (adminCount === 0 && userCount === 0) console.log("  ⚠ 还没有账号：打开 /register/ 注册的第一个账号会自动成为管理员");
  console.log("  ────────────────────────────────────────────");
  console.log("  按 Ctrl+C 停止\n");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`端口 ${PORT} 已被占用，换一个：set PORT=8788 && node server/server.mjs`);
  } else {
    console.error("[server] 启动失败:", err);
  }
  process.exit(1);
});

