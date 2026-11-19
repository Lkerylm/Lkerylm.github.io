# 版权 · 授权 · 二创声明

> 本文件说明「哪些内容可以自由使用、哪些不可以」，请先读完再复用本站的任何东西。
> 构建时本文件会被同步到站点 `/licenses/`（iOS 离线 App 内同样可访问）。

## 一、这个小站是什么

- 站点地址：<https://lkerylm.github.io>
- 仓库地址：<https://github.com/Lkerylm/Lkerylm.github.io>
- 性质：**非官方、非商业的个人二次元小站**，用来记录追番笔记、动画杂谈与日常碎片。
- 技术底座：基于开源项目 **Firefly（作者 CuteLeaf）** 二次开发。Firefly 的 `LICENSE`
  文件同时保留了上游作者 **saicaca** 的 MIT 声明，因此本站也一并保留这两条版权行。

## 二、分层授权（重要）

本站不同部分适用**不同**的授权，不能一概而论：

| 内容 | 授权 | 能否直接复用 |
| --- | --- | --- |
| 源代码（Astro 组件/页面/样式/脚本、`ios/` 下 Swift 源码、CI 工作流） | **MIT**，见 [`LICENSE`](LICENSE) | ✅ 可以，需保留版权与许可声明 |
| 博客文章正文（`src/content/posts/**`、`src/content/spec/**`） | **CC BY-NC-SA 4.0**（署名—非商业性使用—相同方式共享），见 `src/config/licenseConfig.ts` | ⚠️ 仅限非商业，须署名 + 相同协议 |
| 壁纸 / 相册 / 插画（`public/anime-wallpaper/**`、`public/gallery/**`、`public/splash/**`、`public/assets/images/**`） | **保留所有权利**，来源与状态见 `THIRD-PARTY-NOTICES.md` | ❌ 未获授权请勿转载或再分发 |
| 背景音乐与播放器封面（`public/assets/music/**`） | **CC0 1.0**（本站自制：由 `scripts/generate-cute-music.mjs` 现场合成波形与 SVG） | ✅ 随便用，不必署名 |
| 音频（`public/tts/**`、`public/sounds/**`） | **保留所有权利**，逐项状态见 `THIRD-PARTY-NOTICES.md` | ❌ 未获授权请勿转载或再分发 |
| Live2D 模型（`public/Firefly-live2d-main/**`） | 胶水代码与模型文件为 **MIT**（作者「流萤可爱捏」，已保留其 `LICENSE`）；**Cubism Core 运行时除外**（Live2D 专有许可） | ⚠️ 见下文第四节 |
| 第三方组件（npm 依赖、图标集、字体） | 各自许可（MIT / Apache-2.0 / OFL-1.1 / CC BY 4.0 / CC0 / MPL-2.0 等） | ✅ 按其许可使用，见 `THIRD-PARTY-NOTICES.md` |

一句话总结：**代码是开源的，文章是「非商业 + 相同方式共享」的，图片和大部分音频不是开源的（背景音乐例外，见上表）。**

## 三、二创与角色 IP 声明

- 站内出现的「流萤」等角色形象，其著作权属于 **miHoYo / HoYoverse（米哈游）** 及相关权利方；
  《崩坏：星穹铁道》的名称、角色与美术资源均为原厂所有。
- 本站在**非商业**前提下进行同人性质的展示与交流，**不代表**官方立场，也无任何官方授权关系；
  若官方后续发布同人创作指引，以官方指引为准。
- 本站不对上述角色形象主张任何权利，也不会用它们进行售卖、众筹或其他营利活动。
- 若权利方认为某处展示不当，请通过下方方式联系，我们会在确认后立即删除相关内容。

## 四、Live2D 部分特别说明

`public/Firefly-live2d-main/` 内混有两类文件，**授权完全不同**：

1. `LICENSE` 中声明的 **MIT** 只覆盖该项目作者自己编写的加载器 / 配置 / 模型文件；
2. `load/live2dcubismcore.min.js` 是 **Live2D Cubism Core**，属于 Live2D 公司的专有软件，
   文件头保留着 `(C) 2019 Live2D Inc. All rights reserved.` 与
   [Live2D Proprietary Software License Agreement](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html) 链接。
   它属于该协议中的 "Redistributable Code"，可随应用一起分发，但**不能**被重新声明为 MIT、
   也不能单独抽取再分发。使用方（尤其商业化时）需自行遵守 Live2D 的营收门槛与署名要求。

其余 Live2D 官方示例模型通过 `public/models-catalog.json` 以**外链**方式引用
（来源仓库 `firefly-live2d-safe`），每个条目的 `lic` 字段已标注
「Live2D Inc. - Live2D Free Material License」，本站不再二次分发其文件。

## 五、你可以怎么复用

- ✅ **想要这套代码**：直接 fork，保留 `LICENSE`、`NOTICE.md`、`THIRD-PARTY-NOTICES.md` 即可（MIT）。
- ✅ **想引用我的文章**：注明作者与原文链接，非商业用途，转载后同样以 CC BY-NC-SA 4.0 发布。
- ✅ **想确认自己没混入 GPL / 商业组件**：跑 `pnpm legal:check`（严格模式 `pnpm legal:check:strict`），
  它会检查被禁依赖、copyleft 许可、声明文件与高风险素材，规则见 `THIRD-PARTY-NOTICES.md` 第 6 节。
- ❌ **不要**把壁纸、相册、音频、TTS 语音包直接搬走或用于你自己的站点/视频/App。
- ❌ **不要**把本站打包成收费产品或上架应用商店。

## 六、发现侵权 / 需要下架

如果你是本仓库中某项素材的权利人，且认为使用不当，请到
<https://github.com/Lkerylm/Lkerylm.github.io/issues> 提交 issue（注明文件路径与权利说明），
我们会在核实后 72 小时内删除或替换相关文件。

## 七、免责声明

本站内容仅供学习与交流，不保证准确性、完整性或可用性；因使用本站内容产生的任何后果由使用者自行承担。
站内指向的第三方链接与资源，其内容与授权由对应站点负责。

---

*最后更新：2026-11-18*
