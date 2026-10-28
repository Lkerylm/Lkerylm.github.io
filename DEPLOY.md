# 部署 & 搜索引擎收录指南

本站是 **纯静态站点**（Astro static），构建产物在 `dist/`，可以直接丢到任何静态托管。

## 一、本地验证

```bash
pnpm install
pnpm build      # 生成 dist/，并自动生成 Pagefind 搜索索引
pnpm preview    # 本地预览 http://localhost:4321
```

`pnpm build` 会依次执行：生成图标 → `astro build` → `pagefind --site dist`。

## 二、部署到 Vercel（推荐，仓库里已带 vercel.json）

1. 把项目推到 GitHub / GitLab。
2. 打开 <https://vercel.com/new>，选择该仓库。
3. Framework 会自动识别为 **Astro**，构建命令 `pnpm build`、输出目录 `dist`（`vercel.json` 已写好，直接 Next 即可）。
4. 环境变量（可选）：
   - `SITE_URL` = `https://你的域名`（自定义域名时填写）
   - 不填也能用：会自动读取 `VERCEL_PROJECT_PRODUCTION_URL`。
5. Deploy → 得到 `https://xxx.vercel.app`。

> 绑定自定义域名后，**务必**把 `SITE_URL` 改成最终域名再重新部署一次，
> 这样 canonical、sitemap、robots、JSON-LD 里的地址才是对的。

## 三、部署到 Netlify / Cloudflare Pages

- Netlify：Build command `pnpm build`，Publish directory `dist`，环境变量同上。
- Cloudflare Pages：Framework preset 选 Astro，Build command `pnpm build`，Output `dist`。

## 四、提交搜索引擎（让别人能搜到）

部署成功后依次做：

1. **Google Search Console** <https://search.google.com/search-console>
   - 添加资源 → 选择「网址前缀」填你的域名；
   - 验证方式两种都行：
     - **HTML 文件**：把下载的 `googlexxxxx.html` 放进 `public/` 根目录，重新部署后访问
       `https://你的域名/googlexxxxx.html` 验证；
     - **HTML 标记**：把给出的 `<meta name="google-site-verification" ...>` 粘贴到
       `src/layouts/Layout.astro` 的 `<head>` 里（`<meta name="robots" ...>` 附近），重新部署；
   - 验证通过后 → 「站点地图」→ 提交 `sitemap-index.xml`。
2. **Bing Webmaster Tools** <https://www.bing.com/webmasters>
   - 可直接从 Google Search Console 导入，同样提交 `sitemap-index.xml`。
3. **百度搜索资源平台**（面向中文访客建议做）<https://ziyuan.baidu.com>
   - 验证站点 → 提交 `https://你的域名/sitemap-index.xml`。
4. 想更快收录：在 Google Search Console 用「网址检查」逐个请求编入索引首页与主要文章。

站点已自带：
- `robots.txt`（`/robots.txt`，含 Sitemap 地址，屏蔽后台页面）
- `sitemap-index.xml` + `sitemap-0.xml`
- 每页 `canonical`、`og:*`、`twitter:*`、`robots: index,follow`
- 首页 `WebSite` + `SearchAction` 结构化数据；文章页 `BlogPosting` 结构化数据
- Pagefind 站内搜索（`/search/`）

## 五、内容更新

在 `src/content/posts/` 新建 `.md` / `.mdx` 文件（参考 `welcome-to-anime-home.md` 的 frontmatter），
提交后重新部署即可；无需数据库。

## 六、关于后台 / 社区 / 登录功能

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
