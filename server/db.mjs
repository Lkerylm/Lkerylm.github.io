/**
 * Firefly 独立后端 - 数据库层
 * 复用原项目 data/blog.db 的表结构与数据（node:sqlite，无需安装任何依赖）
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = process.env.FIREFLY_DB || path.join(DATA_DIR, "blog.db");
export const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

function hasColumn(table, name) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === name);
}

function ensureColumn(table, name, ddl) {
  if (!hasColumn(table, name)) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    } catch (e) {
      console.error(`[db] 添加列 ${table}.${name} 失败:`, e.message);
    }
  }
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      reviewed_at INTEGER,
      reviewed_by INTEGER,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL DEFAULT '游客',
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      detail TEXT,
      ip TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);
  `);

  // 老库补列
  ensureColumn("posts", "cover", "cover TEXT DEFAULT ''");
  ensureColumn("users", "bio", "bio TEXT DEFAULT ''");
  ensureColumn("users", "avatar", "avatar TEXT DEFAULT ''");
  ensureColumn("users", "last_login_at", "last_login_at INTEGER");
}

initTables();

/** 没有任何管理员时，把最早注册的用户提升为管理员，避免后台进不去 */
export function ensureAdmin() {
  const admin = db.prepare(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`).get();
  if (admin) return null;
  const first = db.prepare(`SELECT id, username FROM users ORDER BY id ASC LIMIT 1`).get();
  if (!first) return null;
  db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(first.id);
  return first;
}

export function logActivity({ userId = null, username = "游客", action, targetType = null, targetId = null, detail = "", ip = "" }) {
  try {
    db.prepare(
      `INSERT INTO activity (user_id, username, action, target_type, target_id, detail, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, username, action, targetType, targetId, detail, ip);
  } catch (e) {
    console.error("[activity] 写入失败:", e.message);
  }
}

export function notify(userId, type, title, link = "") {
  try {
    db.prepare(
      `INSERT INTO notifications (user_id, type, title, link) VALUES (?, ?, ?, ?)`
    ).run(userId, type, title, link);
  } catch (e) {
    console.error("[notify] 写入失败:", e.message);
  }
}
