# iOS 原生 App（在线版 / 离线版）

`ios/` 是一个 **WKWebView 壳工程**：一份 Swift 代码，编出两个 App。

| Target | Bundle ID | 打开时做什么 | 体积 | 联网 |
| --- | --- | --- | --- | --- |
| `FireflyOnline` | `com.lkerylm.firefly.online` | 加载 `https://lkerylm.github.io/` | ~2 MB | 需要 |
| `FireflyOffline` | `com.lkerylm.firefly` | 读 App 里打包好的整站（`app://localhost/`） | ~60 MB | 不需要 |

两者的差别只有 `Info.plist` 里的 `FireflyWebMode`（`online` / `offline`）和是否带 `OfflineWeb/` 资源，
Swift 代码（`ios/App/Shared/`）完全共用。

> 没上 App Store，也不需要上 —— 这类"网页壳"应用审核时容易被 4.2 最低功能条款卡住。
> 走 Ad Hoc / TestFlight / 自签安装就够用了。

## 目录结构

```
ios/
├── project.yml                 # XcodeGen 工程描述（唯一真源，.xcodeproj 不入库）
├── README.md                   # 就是本文件
└── App/
    ├── Shared/                 # 两个 target 共用
    │   ├── AppDelegate.swift
    │   ├── SceneDelegate.swift
    │   ├── AppEnvironment.swift      # 读 Info.plist：模式 / 站点地址 / UA 后缀
    │   ├── WebViewController.swift   # 全屏 WKWebView + 进度条 + 断网重试
    │   └── LocalSchemeHandler.swift  # app://localhost/ → OfflineWeb/
    ├── Online/Info.plist       # 在线版配置
    ├── Offline/Info.plist      # 离线版配置
    ├── Assets.xcassets/        # 图标 / 启动图（pnpm ios:assets 生成，已提交）
    └── OfflineWeb/             # 离线版整站（脚本生成，不入库）
```

## 本地打包（需要一台 Mac + Xcode）

```bash
brew install xcodegen            # 只装一次
pnpm install
pnpm ios:pack                    # = pnpm build + 生成图标 + dist 复制进 OfflineWeb
cd ios
xcodegen generate                # 生成 Firefly.xcodeproj
open Firefly.xcodeproj
```

在 Xcode 里：

1. 选中 `FireflyOnline` 或 `FireflyOffline` scheme
2. `Signing & Capabilities` → Team 选择你的 Apple ID（免费账号会提示 "Personal Team"）
3. 插上 iPhone（需在手机上点「信任此电脑」），Run
4. 要出 ipa：`Product → Archive` → `Distribute App` → `Development` / `Ad Hoc` → `Export`

不想开 Xcode GUI 也可以纯命令行：

```bash
cd ios
xcodebuild -project Firefly.xcodeproj -scheme FireflyOffline \
  -configuration Release -sdk iphoneos \
  -archivePath build/FireflyOffline.xcarchive archive
```

## 用 GitHub Actions 打包（Windows 也能出 ipa）

仓库里已经有 `.github/workflows/ios.yml`：

- 手动触发：`Actions` → `Build iOS IPA` → `Run workflow`
- 自动触发：推送到 `main` 且改动了 `ios/**` 或两个打包脚本

跑完在 Artifacts 里下载 `Firefly-iOS-<版本号>`，里面有：

```
FireflyOnline-6.8.4-unsigned.ipa     ← 未签名，自签安装
FireflyOffline-6.8.4-unsigned.ipa
FireflyOnline-6.8.4-signed.ipa       ← 配了 secrets 才有
```

打了 `ios-v6.8.4` 这类标签的话，同一个流水线还会把 ipa 作为 **Release 附件**发出去，
这样别人不用登录 GitHub 也能直接下载：

```bash
git tag ios-v6.8.4 && git push origin ios-v6.8.4
```

## 已经打好的包

不想本地折腾就直接下现成的（每打一个 `ios-v*` 标签就会发一版）：

- https://github.com/Lkerylm/Lkerylm.github.io/releases

```
FireflyOnline-6.8.4-unsigned.ipa     0.45 MB
FireflyOffline-6.8.4-unsigned.ipa   44.05 MB
```

`unsigned.ipa` 是「`.app` 塞进 `Payload/` 再 zip」的标准 ipa 结构，
Windows 上用 [Sideloadly](https://sideloadly.io/) / [AltStore](https://altstore.io/) 用自己的 Apple ID 签一次就能装。

## 三条签名路线，选一个

### ① 免费 Apple ID 自签（0 元，推荐先这么玩）

| 限制 | 数值 |
| --- | --- |
| 有效期 | **7 天**（到期要重新签） |
| 同时装的自签 App | 3 个 |
| 每 7 天能注册的 App ID | 10 个 |
| 需要 | 一个 Apple ID + Windows 电脑即可（不用 Mac） |

做法：Windows 装 [Sideloadly](https://sideloadly.io/) → 拖入 `unsigned.ipa` → 填 Apple ID → Start。
怕 7 天到期麻烦，就装 [AltStore](https://altstore.io/)，它会挂在后台自动重签（需要电脑常开 AltServer）。

> 两个 App 一起装的话，注意**一共只能装 3 个**自签 App（含 AltStore 自己）。

### ② 付费账号 + Ad Hoc（$99/年，适合长期自己用）

- 有效期 **1 年**，共 100 台设备（按 UDID 登记，每年可重置）
- CI 全自动出「免签直装」的 ipa，装完不用 7 天补签

在仓库 `Settings → Secrets and variables → Actions` 里加 4 个 secret：

| Secret | 内容 | 怎么拿 |
| --- | --- | --- |
| `IOS_CERT_P12_BASE64` | `.p12` 证书的 base64 | Apple Developer → Certificates 新建 Apple Distribution → 下载 `.cer` → 导入「钥匙串」→ 连同私钥导出 `.p12` |
| `IOS_CERT_PASSWORD` | 导出 `.p12` 时设的密码 | — |
| `IOS_PROVISION_BASE64` | `.mobileprovision` 的 base64 | Developer → Profiles 新建 Ad Hoc（勾选设备）→ 下载 |
| `IOS_TEAM_ID` | 10 位 Team ID | Developer 后台右上角，或 `Membership` 页 |

可选 Variable：`IOS_EXPORT_METHOD` = `ad-hoc`（默认 `development`，也就是只装到 Xcode 里登记过的设备）。

Windows 上转 base64：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("Cert.p12")) | Set-Clipboard
[Convert]::ToBase64String([IO.File]::ReadAllBytes("Firefly_AdHoc.mobileprovision")) | Set-Clipboard
```

macOS/Linux：`base64 -i Cert.p12 | pbcopy`。

### ③ 付费账号 + TestFlight（无需 UDID，但要过一轮审核）

- 有效期 90 天一轮，内部测试员 100 人（不需要审核），外部测试员 1 万人（需审核）
- 需要在 CI 里配置 App Store Connect API Key（`xcodebuild -exportArchive` 用 `app-store-connect` 方式 + 上传）
- 壳应用有被 4.2 拒审的风险，走内部测试员最稳

## 两个 App 怎么选

| | 在线版 | 离线版 |
| --- | --- | --- |
| 内容新鲜度 | 实时，和网站同步 | 打包那一刻的内容 |
| 断网 | 白屏 + 重试按钮 | 正常看（搜索、文章、图都在包里） |
| 体积 | ~2 MB | ~60 MB |
| 升级 | 网站更新即生效 | 需要重新打包安装 |
| 适合 | 日常主力 | 地铁/飞机上、网络差的场景 |

想两个都要？装在线版日常用，离线版当「备份书」。注意免费 Apple ID 只能同时装 3 个。

## 打包脚本

| 命令 | 作用 |
| --- | --- |
| `pnpm ios:assets` | 用 `public/favicon/anime.svg` 生成 `Assets.xcassets` 图标 / 启动图（1024 无 alpha + 1x/2x/3x 启动图） |
| `pnpm ios:web` | 把 `dist/` 复制到 `ios/App/OfflineWeb/`，跳过 `*.apk`（安卓包）和 `*.map`；顺手校验 `login/`、`register/` 是不是最新的邮箱验证码页（还是旧版「点 ⚙ 填服务器地址」就报错，提醒你先 `pnpm build`） |
| `pnpm ios:pack` | 上面两步 + `pnpm build` |

两个脚本都是纯 Node，Windows 上也能跑，只有 `xcodegen` / `xcodebuild` 需要 macOS。

> 图标和启动图（共约 220 KB）已经提交进仓库，所以**克隆下来就能直接 `xcodegen generate` + 编译**；
> 只有改了配色或换图标时才需要重新跑 `pnpm ios:assets`。
> 离线站点（60 MB）不进仓库，编译 `FireflyOffline` 前必须先跑 `pnpm ios:web`。

## 和 PWA 的关系

- 壳会给 WKWebView 的 UA 追加 `FireflyApp/<版本>`（`WKWebViewConfiguration.applicationNameForUserAgent`），
  前端 `PwaManager.astro` 里的 `isFireflyShell()` 检测到它就不再弹「添加到主屏幕」提示。
- 离线版用的是自定义协议 `app://`，`navigator.serviceWorker` 不存在，Service Worker 注册会自动跳过
  （`PwaManager.astro` 里本来就有 `"serviceWorker" in navigator` 的判断）。
- 网页、PWA、APK、IPA 四者共用同一份内容，改站点不用改壳（离线版除外，它得重新打包）。

## 踩坑记录

- **未签名 ipa 装不上**：iOS 强制要求有效签名，`unsigned.ipa` 必须先用 Sideloadly/AltStore 签一次。
- **免费账号 7 天后闪退/打不开**：正常，重新签一次，或者上 AltStore 自动续签。
- **离线版点安卓下载按钮没反应**：`OfflineWeb/` 里没有 `*.apk`（被脚本跳过了），iOS 上本来也用不上。
- **离线版内容不更新**：重新跑 `pnpm ios:pack` 再打包安装；日常用建议装在线版。
- **离线版里还是旧登录页 / 点了没用**：离线站是打包那一刻的快照，`pnpm ios:web` 会检查 `login/`、`register/` 里有没有 `authEmail` 表单，有旧文案就直接报错；同理 `public/app/*.apk` 里的网页也是打包时的快照，要更新得重新出 APK。
- **`xcodegen generate` 报找不到 `App/OfflineWeb`**：先跑 `pnpm build && pnpm ios:web`。
- **想改站点地址**：改 `ios/App/Online/Info.plist` 和 `Offline/Info.plist` 里的 `FireflyOnlineURL`。

## 许可与合规

打出来的 ipa 会**把整个站点打包进去**（离线版是完整站点，在线版也仅是一个壳），因此分发 App 就等于分发站内内容，
以下几点必须在公开发布前确认：

1. **声明随包分发**：`pnpm build` 会先跑 `pnpm legal`，把 `LICENSE` / `NOTICE.md` / `THIRD-PARTY-NOTICES.md`
   和 `LICENSES/` 里的许可原文复制到站点 `public/licenses/`，所以 App 内访问 `app://localhost/licenses/`
   就能看到全部声明 —— 满足 MIT / Apache-2.0 / CC BY 4.0 的「随分发保留声明」要求。
2. **壳代码**：`ios/` 下的 Swift 源码与 XcodeGen 配置同样以 MIT 发布，可自由复用（保留版权行）。
3. **素材不随代码授权**：壁纸、相册、背景音乐、TTS 语音包、Live2D 模型版权归各自权利人，
   **不要把 ipa 解包后的素材再分发**，也不要上架收费（见仓库 `NOTICE.md`）。
4. **Live2D Cubism Core**：`Firefly-live2d-main/load/live2dcubismcore.min.js` 是 Live2D 公司的专有运行时
   （协议中的 "Redistributable Code"），可以随 App 一起分发，但不能改写成 MIT，也不能单独抽取分发；
   商业化前请核对 Live2D 的营收门槛条款。
5. **上架 App Store 前**：先按 `THIRD-PARTY-NOTICES.md` 第 6 节的 **P0** 清单处理
   （背景音乐来源、TTS 语音包来源），否则审核或后续维权都可能出问题。
6. **灯箱组件**：原先用的 Fancybox 是商业授权且**禁止用于开源项目**，已换成 MIT 许可的 PhotoSwipe
   （`src/components/features/LightboxManager.astro`）。若日后要换回 Fancybox，需先购买授权。
7. **打包前自检**：`pnpm ios:pack` 会先跑 `pnpm legal:check:strict`，一旦发现 block 级素材
   （例如与官方曲目同名的背景音乐）就会中止打包；确已知情可用 `FIREFLY_ALLOW_BLOCKING_ASSETS=1` 跳过。
   当前仓库还有 3 个 block 项未处理（背景音乐、其网易云封面、内嵌旧版 Fancybox 的
   `public/app/AnimeHome-3.0.2-offline.apk`），所以 **GitHub Actions 的 iOS 工作流会一直红**，
   按 `THIRD-PARTY-NOTICES.md` 第 7 节 P0 清单清理后即恢复。

