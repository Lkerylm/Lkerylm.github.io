# 部署 & 搜索引擎收录指南

本站是 **纯静态站点**（Astro static），构建产物在 `dist/`，可以直接丢到任何静态托管。

## 一、本地验证

```bash
pnpm install
pnpm build      # 生成 dist/，并自动生成 Pagefind 搜索索引
pnpm preview    # 本地预览 http://localhost:4321
```

`pnpm build` 会依次执行：生成图标 → `astro build` → `pagefind --site dist`。

## 二、部署到 GitHub Pages（当前使用，无需任何新账号）

线上地址：**<https://lkerylm.github.io/>**，全程只用 GitHub 账号，不需要 Vercel、不需要手机验证。

- 仓库：`Lkerylm/Lkerylm.github.io`（仓库名必须是 `<用户名>.github.io`，这样网址落在根路径 `/`，
  站内所有绝对路径 `/Firefly-live2d-main/...`、`/_astro/...` 都不用改）
- 发布源：**分支 `pages` 的根目录**（Settings → Pages → Source: Deploy from a branch → `pages` / `/ (root)`）
- 构建方式：`.github/workflows/deploy.yml` 在 push 到 `main` 后执行 `pnpm build`，
  再用 `JamesIves/github-pages-deploy-action` 把 `dist` 推到 `pages` 分支，Pages 自动发布
- 站点地址：Settings → Secrets and variables → Actions → **Variables** → `SITE_URL = https://lkerylm.github.io`
  （没有它，canonical / sitemap / robots 会退回 `http://localhost:4321`）
- 手动重跑：Actions → `Deploy to Pages Branch` → **Run workflow**
- 换域名 / 换用户名：改 Variables 里的 `SITE_URL`，再重跑一次工作流

## 三、部署到 Vercel（可选，仓库里已带 vercel.json）


1. 把项目推到 GitHub / GitLab。
2. 打开 <https://vercel.com/new>，选择该仓库。
3. Framework 会自动识别为 **Astro**，构建命令 `pnpm build`、输出目录 `dist`（`vercel.json` 已写好，直接 Next 即可）。
4. 环境变量（可选）：
   - `SITE_URL` = `https://你的域名`（自定义域名时填写）
   - 不填也能用：会自动读取 `VERCEL_PROJECT_PRODUCTION_URL`。
5. Deploy → 得到 `https://xxx.vercel.app`。

> 绑定自定义域名后，**务必**把 `SITE_URL` 改成最终域名再重新部署一次，
> 这样 canonical、sitemap、robots、JSON-LD 里的地址才是对的。

## 四、部署到 Netlify / Cloudflare Pages

- Netlify：Build command `pnpm build`，Publish directory `dist`，环境变量同上。
- Cloudflare Pages：Framework preset 选 Astro，Build command `pnpm build`，Output `dist`。

## 五、让 Bing 收录（只做 Bing 的完整流程）

> **不想注册任何账号也能被收录**：直接执行 `pnpm indexnow` 即可（本项目已内置，返回 `202 Accepted`
> 就代表 Bing 已收到）。下面的 Bing Webmaster Tools 只是用来查看收录数据、提交 sitemap，**可选**。

### 1. 添加站点并验证（可选）

1. 打开 <https://www.bing.com/webmasters>，用 Microsoft 账号登录；
2. **添加网站** → 填写部署后的地址，如 `https://firefly-blog-xxxx.vercel.app`；
3. 验证方式选 **XML 文件**，下载 `BingSiteAuth.xml`；
4. 把文件放进项目的 `public/` 目录，然后提交推送：

   ```powershell
   git add public/BingSiteAuth.xml ; git commit -m "verify bing" ; git push
   ```

5. 等平台重新部署完成（Vercel 约 1 分钟），回到 Bing 点「验证」。
   - 也可以选 **HTML 元标记**：把 `<meta name="msvalidate.01" content="..." />`
     贴到 `src/layouts/Layout.astro` 的 `<head>` 中（`<meta name="robots" ...>` 附近）再重新部署。

### 2. 提交站点地图

Bing 后台 → **站点地图** → 提交：

```
https://你的域名/sitemap-index.xml
```

### 3. 用 IndexNow 立即通知（比等爬虫快很多）

项目已内置脚本，校验文件是 `public/71eb0a3193d74c01be38358479103e2a.txt`（**不要删除**）。

```powershell
pnpm build
$env:SITE_URL = "https://你的域名"
pnpm indexnow              # 提交 sitemap 中的所有页面
pnpm indexnow --dry-run    # 只想先看看会提交哪些 URL
```

成功会打印 `✔ IndexNow 响应：200/202`，Bing 通常几分钟到 24 小时内开始抓取。
以后每次发布新文章，部署完成后重跑一次 `pnpm indexnow` 即可。

> IndexNow 的 key 文件必须能通过
> `https://你的域名/71eb0a3193d74c01be38358479103e2a.txt` 打开；
> 打不开说明还没部署成功或文件被删除了。

### 4. 确认已收录

在 Bing 搜索：

```
site:你的域名
```

能搜到页面就说明已收录（新站一般 1~14 天，执行 `pnpm indexnow` 后会快很多）。

### 5. 以后更新文章

`git push` → 平台自动重新部署 → 再执行一次 `pnpm indexnow`。

### 可选：Google / 百度

- Google Search Console <https://search.google.com/search-console>：添加资源 → 验证（HTML 文件放 `public/`）→ 提交 `sitemap-index.xml`。
- 百度搜索资源平台 <https://ziyuan.baidu.com>：添加站点 → 验证 → 提交 sitemap；主要面向国内访客时建议做。

站点已自带：
- `robots.txt`（`/robots.txt`，含 Sitemap 地址，屏蔽后台页面）
- `sitemap-index.xml` + `sitemap-0.xml`
- IndexNow 校验文件 + `pnpm indexnow` 推送脚本（让 Bing 立即抓取）
- 每页 `canonical`、`og:*`、`twitter:*`、`robots: index,follow`
- 首页 `WebSite` + `SearchAction` 结构化数据；文章页 `BlogPosting` 结构化数据
- Pagefind 站内搜索（`/search/`）

## 六、内容更新

在 `src/content/posts/` 新建 `.md` / `.mdx` 文件（参考 `welcome-to-anime-home.md` 的 frontmatter），
提交后重新部署即可；无需数据库。

## 七、关于后台 / 社区 / 登录功能

这些功能依赖服务器 + SQLite（`node:sqlite`），已从静态构建中移出，代码完整保留在：

```
src/_server/api/                 原来的所有 API
src/_server/community/           社区文章详情页
src/_server/user/                用户主页
src/_server/dashboard-posts/     后台文章编辑页
```

静态站点下它们不可用（首页社区动态区块已隐藏、`robots.txt` 已屏蔽相关路径）。
如果你以后想让它们重新工作：

1. 安装适配器：`pnpm add @astrojs/vercel`（或 `@astrojs/node`）；
2. 在 `astro.config.mjs` 里加 `adapter` 并设置 `output: "server"`；
3. 把 `src/_server/*` 的内容移回 `src/pages/` 对应位置；
4. 注意 Vercel/Netlify 的文件系统是临时的，SQLite 数据不会持久化，
   正式使用建议换成云数据库（Turso / Supabase / Neon 等）。

## 八、2.0.0 起：账号 / 后台 / 实时数据已经可用

新增了**独立后端** `server/`（Node + `node:sqlite`，零依赖），不需要 Astro 适配器、不影响静态部署：

```powershell
# 在项目根目录双击，或：
node server\server.mjs        # http://localhost:8787  +  http://192.168.x.x:8787
```

同一个端口同时提供 **打包好的网站（dist/）** 和 **全部接口（/api/*）**：

- 注册 / 登录 / 退出 / 当前用户
- 投稿 / 改稿 / 删除 / 审核（管理员）
- 评论 / 通知
- 后台：统计、用户管理（升降级、删除、重置密码）、评论管理、**活动流水**
- 上传图片（`public/uploads/`）

前端通过 `public/firefly-api.js` 统一接入：它给所有 `fetch('/api/...')` 自动拼后端地址、带上
`Authorization: Bearer <token>`，登录/注册成功后自动保存 token。所以：

- 在 `http://localhost:8787/` 打开网站 → 同源，直接可用；
- 在 GitHub Pages 上打开 → 点导航栏的 **⚙**，填 `http://192.168.x.x:8787` 即可跨域连上（后端已开 CORS）。

第一个注册的账号自动成为管理员；老库（`data/blog.db`）里的用户和文章继续有效，
bcrypt 老密码会在下次登录时自动升级为 scrypt。

详见 `server/README.md`。两个 APK 的构建见 `FireflyAPK/APK-README.md`（`node build-two-apks.mjs both`）。

