# Firefly 后端服务（邮箱验证码免密登录 / 投稿 / 审核 / 后台 / 实时活动）

零依赖：只用 Node 自带的 `node:http` + `node:sqlite`（需要 **Node 22.5+**，本机是 24）。
数据库沿用项目原有的 `data/blog.db`，老账号、老文章都能直接继续用。

登录方式：**输入邮箱 → 收 6 位验证码 → 自动登录**。
邮箱第一次出现时自动建号（不需要单独的注册表单，也不需要记密码），
验证码、会话、用户资料全部存在你自己的 `data/blog.db` 里，不经过任何第三方账号系统。
只有想让**别人**也能登录时，才需要在 `.env` 里配一个 SMTP 用来发信（见「二、账号规则」）。

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

启动成功时浏览器会**自动打开登录页**（就跟平时打开一个网站一样）；不想自动打开就设 `FIREFLY_NO_OPEN=1` 再启动。

### 访客打开后看到什么（不用填任何地址）

不管用哪种方式部署，访客只需要做两件事：**填邮箱 → 填 6 位验证码**，验证完就登录成功，并自动回到首页（管理员进 `/admin/` 后台，可以加 `?redirect=/dashboard/` 指定别处）。

| 你怎么部署 | 访客怎么用 | 要不要填服务器地址 |
|---|---|---|
| 直接把 `http://<你电脑IP>:8787/`（或隧道地址）发给他 | 打开就是本站，网页和接口同源 | **不用**，页面里没有「服务器设置」这种东西 |
| 网站放 GitHub Pages、后端跑在你电脑上 | 打包时在 `.env` 写一次 `PUBLIC_API_BASE=后端地址`，构建会把地址写进页面 | **不用**，访客完全看不到 ⚙ 面板 |

- `PUBLIC_API_BASE` 只在**打包时**读一次，换地址后要重新 `pnpm build` 再上传；
- 一旦写了 `PUBLIC_API_BASE`，登录页右下角的 ⚙「服务器」按钮会对访客**自动隐藏**（站点状态也只会显示「账号服务在线 / 暂时离线」）；
- 站点由 `start-server.cmd` 自己发（网页 + `/api/*` 同源）时，页面会用同源 `/api/health` 探一下，**探测通过就把 ⚙ 收起来**，访客看到的就是普通网站；
- 你自己临时要改地址：打开 `https://你的站/login/?setup=1`，⚙ 就会出现；
- 只有「网页在公网、后端在别处」又没写 `PUBLIC_API_BASE` 的构建才默认显示 ⚙，作为兜底。

> 账号数据依然全在你电脑上：`data/blog.db` 一个文件装了用户、验证码、会话、文章、评论，
> 网站只是「外壳」，就算换成 GitHub Pages 托管，注册和登录也还是在写你电脑里的这个文件。

## 二、账号规则（邮箱验证码，免密码）

打开 `/login/`（或 `/register/`，两个页面其实是同一个流程）：

1. 填邮箱 → 点「发送验证码」；
2. 邮箱第一次出现：自动建号（用户名取邮箱 @ 前面那段，重名自动加 `-2`、`-3`…）；
3. 填入 6 位验证码 → 直接登录，页面自动回首页（管理员自动进 `/admin/`；想让所有人都去个人中心就访问 `/login/?redirect=/dashboard/`）。

细节：

- **第一个账号自动成为管理员**；如果库里已有用户但没有管理员，启动时会把最早注册的那个提升为管理员（窗口里有提示）；
- 验证码只存 **sha256(salt + email + code)**，10 分钟过期、一次性使用、同一条最多试 5 次；
- 同一邮箱 60 秒内只能发一次、1 小时最多 5 次；同一 IP 1 小时最多 20 次（`FIREFLY_CODE_TTL` / `FIREFLY_CODE_RESEND` 可调）；
- 登录返回 30 天有效的 token，前端存 `localStorage.firefly_token`，请求时放 `Authorization: Bearer <token>`（同时也会写 `blog_session` Cookie）；
- 验证码账号在库里 `password_hash = "!passwordless"`，所以**密码登录永远不可能命中**这些账号；
- 老账号 / 管理员重置过密码的账号仍然可以用用户名 + 密码走 `POST /api/auth/login`，密码用 `scrypt` 加盐哈希（旧库的 `bcrypt` 哈希在下次登录时自动升级）；
- 管理员可在 `/admin/` 里改角色、删用户、重置密码。

### 发信怎么配（不配也能用）

默认是**开发模式**：不连 SMTP，验证码直接打印在服务器窗口，并且本机 / 局域网 IP 访问页面时会自动填入，单机自用零配置。

想让别人（不在你电脑前的人）也能登录，就在项目根目录的 `.env` 里加：

```ini
FIREFLY_SMTP_HOST=smtp.qq.com
FIREFLY_SMTP_PORT=465
FIREFLY_SMTP_SECURE=true
FIREFLY_SMTP_USER=123456789@qq.com
FIREFLY_SMTP_PASS=邮箱授权码        # QQ/163 要在邮箱设置里生成，不是登录密码
FIREFLY_MAIL_FROM=123456789@qq.com
FIREFLY_MAIL_FROM_NAME=我的动漫小屋
```

保存后重启服务即可（`GET /api/auth/mail-status` 会返回 `mode: "smtp"`）。
发信依赖 `nodemailer`（已装）；SMTP 挂了不会让接口 500，只在服务器窗口报错。

> 忘记管理员密码 / 想恢复账号？停掉服务后执行（会重置密码并设为管理员，旧登录全部失效）：
> ```powershell
> node server/reset-admin.mjs 你的用户名 新密码     # 账号不存在则直接创建
> node server/reset-admin.mjs                      # 不带参数 = 把最早注册的用户提升为管理员
> ```

## 三、接口一览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查（网页/APK 用它判断后端是否在线） |
| POST | `/api/auth/request-code` | 发送邮箱验证码（`email`；60 秒冷却；开发模式 + 本机/局域网直连会返回 `devCode`；未配 SMTP 时公网访客返回 503） |
| POST | `/api/auth/verify-code` | 校验验证码并登录，返回 `token` / `user`（邮箱首次出现自动建号） |
| GET | `/api/auth/mail-status` | 邮件模式（`smtp` / `dev`），登录页用它给提示 |
| POST | `/api/auth/register` | 老接口：用户名 + 密码注册（保留兼容） |
| POST | `/api/auth/login` | 老接口：用户名 + 密码登录（验证码账号无法使用） |
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

> **更省事的做法**：直接用隧道地址当网站地址（它在浏览器里打开就是完整站点，接口同源）。
> 这样访客不用填任何地址，也不用维护 `PUBLIC_API_BASE`。
> 缺点是 `trycloudflare` 的临时域名每次重启都变；想固定就用 Cloudflare 的命名隧道 / 自己的域名。
>
> 如果你坚持「静态站放 GitHub Pages + 后端在家」：把隧道地址写进 `.env` 的 `PUBLIC_API_BASE`
> 再 `pnpm build` 上传。访客仍然只要填邮箱和验证码，但隧道地址一换就得重新打包。

> 公网暴露时建议：端口改成不常见的值、配上 SMTP（否则远程访客收不到验证码）、
> 并留意 `/api/auth/request-code` 的频率限制日志。

## 六、安全说明

- 密码只存 scrypt 哈希；验证码只存加盐 sha256，一次性、10 分钟过期、限次限频；
- token 存在 `sessions` 表，30 天过期，退出登录即删除；
- 开发模式把验证码回给页面的前提是「本机/局域网 **且** 没走隧道/反代」（`X-Forwarded-For` 等转发头一出现就不回），
  公网访客拿不到别人的验证码；没配 SMTP 时公网请求会直接 503，不会假装「已发送」；
- 邮箱验证码账号的 `password_hash` 是 `!passwordless`，密码登录接口永远匹配不上；
- 上传只接受 4 种图片格式，单文件 ≤ 5MB，文件名随机；
- 数据库就是 `data/blog.db`，**备份这个文件就等于备份全部用户/文章/评论**。
