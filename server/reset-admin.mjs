/**
 * 管理员工具：创建 / 重置一个管理员账号
 *
 *   node server/reset-admin.mjs 用户名 新密码
 *   node server/reset-admin.mjs            # 不带参数 = 把最早注册的用户提升为管理员
 */
import { db, ensureAdmin } from "./db.mjs";
import { hashPassword, findUserByUsername, createUser, deleteUserSessions } from "./auth.mjs";

const [username, password] = process.argv.slice(2);

if (!username) {
  const promoted = ensureAdmin();
  if (promoted) {
    console.log(`✔ 已把最早注册的用户「${promoted.username}」提升为管理员`);
  } else {
    const admin = db.prepare(`SELECT username FROM users WHERE role='admin' ORDER BY id LIMIT 1`).get();
    console.log(admin ? `已经是管理员：${admin.username}` : "库里还没有用户，请先打开 /register/ 注册");
  }
  process.exit(0);
}

if (!password || String(password).length < 6) {
  console.error("用法：node server/reset-admin.mjs <用户名> <至少6位密码>");
  process.exit(1);
}

const existing = findUserByUsername(username);
if (existing) {
  db.prepare(`UPDATE users SET password_hash = ?, role = 'admin' WHERE id = ?`).run(hashPassword(password), existing.id);
  deleteUserSessions(existing.id);
  console.log(`✔ 已重置「${username}」的密码，并设为管理员（该账号原有登录已失效，需重新登录）`);
} else {
  const user = createUser(username, `${username}@local`, hashPassword(password), "admin");
  console.log(`✔ 已创建管理员「${user.username}」（邮箱占位：${user.email}）`);
}
