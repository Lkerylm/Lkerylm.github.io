# Firefly 后端服务（注册 / 登录 / 投稿 / 审核 / 后台 / 实时活动）

零依赖：只用 Node 自带的 `node:http` + `node:sqlite`（需要 **Node 22.5+**，本机是 24）。
数据库沿用项目原有的 `data/blog.db`，老账号、老文章都能直接继续用。

## 一、启动

在项目根目录双击 **`start-server.cmd`**，或者：

```powershell
node server\server.mjs
```

启动后黑窗口会打印：

```
本机:    http://localhost:8787/
局域网:  http://192.168.1.10:8787/     ← 手机用这个
接口:    http://localhost:8787/api/health
```

同一个地址既是**网站**（自动读取 `dist/`，没打包就先 `pnpm build`），也是**接口**，所以网页版和两个 APK 都能直接用它。

## 二、账号规则

- 打开 `/register/` 注册，**第一个注册的账号自动成为管理员**；
- 如果库里已经有用户但没有管理员，启动时会把最早注册的那个提升为管理员（窗口里会有提示）；
- 密码用 `scrypt` 加盐哈希存库（旧库里的 `bcrypt` 哈希在下次登录时自动升级）；
- 登录返回一个 30 天有效的 token，前端存在 `localStorage.firefly_token`，请求时放 `Authorization: Bearer <token>`；
- 管理员可在 `/admin/` 里改角色、删用户、重置密码。

> 忘记管理员密码？停掉服务后执行：
> ```powershell
> node -e "const{DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('data/blog.db');db.prepare(\"UPDATE users SET role='admin' WHERE id=(SELECT MIN(id) FROM users)\").run();console.log('done')"
> ```

## 三、接口一览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查（网页/APK 用它判断后端是否在线） |
| POST | `/api/auth/register` | 注册（username / email / password） |
| POST | `/api/auth/login` | 登录，返回 `token` |
| GET | `/api/auth/me` | 当前用户 + 未读通知数 |
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/posts/list` | 我的文章（管理员=全部） |
| POST | `/api/posts/create` | 投稿（默认 pending） |
| GET | `/api/posts/get?id=` | 单篇（作者或管理员） |
| POST | `/api/posts/update` | 修改（普通用户改完回到待审核） |
| POST | `/api/posts/delete` | 删除 |
| POST | `/api/posts/review` | 审核（管理员，approve / reject） |
| GET | `/api/posts/public` | 已通过的文章（社区页） |
| GET | `/api/posts/search?q=` | 搜索 |
| GET | `/api/comments/list?postId=` | 评论列表 |
| POST | `/api/comments/create` | 发评论（同时通知作者） |
| POST | `/api/comments/delete` | 删评论（本人或管理员） |
| GET / POST | `/api/notifications/list` / `/read` | 通知 |
| GET | `/api/admin/stats` | 后台统计（含今日新增、在线数） |
| GET | `/api/admin/users` | 用户列表 |
| POST | `/api/admin/user-update` | 升/降级、删除、重置密码 |
| GET | `/api/admin/comments` | 全部评论 |
| GET | `/api/admin/activity?afterId=` | **活动流水（增量，用于实时刷新）** |
| POST | `/api/user/update` / `/api/user/password` | 资料 / 改密码 |
| POST | `/api/upload` | 上传图片（multipart，5MB，JPG/PNG/GIF/WebP） |

所有路径带不带结尾斜杠都行（`/api/auth/login/` 与 `/api/auth/login` 等价）。
跨域已开启（回显 Origin + 允许 Authorization 头），所以 GitHub Pages 上的静态站点也能连这个后端。

## 四、实时是怎么做的

后台页 `/admin/` 的「📡 实时活动」每 2 秒请求一次
`/api/admin/activity/?afterId=<上次最大id>`，只取新增记录，插到列表顶部并高亮；
统计卡片每 5 秒刷新。社区文章页的评论每 5 秒刷新。
这样不用 WebSocket，穿透/代理下也不会断。

## 五、局域网之外的访问（可选）

手机不在同一个 Wi-Fi 时，需要把 8787 暴露到公网，任选一种：

1. **Cloudflare Tunnel（免费、给 https 地址）**
   ```powershell
   winget install --id Cloudflare.cloudflared
   cloudflared tunnel --url http://localhost:8787
   ```
   它会打印 `https://xxxx.trycloudflare.com`，把这个地址填到 App 里即可（临时地址，重启会变）。
2. **路由器端口映射**：把外网 8787 映射到本机 8787（需要公网 IP）。
3. **VPS**：把整个项目（含 `data/`）放到服务器上跑 `node server/server.mjs`。

> 公网暴露时建议把端口改成不常见的值，并给管理员设一个强密码。

## 六、安全说明

- 密码只存 scrypt 哈希，不存明文；token 存在 `sessions` 表，30 天过期；
- 上传只接受 4 种图片格式，单文件 ≤ 5MB，文件名随机；
- 数据库就是 `data/blog.db`，**备份这个文件就等于备份全部用户/文章/评论**。
