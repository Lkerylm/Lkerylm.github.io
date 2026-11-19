# 第三方组件与素材致谢 / Third-Party Notices

本文件记录本站用到的**第三方代码与素材**、各自的许可，以及仍需确认的项目。
配套文件：

- [`LICENSE`](LICENSE) — 本仓库代码的 MIT 许可（含上游 saicaca / CuteLeaf 版权行）
- [`NOTICE.md`](NOTICE.md) — 分层授权、二创与角色 IP 声明
- `LICENSES/` — 随仓库分发的完整许可原文（Apache-2.0、OFL-1.1、MPL-2.0）
- 站点运行时版本：<https://lkerylm.github.io/licenses/>（构建时自动生成，含全部依赖的实时版本号）

更新方式：

```bash
pnpm legal   # 重新生成 public/licenses/（依赖清单 + 许可页 + 文本副本）
```

---

## 1. 代码框架与上游项目

| 项目 | 用途 | 许可 | 说明 |
| --- | --- | --- | --- |
| [Firefly](https://github.com/CuteLeaf/Firefly)（CuteLeaf） | 本站的 Astro 主题底座 | MIT | 本仓库在其基础上二次开发，`LICENSE` 中保留其版权行 |
| saicaca（上游作者） | Firefly 所基于的原始项目作者 | MIT | 版权行由 Firefly 的 `LICENSE` 一并保留 |
| [Astro](https://astro.build) 6.x | 静态站点框架 | MIT | — |

## 2. npm 依赖（共 71 个直接依赖，2026-11-18 核对）

> 传递依赖数量更多，完整清单以 `pnpm legal` 生成的
> `/licenses/dependencies.json` 与站点 `/licenses/` 页面为准。

| 许可 | 数量 | 需要履行的义务 |
| --- | --- | --- |
| MIT | 54 | 保留版权与许可声明 |
| Apache-2.0 | 5 | 保留版权/许可声明，附 `LICENSES/Apache-2.0.txt`，标注修改（如有） |
| CC BY 4.0 | 3 | **必须署名**（本站已在 `/licenses/` 与关于页署名） |
| OFL-1.1 | 2 | 保留字体名与版权声明，不得单独售卖字体 |
| MPL-2.0 | 1 | 文件级 copyleft：修改过的 MPL 文件需公开（本站未修改） |
| BSD-3-Clause / BlueOak-1.0.0 / MIT-0 / Unlicense / CC0-1.0 / MIT OR Apache-2.0 | 各 1 | 保留声明或无需署名 |

按许可分组的主要包：

- **Apache-2.0**：`@iconify-json/material-symbols`、`@iconify-json/mdi`、`@iconify-json/mingcute`、`sharp`、`typescript`
- **CC BY 4.0**（需署名）：`@iconify-json/fa7-brands`、`@iconify-json/fa7-regular`、`@iconify-json/fa7-solid`
  → 图标来自 [Font Awesome Free 7](https://fontawesome.com/license/free)：*Icons: CC BY 4.0，Fonts: SIL OFL 1.1，Code: MIT，© Fonticons, Inc.*
- **CC0-1.0**：`@iconify-json/simple-icons`
- **OFL-1.1**：`@fontsource/roboto`、`@fontsource-variable/jetbrains-mono`（字体文件；两份版权行分别见 `LICENSES/OFL-1.1.txt` 与 `LICENSES/OFL-1.1-JetBrainsMono.txt`）
- **MPL-2.0**：`satori`（用于生成 OG 分享图）
- **BSD-3-Clause**：`bcryptjs`
- **BlueOak-1.0.0**：`glob`
- **MIT-0 / Unlicense / MIT OR Apache-2.0**：`postcss-nesting`、`remark-directive-rehype`、`@biomejs/biome`
- **MIT（54 个）**：`astro`、`svelte`、`tailwindcss`、`pagefind`、`photoswipe`、`katex`、`marked`、`sanitize-html`、
  `overlayscrollbars`、`qrcode`、`dayjs`、`@swup/astro`、各 `@astrojs/*`、各 `rehype-*` / `remark-*` 等

## 3. 已经打包进产物（站点 / iOS 离线包）的第三方运行时

| 文件 | 名称 / 来源 | 许可 | 备注 |
| --- | --- | --- | --- |
| 构建注入 | [Pagefind](https://pagefind.app) 1.4（站内搜索） | MIT | WASM 由构建生成，产物内含其许可声明 |
| 构建注入 | [PhotoSwipe](https://photoswipe.com) 5.4（图片灯箱） | MIT | 替换掉原 Fancybox，见第 5 节 |
| `public/Firefly-live2d-main/load/cubism4.min.js` | pixi-live2d-display 的 cubism4 构建 | MIT | 加载器 |
| `public/Firefly-live2d-main/load/firefly-glue.js` 等 | 项目「Firefly-live2d-main」作者（流萤可爱捏） | MIT | 仓库内 `public/Firefly-live2d-main/LICENSE` |
| `public/Firefly-live2d-main/load/live2dcubismcore.min.js` | **Live2D Cubism Core**（Live2D Inc.） | **专有许可**（非 MIT、非开源） | 文件头保留 `(C) 2019 Live2D Inc.`；属协议中的 "Redistributable Code"，可随应用分发，不可单独再分发或改写许可声明。使用需遵守 [Live2D Proprietary Software License Agreement](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html) |
| `public/models-catalog.json` 中的模型条目 | Live2D 官方示例模型（外链 `firefly-live2d-safe`） | Live2D Free Material License | **外链引用，本站不托管文件**；每条已有 `lic` 字段标注 |
| `src/config/fontConfig.ts` 中的字体 | Google Fonts（Zen Maru Gothic / Inter）、MiSans（unpkg CDN） | OFL-1.1 / 小米 MiSans 字体许可 | 仅运行时按需从 CDN 加载，仓库内不含字体文件；`fontConfig.enable = false` 时完全不加载 |

## 4. 站点自有素材（图片 / 音频）——**不在开源范围内**

这些文件**不适用 MIT**，也不随代码一并授权；请勿转载、再分发或商用。
下表把「能确认的」和「需要你再确认的」分开列出，未确认项默认按**保留所有权利**处理。

| 路径 | 数量 / 体积 | 内容 | 状态 | 建议 |
| --- | --- | --- | --- | --- |
| `public/anime-wallpaper/**` | 89 个 / 3.8 MB | 22 张桌面 + 22 张手机壁纸（avif + 缩略图） | ⚠️ **来源未标注** | 若为 AI 生成/自制，请在 `NOTICE.md` 补一句声明；若取自网络，建议替换为可商用素材或删除 |
| `public/gallery/firefly-2026/**` | 9 个 / 1.2 MB | 相册图片（流萤主题） | ⚠️ **来源未标注** | 同上 |
| `public/splash/**` | 11 个 / 1.7 MB | iOS 启动图（由本站截图生成） | ✅ 视为本站自产 | 保留 |
| `public/assets/images/sakura.png` | 1 个 / 43 KB | 樱花瓣贴图 | ⚠️ 来源未标注 | 若来自素材站，请确认其许可并在本表登记 |
| `public/favicon/**`、`public/assets/images/avatar.avif` | 18 个 / 0.1 MB | 站点图标与头像 | ✅ 视为本站自产 | 保留 |
| `public/assets/music/使一颗心免于哀伤-哼唱.mp3` | 1 个 / 915 KB | 背景音乐（与《崩坏：星穹铁道》相关曲目同名） | ❌ **高风险**：若为官方录音/翻唱，其录音与词曲版权属原权利方，不能随仓库与 App 分发 | **建议删除**，或替换为明确允许再分发的音乐；同时在 `src/config/musicConfig.ts` 更新曲目信息 |
| `public/assets/music/cover/109951169585655912.webp` | 1 个 / 34 KB | 上面这首背景音乐的封面（网易云音乐专辑封面） | ❌ **高风险**：美术作品版权属原权利方 | **建议删除**，把 `musicConfig.ts` 里的 `cover` 改为自制图或留空 |
| `public/app/*.apk` | 4 个 / 80.3 MB | 旧版安卓安装包（整站离线 / 在线封装） | ❌ **高风险**：`AnimeHome-3.0.2-offline.apk` 内嵌了**已移除的 Fancybox 代码**和上面两首音乐素材（其余 3 个包已抽查，未发现 Fancybox 与音乐文件） | **删除或重新打包**：本项目不含 Android 工程，需在打包工程里替换 `www/` 后重新签名；完成后从 `scripts/check-legal.mjs` 的 `RISKY_ASSETS` 删掉对应条目 |
| `public/tts/**` | 105 个 / 4.6 MB | 13 套神经网络语音包（Xiaoxiao、Xiaoyi、Nanami、Mayu、Aoi、Hibiki、HsiaoChen… 等） | ⚠️ **高风险**：这些音色名对应 Microsoft Azure 神经网络语音，服务条款通常**不允许把合成音频作为文件再分发** | 建议改为运行时调用、或换成自录/已授权音源；至少不能用于商业用途 |
| `public/sounds/ui/**` | 9 个 / 0.4 MB | 界面音效（click / open / success…） | ⚠️ 来源未标注 | 若来自素材站，登记其许可（多数素材站要求署名或不许再分发） |
| `public/uploads/**` | 5 个 / 0.7 MB | 站点上传目录（评论/文章附件） | ⚠️ 逐个人工核对 | 建议在 `.gitignore` 中排除上传产物 |
| `public/acx/cursor-frame.html` | 1 个 / 15 KB | 自定义光标框页面 | ✅ 本站自写 | 保留 |

## 5. 已完成的许可整改记录

| 时间 | 问题 | 处理 |
| --- | --- | --- |
| 2026-11-18 | 原图片灯箱使用 `@fancyapps/ui`（Fancybox 5/6）。其[许可协议](https://fancyapps.com/license/)要求付费购买，并**明确禁止**「将软件用于开源项目」（"Use the Software in Open Source projects"），在 MIT 公开仓库中属许可违约 | 移除 `@fancyapps/ui` 依赖与相关组件，改用 **MIT** 许可的 `photoswipe`；新增 `src/components/features/LightboxManager.astro`，沿用原 `data-fancybox` / `data-src` 标记，页面 HTML 无需改动 |
| 2026-11-18 | 仓库只有一句 MIT，没有区分「代码 / 文章 / 素材」，也没有随分发保留第三方声明 | 补齐 `LICENSE`（分层适用范围 + 上游版权行）、`NOTICE.md`、`THIRD-PARTY-NOTICES.md`、`LICENSES/` 原文；新增 `scripts/sync-legal.mjs` 在构建时生成 `/licenses/` 页面与依赖清单，随站点和 iOS 离线包一起分发 |
| 2026-11-18 | 缺少持续检查手段，容易在升级依赖时无意引入 GPL / 商业包 | 新增 `scripts/check-legal.mjs`（`pnpm legal:check`），并接入 `pnpm build`、GitHub Actions 与 `pnpm ios:pack` 的严格模式 |

## 6. 自动合规检查（`pnpm legal:check`）

光靠文档容易忘，所以仓库带了一个零依赖的自检脚本 `scripts/check-legal.mjs`：

```bash
pnpm legal:check          # 普通模式：只提示，不阻断（pnpm build 会自动跑一次）
pnpm legal:check:strict   # 严格模式：出现 block 级素材即失败（pnpm ios:pack 会先跑这个）
```

它检查这些内容：

| 检查项 | 说明 | 触发结果 |
| --- | --- | --- |
| 被禁依赖 | `@fancyapps/ui`（Fancybox）不能出现在 `package.json` / `pnpm-lock.yaml` / `node_modules` | 错误 |
| copyleft 依赖 | 直接依赖的 `license` 出现 GPL / AGPL / LGPL / SSPL / BUSL / Commons-Clause / Elastic / PolyForm | 错误 |
| 声明文件 | `LICENSE`、`NOTICE.md`、`THIRD-PARTY-NOTICES.md`、`LICENSES/*.txt` 缺一不可 | 错误 |
| 许可页新鲜度 | `package.json` 比 `public/licenses/dependencies.json` 新，说明忘了跑 `pnpm legal` | 提示 |
| 高风险素材 | 下表 `public/` 下的素材 | block / review |

素材风险分两级：

- **block**：基本可以确定无权公开分发，例如与官方曲目同名的录音、网易云专辑封面。**严格模式下会阻断 iOS 打包。**
- **review**：来源或再分发条款不明确（TTS 语音包、壁纸、相册、界面音效等），默认按「保留所有权利」处理，需人工确认。

如果确实知情、愿意自行承担风险，可以显式跳过 block 级阻断：

```bash
$env:FIREFLY_ALLOW_BLOCKING_ASSETS=1   # PowerShell
pnpm ios:pack
```

> 建议：处理掉 block 项后，把 `scripts/check-legal.mjs` 的 `RISKY_ASSETS` 里对应条目删掉，
> 这样以后就不会再被提示。

## 7. 待办清单（按优先级）

1. **P0 · 音乐**：确认 `public/assets/music/使一颗心免于哀伤-哼唱.mp3` 的来源；无法证明授权则删除。
2. **P0 · 旧安装包**：`public/app/AnimeHome-3.0.2-offline.apk` 内嵌了旧版 Fancybox 与上述音乐素材，
   请重新打包或从 `public/app/` 删除（`/app/` 页面同步去掉离线版按钮）。
3. **P0 · 语音包**：确认 `public/tts/**` 的生成方式与服务条款；如为云端 TTS 合成，删除仓库内的音频文件。
4. **P1 · 壁纸/相册/音效**：为 `anime-wallpaper`、`gallery`、`sounds/ui`、`sakura.png` 补来源与许可说明；
   来源不可考的，替换为自制或 CC0 素材（如 [Pixabay](https://pixabay.com)、[Unsplash](https://unsplash.com) 需按其许可使用）。
5. **P1 · 角色 IP**：`NOTICE.md` 已有非官方、非商业的声明；若未来接入广告或收费，需要重新评估同人素材的使用边界。
6. **P2 · 依赖巡检**：每次升级依赖后跑一次 `pnpm legal`，检查是否引入 GPL/AGPL 或商业授权包
   （`grep -i "GPL" public/licenses/dependencies.json`）。
7. **P2 · 署名可见性**：`/licenses/` 页面已列出 Font Awesome 等需署名的资源；若改为纯静态部署且不生成该页，
   需在关于页保留等价署名。

## 8. 免责

以上信息基于仓库内文件与各依赖 `package.json` 的 `license` 字段整理，**不构成法律意见**。
涉及公开发布、商业化或 App 上架前，请就具体素材的授权向权利人确认。
