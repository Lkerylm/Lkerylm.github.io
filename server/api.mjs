/**
 * Firefly 独立后端 - API 路由
 * 路径与原项目保持一致（带不带结尾斜杠都能用），并新增活动日志 / 实时脉冲接口
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db, ROOT_DIR, logActivity, notify } from "./db.mjs";
import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  getUserFromRequest,
  findUserByUsername,
  findUserByEmail,
  createUser,
  publicUser,
  countUsers,
  isLegacyHash,
} from "./auth.mjs";

const now = () => Math.floor(Date.now() / 1000);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function slugify(text) {
  const base = String(text)
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${base}-${Date.now().toString(36)}`;
}

function fail(ctx, status, error) {
  return ctx.json(status, { ok: false, error });
}

function needLogin(ctx) {
  const user = getUserFromRequest(ctx.req);
  if (!user) {
    fail(ctx, 401, "请先登录");
    return null;
  }
  return user;
}

function needAdmin(ctx) {
  const user = needLogin(ctx);
  if (!user) return null;
  if (user.role !== "admin") {
    fail(ctx, 403, "无权限");
    return null;
  }
  return user;
}

/* ==================== 认证 ==================== */

function register(ctx) {
  const { username, email, password } = ctx.body || {};
  if (!username || !email || !password) return fail(ctx, 400, "请填写完整信息");
  if (String(username).length < 2 || String(username).length > 20) {
    return fail(ctx, 400, "用户名长度需要 2~20 位");
  }
  if (!EMAIL_RE.test(email)) return fail(ctx, 400, "邮箱格式不正确");
  if (String(password).length < 6) return fail(ctx, 400, "密码至少 6 位");
  if (findUserByUsername(username)) return fail(ctx, 400, "用户名已被使用");
  if (findUserByEmail(email)) return fail(ctx, 400, "邮箱已被注册");

  const isFirst = countUsers() === 0;
  const user = createUser(username, email, hashPassword(password), isFirst ? "admin" : "user");
  const session = createSession(user.id, ctx.ip);

  logActivity({
    userId: user.id,
    username: user.username,
    action: "register",
    targetType: "user",
    targetId: user.id,
    detail: isFirst ? "注册成功（首位用户，自动成为管理员）" : "注册成功",
    ip: ctx.ip,
  });

  return ctx.json(
    200,
    { ok: true, token: session.id, user: publicUser(user), isFirstAdmin: isFirst },
    { "Set-Cookie": `blog_session=${session.id}; Path=/; Max-Age=${30 * 24 * 3600}; HttpOnly; SameSite=Lax` }
  );
}

async function login(ctx) {
  const { username, password } = ctx.body || {};
  if (!username || !password) return fail(ctx, 400, "请输入用户名和密码");

  const user = findUserByUsername(username);
  if (!user) return fail(ctx, 400, "用户名或密码错误");

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    logActivity({
      userId: user.id,
      username: user.username,
      action: "login_failed",
      detail: "密码错误",
      ip: ctx.ip,
    });
    return fail(ctx, 400, "用户名或密码错误");
  }

  if (isLegacyHash(user.password_hash)) {
    try {
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashPassword(password), user.id);
    } catch (e) {
      console.error("[auth] 升级密码哈希失败:", e.message);
    }
  }

  const session = createSession(user.id, ctx.ip);
  logActivity({
    userId: user.id,
    username: user.username,
    action: "login",
    detail: "登录成功",
    ip: ctx.ip,
  });

  return ctx.json(
    200,
    { ok: true, token: session.id, user: publicUser(user) },
    { "Set-Cookie": `blog_session=${session.id}; Path=/; Max-Age=${30 * 24 * 3600}; HttpOnly; SameSite=Lax` }
  );
}

function me(ctx) {
  const user = getUserFromRequest(ctx.req);
  if (!user) return ctx.json(200, { ok: false, user: null });
  const unread = db
    .prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`)
    .get(user.id).c;
  return ctx.json(200, { ok: true, user: publicUser(user), unread });
}

function logout(ctx) {
  const auth = (ctx.req.headers["authorization"] || "").replace(/^Bearer\s+/i, "").trim();
  const cookie = (/(?:^|;\s*)blog_session=([^;]+)/.exec(ctx.req.headers["cookie"] || "") || [])[1];
  const token = auth || cookie;
  const user = getUserFromRequest(ctx.req);
  if (token) deleteSession(token);
  if (user) {
    logActivity({ userId: user.id, username: user.username, action: "logout", detail: "退出登录", ip: ctx.ip });
  }
  return ctx.json(200, { ok: true }, { "Set-Cookie": "blog_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" });
}

/* ==================== 文章 ==================== */

function postsList(ctx) {
  const user = needLogin(ctx);
  if (!user) return;
  const posts = user.role === "admin"
    ? db.prepare(
        `SELECT p.id, p.title, p.slug, p.status, p.created_at, p.updated_at,
                u.username AS author, p.author_id,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
         FROM posts p JOIN users u ON u.id = p.author_id
         ORDER BY p.created_at DESC`
      ).all()
    : db.prepare(
        `SELECT p.id, p.title, p.slug, p.status, p.created_at, p.updated_at,
                u.username AS author, p.author_id,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
         FROM posts p JOIN users u ON u.id = p.author_id
         WHERE p.author_id = ? ORDER BY p.created_at DESC`
      ).all(user.id);
  return ctx.json(200, { ok: true, posts });
}

function postCreate(ctx) {
  const user = needLogin(ctx);
  if (!user) return;
  const { title, content, cover } = ctx.body || {};
  if (!title || !content) return fail(ctx, 400, "标题和内容不能为空");
  if (String(title).length > 100) return fail(ctx, 400, "标题不能超过 100 字");

  const slug = slugify(title);
  const result = db
    .prepare(`INSERT INTO posts (author_id, title, slug, content, cover, status) VALUES (?, ?, ?, ?, ?, 'pending')`)
    .run(user.id, title, slug, content, cover || "");
  const id = Number(result.lastInsertRowid);

  logActivity({
    userId: user.id,
    username: user.username,
    action: "post_create",
    targetType: "post",
    targetId: id,
    detail: `发布《${title}》（待审核）`,
    ip: ctx.ip,
  });

  return ctx.json(200, { ok: true, id, slug });
}

function postGet(ctx) {
  const user = needLogin(ctx);
  if (!user) return;
  const id = ctx.query.get("id");
  if (!id) return fail(ctx, 400, "缺少 id");
  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(id);
  if (!post) return fail(ctx, 404, "文章不存在");
  if (post.author_id !== user.id && user.role !== "admin") return fail(ctx, 403, "无权限");
  return ctx.json(200, { ok: true, post });
}

function postUpdate(ctx) {
  const user = needLogin(ctx);
  if (!user) return;
  const { postId, title, content, cover } = ctx.body || {};
  if (!postId || !title || !content) return fail(ctx, 400, "请填写完整");
  if (String(title).length > 100) return fail(ctx, 400, "标题不能超过 100 字");

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post) return fail(ctx, 404, "文章不存在");
  if (post.author_id !== user.id && user.role !== "admin") return fail(ctx, 403, "无权限");

  const newStatus = user.role === "admin" ? post.status : "pending";
  db.prepare(
    `UPDATE posts SET title = ?, content = ?, cover = ?, status = ?, updated_at = ? WHERE id = ?`
  ).run(title, content, cover || "", newStatus, now(), postId);

  logActivity({
    userId: user.id,
    username: user.username,
    action: "post_update",
    targetType: "post",
    targetId: Number(postId),
    detail: `修改《${title}》${newStatus === "pending" ? "（重新进入待审核）" : ""}`,
    ip: ctx.ip,
  });

  return ctx.json(200, { ok: true });
}

function postDelete(ctx) {
  const user = needLogin(ctx);
  if (!user) return;
  const { postId } = ctx.body || {};
  if (!postId) return fail(ctx, 400, "参数错误");
  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post) return fail(ctx, 404, "文章不存在");
  if (post.author_id !== user.id && user.role !== "admin") return fail(ctx, 403, "无权限");

  db.prepare(`DELETE FROM posts WHERE id = ?`).run(postId);
  logActivity({
    userId: user.id,
    username: user.username,
    action: "post_delete",
    targetType: "post",
    targetId: Number(postId),
    detail: `删除《${post.title}》`,
    ip: ctx.ip,
  });
  return ctx.json(200, { ok: true });
}

function postReview(ctx) {
  const admin = needAdmin(ctx);
  if (!admin) return;
  const { postId, action } = ctx.body || {};
  if (!postId || !["approve", "reject"].includes(action)) return fail(ctx, 400, "参数错误");

  const post = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(postId);
  if (!post) return fail(ctx, 404, "文章不存在");

  const status = action === "approve" ? "approved" : "rejected";
  db.prepare(
    `UPDATE posts SET status = ?, reviewed_at = ?, reviewed_by = ?, updated_at = ? WHERE id = ?`
  ).run(status, now(), admin.id, now(), postId);

  if (post.author_id !== admin.id) {
    notify(
      post.author_id,
      status,
      status === "approved"
        ? `你的文章《${post.title}》已通过审核`
        : `你的文章《${post.title}》被拒绝`,
      status === "approved" ? `/community/view/?slug=${post.slug}` : "/dashboard/"
    );
  }

  logActivity({
    userId: admin.id,
    username: admin.username,
    action: status === "approved" ? "post_approve" : "post_reject",
    targetType: "post",
    targetId: Number(postId),
    detail: `${status === "approved" ? "通过" : "拒绝"}《${post.title}》`,
    ip: ctx.ip,
  });

  return ctx.json(200, { ok: true });
}

function postPublic(ctx) {
  const posts = db.prepare(
    `SELECT p.id, p.title, p.slug, p.content, p.cover, p.created_at,
            u.username AS author, u.avatar AS author_avatar,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.status = 'approved') AS comment_count
     FROM posts p JOIN users u ON u.id = p.author_id
     WHERE p.status = 'approved' ORDER BY p.created_at DESC`
  ).all();
  return ctx.json(200, { ok: true, posts });
}

function postSearch(ctx) {
  const q = (ctx.query.get("q") || "").trim();
  if (!q) return ctx.json(200, { ok: true, posts: [] });
  const like = `%${q}%`;
  const posts = db.prepare(
    `SELECT p.id, p.title, p.slug, p.content, p.cover, p.created_at,
            u.username AS author,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.status = 'approved') AS comment_count
     FROM posts p JOIN users u ON u.id = p.author_id
     WHERE p.status = 'approved' AND (p.title LIKE ? OR p.content LIKE ?)
     ORDER BY p.created_at DESC LIMIT 30`
  ).all(like, like);
  return ctx.json(200, { ok: true, posts });
}

/* ==================== 评论 ==================== */

function commentsList(ctx) {
  const postId = ctx.query.get("postId");
  if (!postId) return fail(ctx, 400, "缺少 postId");
  const comments = db.prepare(
    `SELECT c.id, c.content, c.created_at, c.author_id,
            u.username AS author, u.avatar AS avatar
     FROM comments c JOIN users u ON u.id = c.author_id
     WHERE c.post_id = ? AND c.status = 'approved'
     ORDER BY c.created_at ASC`
  ).all(postId);
  return ctx.json(200, { ok: true, comments });
}

function commentCreate(ctx) {
  const user = needLogin(ctx);
  if (!user) return;
  const { postId, content } = ctx.body || {};
  if (!postId || !content || !String(content).trim()) return fail(ctx, 400, "评论不能为空");
  if (String(content).length > 1000) return fail(ctx, 400, "评论不能超过 1000 字");

  const post = db.prepare(`SELECT id, author_id, title, slug FROM posts WHERE id = ? AND status = 'approved'`).get(postId);
  if (!post) return fail(ctx, 404, "文章不存在");

  const result = db
    .prepare(`INSERT INTO comments (post_id, author_id, content) VALUES (?, ?, ?)`)
    .run(postId, user.id, String(content).trim());

  if (post.author_id !== user.id) {
    notify(post.author_id, "comment", `${user.username} 评论了你的文章《${post.title}》`, `/community/view/?slug=${post.slug}`);
  }

  logActivity({
    userId: user.id,
    username: user.username,
    action: "comment_create",
    targetType: "post",
    targetId: Number(postId),
    detail: `评论了《${post.title}》`,
    ip: ctx.ip,
  });

  return ctx.json(200, { ok: true, id: Number(result.lastInsertRowid) });
}

function commentDelete(ctx) {
  const user = needLogin(ctx);
  if (!user) return;
  const { commentId } = ctx.body || {};
  if (!commentId) return fail(ctx, 400, "参数错误");

  const c = db.prepare(`SELECT * FROM comments WHERE id = ?`).get(commentId);
  if (!c) return fail(ctx, 404, "评论不存在");
  if (c.author_id !== user.id && user.role !== "admin") return fail(ctx, 403, "无权限");

  db.prepare(`DELETE FROM comments WHERE id = ?`).run(commentId);
  logActivity({
    userId: user.id,
    username: user.username,
    action: "comment_delete",
    targetType: "comment",
    targetId: Number(commentId),
    detail: "删除了一条评论",
    ip: ctx.ip,
  });
  return ctx.json(200, { ok: true });
}

function commentsRecent(ctx) {
  const comments = db.prepare(
    `SELECT c.id, c.content, c.created_at,
            u.username AS author, u.avatar AS avatar,
            p.title AS post_title, p.slug AS post_slug
     FROM comments c JOIN users u ON u.id = c.author_id JOIN posts p ON p.id = c.post_id
     WHERE c.status = 'approved' AND p.status = 'approved'
     ORDER BY c.created_at DESC LIMIT 5`
  ).all();
  return ctx.json(200, { ok: true, comments });
}

/* ==================== 管理后台 ==================== */

function adminStats(ctx) {
  const admin = needAdmin(ctx);
  if (!admin) return;
  const one = (sql, ...args) => db.prepare(sql).get(...args).c;
  const dayAgo = now() - 86400;
  const stats = {
    userCount: one(`SELECT COUNT(*) AS c FROM users`),
    postCount: one(`SELECT COUNT(*) AS c FROM posts`),
    pendingCount: one(`SELECT COUNT(*) AS c FROM posts WHERE status = 'pending'`),
    approvedCount: one(`SELECT COUNT(*) AS c FROM posts WHERE status = 'approved'`),
    rejectedCount: one(`SELECT COUNT(*) AS c FROM posts WHERE status = 'rejected'`),
    commentCount: one(`SELECT COUNT(*) AS c FROM comments`),
    onlineCount: one(`SELECT COUNT(DISTINCT user_id) AS c FROM sessions WHERE expires_at > ?`, now()),
    todayUsers: one(`SELECT COUNT(*) AS c FROM users WHERE created_at > ?`, dayAgo),
    todayPosts: one(`SELECT COUNT(*) AS c FROM posts WHERE created_at > ?`, dayAgo),
    todayComments: one(`SELECT COUNT(*) AS c FROM comments WHERE created_at > ?`, dayAgo),
    serverTime: now(),
  };
  return ctx.json(200, { ok: true, stats });
}

function adminUsers(ctx) {
  const admin = needAdmin(ctx);
  if (!admin) return;
  const users = db.prepare(
    `SELECT id, username, email, role, created_at, last_login_at,
            (SELECT COUNT(*) FROM posts WHERE author_id = users.id) AS post_count,
            (SELECT COUNT(*) FROM comments WHERE author_id = users.id) AS comment_count,
            (SELECT COUNT(*) FROM sessions WHERE user_id = users.id AND expires_at > ?) AS session_count
     FROM users ORDER BY created_at DESC`
  ).all(now());
  return ctx.json(200, { ok: true, users, me: admin.id });
}

function adminUserUpdate(ctx) {
  const admin = needAdmin(ctx);
  if (!admin) return;
  const { userId, action } = ctx.body || {};
  if (!userId || !["promote", "demote", "delete", "reset"].includes(action)) {
    return fail(ctx, 400, "参数错误");
  }

  const target = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!target) return fail(ctx, 404, "用户不存在");
  if (target.id === admin.id) return fail(ctx, 400, "不能操作自己");

  if (action === "promote") {
    db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(userId);
  } else if (action === "demote") {
    db.prepare(`UPDATE users SET role = 'user' WHERE id = ?`).run(userId);
  } else if (action === "delete") {
    db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
  } else if (action === "reset") {
    const { newPassword } = ctx.body || {};
    if (!newPassword || String(newPassword).length < 6) return fail(ctx, 400, "新密码至少 6 位");
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashPassword(newPassword), userId);
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
  }

  const label = { promote: "设为管理员", demote: "降为普通用户", delete: "删除用户", reset: "重置密码" }[action];
  logActivity({
    userId: admin.id,
    username: admin.username,
    action: `admin_${action}`,
    targetType: "user",
    targetId: Number(userId),
    detail: `${label}：${target.username}`,
    ip: ctx.ip,
  });

  return ctx.json(200, { ok: true });
}

function adminComments(ctx) {
  const admin = needAdmin(ctx);
  if (!admin) return;
  const comments = db.prepare(
    `SELECT c.id, c.content, c.created_at, u.username AS author,
            p.id AS post_id, p.title AS post_title, p.slug AS post_slug
     FROM comments c JOIN users u ON u.id = c.author_id JOIN posts p ON p.id = c.post_id
     ORDER BY c.created_at DESC`
  ).all();
  return ctx.json(200, { ok: true, comments });
}

/** 后台活动流水（增量拉取：afterId=上次拿到的最大 id） */
function adminActivity(ctx) {
  const admin = needAdmin(ctx);
  if (!admin) return;
  const afterId = Number(ctx.query.get("afterId") || 0) || 0;
  const limit = Math.min(Number(ctx.query.get("limit") || 60) || 60, 200);
  const rows = db.prepare(
    `SELECT id, user_id, username, action, target_type, target_id, detail, ip, created_at
     FROM activity WHERE id > ? ORDER BY id DESC LIMIT ?`
  ).all(afterId, limit);
  const maxId = db.prepare(`SELECT COALESCE(MAX(id), 0) AS m FROM activity`).get().m;
  return ctx.json(200, { ok: true, activity: rows, maxId, serverTime: now() });
}

/* ==================== 个人中心 / 通知 ==================== */

function userUpdate(ctx) {
  const user = needLogin(ctx);
  if (!user) return;
  const { email, bio, avatar } = ctx.body || {};

  if (email !== undefined) {
    if (!EMAIL_RE.test(email)) return fail(ctx, 400, "邮箱格式不正确");
    const exists = db.prepare(`SELECT id FROM users WHERE email = ? AND id != ?`).get(email, user.id);
    if (exists) return fail(ctx, 400, "该邮箱已被使用");
  }

  const updates = [];
  const values = [];
  if (email !== undefined) { updates.push("email = ?"); values.push(email); }
  if (bio !== undefined) { updates.push("bio = ?"); values.push(bio); }
  if (avatar !== undefined) { updates.push("avatar = ?"); values.push(avatar); }
  if (updates.length === 0) return fail(ctx, 400, "没有要更新的内容");

  values.push(user.id);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  logActivity({ userId: user.id, username: user.username, action: "profile_update", detail: "更新了个人资料", ip: ctx.ip });
  return ctx.json(200, { ok: true });
}

async function userPassword(ctx) {
  const user = needLogin(ctx);
  if (!user) return;
  const { oldPassword, newPassword } = ctx.body || {};
  if (!oldPassword || !newPassword) return fail(ctx, 400, "请填写完整");
  if (String(newPassword).length < 6) return fail(ctx, 400, "新密码至少 6 位");

  const valid = await verifyPassword(oldPassword, user.password_hash);
  if (!valid) return fail(ctx, 400, "原密码错误");

  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashPassword(newPassword), user.id);
  logActivity({ userId: user.id, username: user.username, action: "password_change", detail: "修改了密码", ip: ctx.ip });
  return ctx.json(200, { ok: true });
}

function notificationsList(ctx) {
  const user = needLogin(ctx);
  if (!user) return;
  const list = db.prepare(
    `SELECT id, type, title, link, is_read, created_at
     FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
  ).all(user.id);
  const unread = db
    .prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0`)
    .get(user.id).c;
  return ctx.json(200, { ok: true, list, unread });
}

function notificationsRead(ctx) {
  const user = needLogin(ctx);
  if (!user) return;
  const { ids } = ctx.body || {};
  if (Array.isArray(ids) && ids.length > 0) {
    const stmt = db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`);
    for (const id of ids) stmt.run(id, user.id);
  } else {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(user.id);
  }
  return ctx.json(200, { ok: true });
}

/* ==================== 上传 ==================== */

const MAX_UPLOAD = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

async function upload(ctx) {
  const user = needLogin(ctx);
  if (!user) return;

  const chunks = [];
  for await (const chunk of ctx.req) chunks.push(chunk);
  const buf = Buffer.concat(chunks);

  let file;
  try {
    const ct = ctx.req.headers["content-type"] || "";
    const reqLike = new Request("http://localhost/upload", {
      method: "POST",
      headers: { "content-type": ct },
      body: buf,
      duplex: "half",
    });
    const form = await reqLike.formData();
    file = form.get("file");
  } catch (e) {
    return fail(ctx, 400, "上传数据解析失败");
  }

  if (!file || typeof file === "string") return fail(ctx, 400, "没有文件");
  if (file.size > MAX_UPLOAD) return fail(ctx, 400, "文件不能超过 5MB");
  if (!ALLOWED_TYPES.includes(file.type)) return fail(ctx, 400, "只支持 JPG / PNG / GIF / WebP");

  const ext = path.extname(file.name || "").toLowerCase() || ".jpg";
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  const d = new Date();
  const subDir = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const dir = path.join(ROOT_DIR, "public", "uploads", subDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const url = `/uploads/${subDir}/${filename}`;
  logActivity({ userId: user.id, username: user.username, action: "upload", detail: `上传图片 ${url}`, ip: ctx.ip });
  return ctx.json(200, { ok: true, url });
}

/* ==================== 路由表 ==================== */

const routes = new Map([
  ["GET /api/health", (ctx) => ctx.json(200, { ok: true, service: "firefly-api", version: "1.1.0", time: new Date().toISOString() })],
  ["GET /api/ping", (ctx) => ctx.json(200, { ok: true, message: "后端在线", time: new Date().toISOString() })],

  ["POST /api/auth/register", register],
  ["POST /api/auth/login", login],
  ["GET /api/auth/me", me],
  ["POST /api/auth/logout", logout],

  ["GET /api/posts/list", postsList],
  ["POST /api/posts/create", postCreate],
  ["GET /api/posts/get", postGet],
  ["POST /api/posts/update", postUpdate],
  ["POST /api/posts/delete", postDelete],
  ["POST /api/posts/review", postReview],
  ["GET /api/posts/public", postPublic],
  ["GET /api/posts/search", postSearch],

  ["GET /api/comments/list", commentsList],
  ["POST /api/comments/create", commentCreate],
  ["POST /api/comments/delete", commentDelete],
  ["GET /api/comments/recent", commentsRecent],

  ["GET /api/admin/stats", adminStats],
  ["GET /api/admin/users", adminUsers],
  ["POST /api/admin/user-update", adminUserUpdate],
  ["GET /api/admin/comments", adminComments],
  ["GET /api/admin/activity", adminActivity],

  ["POST /api/user/update", userUpdate],
  ["POST /api/user/password", userPassword],

  ["GET /api/notifications/list", notificationsList],
  ["POST /api/notifications/read", notificationsRead],

  ["POST /api/upload", upload],
]);

export async function handleApi(ctx) {
  const fn = routes.get(`${ctx.method} ${ctx.path}`);
  if (!fn) return false;
  await fn(ctx);
  return true;
}
