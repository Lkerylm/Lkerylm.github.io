# 公益寻亲 & Edge / Bing 收录说明

本次更新做了三件事：

1. **公益寻亲**：全站浮动卡片 + 独立页面 `/aid/`，可手动关闭、点击跳官方链接、数据运行时实时刷新，并且**只转载官方已公开的文字要点**（不转载照片 / 海报 / 原文），避免侵权。
2. **Edge 里能搜到**：OpenSearch 描述文件、结构化数据、sitemap、IndexNow 自动推送、更完整的页头 SEO。
3. **非首页全部「更二次元、更可爱」**：统一的 `CutePageHero` 粉彩头图 + 文案重写（404 / 关于 / 归档 / 友链 / 留言板 / 赞助 / 相册 / 番组 / 社区）。

---

## 一、公益寻亲

### 1. 卡片行为

| 需求 | 实现 |
| --- | --- |
| 可以手动关闭 | 卡片右上角 `×`，关闭时间写入 `localStorage: aid_closed_until`，默认 7 天（`rememberDays`）后自动恢复 |
| 关掉后还能找回来 | 右下角保留一个 🧸「寻亲」小胶囊，点一下立刻重新打开 |
| 点击会跳转链接 | 点击卡片正文直接打开官方公益链接（有具体条目时跳到该条的官方详情页），`target="_blank"` + `rel="noopener noreferrer"` |
| 实时更新 | 运行时 `fetch` 数据文件（`cache: no-store`），默认每 5 分钟刷新；切回标签页 / 网络恢复时立即补拉；显示「x 分钟前同步」 |
| 不侵权 | 只显示文字字段 + 官方来源链接，不下载、不缓存、不二次加工任何照片 |

### 2. 配置

- 行为配置：`src/config/aidConfig.ts`
  - `enable`：总开关
  - `closeable` / `rememberDays`：关闭与记忆天数
  - `position`：`bottom-right` / `bottom-left`
  - `rotateSeconds` / `refreshMinutes`：轮播与刷新间隔
  - `dataUrl`：数据文件地址
  - `portalUrl`：点击卡片默认跳转的官方链接
  - `sources`：官方渠道列表（`/aid/` 页面与卡片底部都会展示）

- 数据文件：`public/data/aid/missing-children.json`

```json
{
  "version": 1,
  "updatedAt": "2026-11-03T12:00:00+08:00",
  "notice": "版权/隐私说明",
  "tips": ["没有条目时轮播的公益提示"],
  "entries": [
    {
      "name": "李*",
      "gender": "女",
      "birthYear": 2015,
      "missingDate": "2024-05-01",
      "missingPlace": "四川省成都市",
      "feature": "走失时穿……（只写事实，不写未经证实的推测）",
      "source": "宝贝回家寻子网",
      "sourceUrl": "https://官方详情页"
    }
  ]
}
```

> 没有 `entries` 时，卡片会轮播 `tips` 公益提示，并引导点击直达官方平台。

### 3. 「实时更新」怎么接

- 方式 A（推荐，零后端）：把你有权转载的官方 / 授权数据源配置成仓库 **Variables → `AID_FEED_URL`**，
  `.github/workflows/aid-sync.yml` 会每 6 小时同步一次并自动提交，站点重新部署后即生效。
- 方式 B（本地手动）：`$env:AID_FEED_URL="https://.../feed.json"; pnpm aid-sync`
- 方式 C（完全手改）：直接编辑 `public/data/aid/missing-children.json`，推到 main 即可。
- 前端也会自己轮询，所以**同一个部署内**改了 JSON 也能在几分钟内刷新出来。

数据源格式（二选一）：

```json
[ { "name": "...", "sourceUrl": "https://..." } ]
```

```json
{ "updatedAt": "2026-11-03T12:00:00+08:00", "entries": [ { "name": "...", "sourceUrl": "https://..." } ] }
```

`scripts/sync-aid.mjs` 会**丢弃没有官方来源链接的条目**，避免传播无法核实的信息。

### 4. 合规边界（请务必保持）

- 只转发**事实性文字**（姓名 / 性别 / 出生年 / 走失时间与地点等），并保留官方来源链接；不转载照片、海报与原文排版。
- 不收集、不存储任何寻亲个人信息；不用于商业用途。
- 权利人提出异议时，删除或更正对应条目。
- 页面上明确「发现线索请拨打 110」，并提示「任何索要转账的『内部渠道』都是诈骗」。

---

## 二、在 Edge / Bing 里被搜到

已加入：

1. `src/pages/opensearch.xml.ts` → `/opensearch.xml`
   - `Layout.astro` 与 `AnimeHeadMeta.astro` 都输出了 `<link rel="search" type="application/opensearchdescription+xml">`
   - 说明：新版 Edge（Chromium 内核）已不再像老 IE 那样自动「发现」并添加站内搜索，所以这一步主要是给仍支持 OpenSearch 的浏览器 / 工具用；真正决定「在 Edge 里能不能搜到」的，是下面第 3、4 点的收录。
2. `Layout.astro` 原有 `WebSite` + `SearchAction` 结构化数据（保留并继续生效），`AnimeHeadMeta.astro` 补齐了标题 / 描述 / robots / og（后台、登录页默认 `noindex`）
3. `robots.txt` 增加 `Allow: /aid/`，并保留 sitemap 指向
4. `.github/workflows/deploy.yml` 部署后自动：
   - `pnpm indexnow`（推送到 Bing / Yandex 等，Bing 就是 Edge 的默认引擎）
   - `https://www.bing.com/ping?sitemap=.../sitemap-index.xml`

还需要你在外面做的一次性动作（代码无法替代）：

1. 打开 [Bing Webmaster Tools](https://www.bing.com/webmasters)，添加并验证 `https://lkerylm.github.io`；
2. 提交 sitemap：`https://lkerylm.github.io/sitemap-index.xml`；
3. 想更快的话，在 Bing Webmaster 里手动「Submit URLs」提交首页与 `/aid/`；
4. 收录有延迟（几小时到几天），在 Edge 里搜「我的动漫小屋」「Lkerylm 动漫小屋」即可验证。

---

## 三、可爱化改造清单

| 页面 | 改动 |
| --- | --- |
| `/404/` | 全新「页面走丢了」页面：渐变 404、漂浮小图标、三个出口（首页 / 搜索 / 公益寻亲） |
| `/about/` | 粉彩头图 + 文案重写（保留真实信息） |
| `/archive/` | 「时光归档」头图 |
| `/friends/` | 「二次元邻居」头图 |
| `/guestbook/` | 「留言板」头图 + 文案变软 |
| `/sponsor/` | 「请我喝奶茶」头图 |
| `/gallery/` | 「相册」头图 |
| `/bangumi/` | 「追番进度」头图 |
| `/community/` | 深色页 → 粉彩渐变、圆角卡片、可爱空状态、新增公益寻亲入口 |
| 导航栏 | 「关于」子菜单新增 **公益寻亲** |

公共组件：`src/components/common/CutePageHero.astro`（纯 CSS，无图片，无版权风险；支持 `pink / mint / sky / peach` 四种配色）。
