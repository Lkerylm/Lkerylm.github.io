#!/usr/bin/env node
/**
 * 开源合规自检 —— 防止「误用非开源组件」和「把无权分发的素材打进产物」
 *
 * 检查内容：
 *  1. 硬禁用依赖：明确禁止开源项目使用的商业包（如 Fancybox / @fancyapps/ui）
 *  2. 直接依赖许可：出现 GPL / AGPL / LGPL / SSPL / BUSL 等 copyleft 或商业关键字时报警
 *  3. 声明文件：LICENSE / NOTICE.md / THIRD-PARTY-NOTICES.md / LICENSES/*.txt 是否齐全
 *  4. 许可页是否过期：public/licenses/ 是否比 package.json 旧（忘了跑 pnpm legal）
 *  5. 高风险素材：清单见 THIRD-PARTY-NOTICES.md 第 4 节
 *
 * 用法：
 *   pnpm legal:check          # 只提示，不阻断（普通构建用这个）
 *   pnpm legal:check:strict   # 出现 block 级素材即失败（iOS 打包前用这个）
 *
 * 确实知情并愿意自行承担风险时，可用 FIREFLY_ALLOW_BLOCKING_ASSETS=1 跳过 block 级阻断。
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");
const ALLOW_BLOCKING = process.env.FIREFLY_ALLOW_BLOCKING_ASSETS === "1";

/** 明确不能出现在本仓库的依赖（许可禁止开源项目使用，或已购买授权但未登记） */
const FORBIDDEN_DEPENDENCIES = [
	{
		name: "@fancyapps/ui",
		reason:
			"Fancybox 采用商业授权，协议明确禁止用于开源项目；2026-11 已替换为 MIT 的 PhotoSwipe，请勿加回",
	},
];

/** 需要人工确认的 copyleft / 商业许可关键字 */
const COPYLEFT_PATTERN =
	/(^|[\s(])(A?GPL|LGPL|SSPL|BUSL|Commons-Clause|Elastic|PolyForm)/i;

/** 声明文件与许可原文，缺一不可 */
const REQUIRED_FILES = [
	"LICENSE",
	"NOTICE.md",
	"THIRD-PARTY-NOTICES.md",
	"LICENSES/Apache-2.0.txt",
	"LICENSES/MPL-2.0.txt",
	"LICENSES/OFL-1.1.txt",
	"LICENSES/OFL-1.1-JetBrainsMono.txt",
];

/**
 * 高风险素材：
 *  - block  : 基本可以确定无权随站点 / App 公开分发，应删除或替换
 *  - review : 来源或再分发条款不明确，需权利人确认（默认按「保留所有权利」处理）
 *
 * 说明：block 级的三项（星穹铁道同名单曲、网易云专辑封面、内嵌 Fancybox 的旧离线包）
 * 已在 2026-11-19 删除，背景音乐换成 scripts/generate-cute-music.mjs 现场合成的 CC0 曲目。
 * 这里保留条目当"回归守卫"：万一哪天又把这些文件放回来，strict 模式会立刻拦下。
 * 文件不存在时不会报警（见下面 existsSync 判断）。
 */
const RISKY_ASSETS = [
	{
		path: "public/assets/music/使一颗心免于哀伤-哼唱.mp3",
		level: "block",
		reason:
			"与《崩坏：星穹铁道》官方曲目同名，录音与词曲版权属原权利方；已于 2026-11-19 删除，请勿加回（改用 pnpm music:generate 生成的自制曲目）",
	},
	{
		path: "public/assets/music/cover/109951169585655912.webp",
		level: "block",
		reason:
			"网易云音乐专辑封面，美术作品版权属原权利方；已于 2026-11-19 删除，请勿加回（封面改用自制 SVG）",
	},
	{
		path: "public/app/AnimeHome-3.0.2-offline.apk",
		level: "block",
		reason:
			"旧版离线安装包：内嵌了已移除的 Fancybox 代码与上面两首音乐素材；已于 2026-11-19 删除，请用当前代码重新打包后再提供",
	},
	{
		path: "public/tts",
		level: "review",
		reason:
			"神经网络语音包（音色名对应 Azure TTS），服务条款通常不允许把合成音频作为文件再分发",
	},
	{
		path: "public/anime-wallpaper",
		level: "review",
		reason: "壁纸来源未登记，若取自网络需权利人许可；建议替换为自制或 CC0 素材",
	},
	{
		path: "public/gallery",
		level: "review",
		reason: "相册图片（角色同人图）来源未登记",
	},
	{
		path: "public/sounds/ui",
		level: "review",
		reason: "界面音效来源未登记，多数素材站要求署名或禁止再分发",
	},
	{
		path: "public/assets/images/sakura.png",
		level: "review",
		reason: "樱花贴图来源未登记",
	},
	{
		path: "public/uploads",
		level: "review",
		reason: "上传目录，内容需逐个人工核对",
	},
];

const errors = [];
const warnings = [];
const notes = [];

function readJson(file) {
	return JSON.parse(readFileSync(file, "utf8"));
}

function normalizeLicense(meta) {
	const raw = meta.license ?? meta.licenses;
	if (typeof raw === "string") return raw;
	if (Array.isArray(raw)) {
		return raw
			.map((item) => (typeof item === "string" ? item : item?.type))
			.filter(Boolean)
			.join(" OR ");
	}
	if (raw && typeof raw === "object" && typeof raw.type === "string")
		return raw.type;
	return "UNKNOWN";
}

/** 返回「文件大小」或「目录里文件数 + 总体积」，不存在则返回 null */
function describePath(target) {
	const full = join(ROOT, target);
	if (!existsSync(full)) return null;
	const stat = statSync(full);
	if (stat.isDirectory()) {
		let count = 0;
		let bytes = 0;
		const walk = (dir) => {
			for (const item of readdirSync(dir, { withFileTypes: true })) {
				const child = join(dir, item.name);
				if (item.isDirectory()) walk(child);
				else {
					count += 1;
					bytes += statSync(child).size;
				}
			}
		};
		walk(full);
		return `${count} 个文件 / ${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}
	return `${(stat.size / 1024).toFixed(0)} KB`;
}

function checkForbiddenDependencies(pkg) {
	const declared = { ...pkg.dependencies, ...pkg.devDependencies };
	for (const banned of FORBIDDEN_DEPENDENCIES) {
		if (declared[banned.name]) {
			errors.push(
				`package.json 仍声明了被禁依赖 ${banned.name}：${banned.reason}`,
			);
		}
		if (existsSync(join(ROOT, "node_modules", banned.name))) {
			errors.push(
				`node_modules 里仍存在 ${banned.name}，请执行 pnpm install 清理`,
			);
		}
		const lock = join(ROOT, "pnpm-lock.yaml");
		if (existsSync(lock) && readFileSync(lock, "utf8").includes(banned.name)) {
			errors.push(
				`pnpm-lock.yaml 里仍有 ${banned.name}，请重新安装依赖以更新锁文件`,
			);
		}
	}
}

function checkDependencyLicenses(pkg) {
	const list = { ...pkg.dependencies, ...pkg.devDependencies };
	let unknown = 0;
	for (const name of Object.keys(list).sort()) {
		const metaFile = join(ROOT, "node_modules", name, "package.json");
		if (!existsSync(metaFile)) {
			warnings.push(`依赖 ${name} 未安装，无法核对其许可（先跑 pnpm install）`);
			continue;
		}
		const license = normalizeLicense(readJson(metaFile));
		if (license === "UNKNOWN") {
			unknown += 1;
			warnings.push(`依赖 ${name} 未声明 license 字段，需人工确认`);
			continue;
		}
		if (COPYLEFT_PATTERN.test(license)) {
			errors.push(
				`依赖 ${name} 使用 copyleft / 商业许可（${license}），静态站点分发前需评估`,
			);
		}
	}
	if (unknown === 0) notes.push("直接依赖的 license 字段全部可识别");
}

function checkRequiredFiles() {
	for (const file of REQUIRED_FILES) {
		if (!existsSync(join(ROOT, file))) errors.push(`缺少许可声明文件：${file}`);
	}
}

function checkGeneratedLicenses() {
	const generated = join(ROOT, "public", "licenses", "dependencies.json");
	if (!existsSync(generated)) {
		warnings.push(
			"public/licenses/ 尚未生成，部署前请运行 pnpm legal（pnpm build 会自动执行）",
		);
		return;
	}
	const pkgTime = statSync(join(ROOT, "package.json")).mtimeMs;
	const legalTime = statSync(generated).mtimeMs;
	if (pkgTime > legalTime) {
		warnings.push(
			"package.json 比 public/licenses/ 新，依赖清单可能过期，请重新运行 pnpm legal",
		);
	}
	const data = readJson(generated);
	const banned = new Set(FORBIDDEN_DEPENDENCIES.map((item) => item.name));
	for (const dep of data.dependencies ?? []) {
		if (banned.has(dep.name))
			errors.push(
				`public/licenses/dependencies.json 仍包含被禁依赖 ${dep.name}`,
			);
	}
	notes.push(
		`public/licenses/dependencies.json 记录了 ${data.count ?? 0} 个直接依赖`,
	);
}

function checkRiskyAssets() {
	const blocking = [];
	for (const asset of RISKY_ASSETS) {
		const size = describePath(asset.path);
		if (!size) continue;
		const line = `${asset.path}（${size}）：${asset.reason}`;
		if (asset.level === "block") blocking.push(line);
		else warnings.push(`需确认来源 ${line}`);
	}

	if (blocking.length === 0) {
		notes.push("未发现 block 级高风险素材");
		return;
	}

	for (const line of blocking) {
		const text = `block 级高风险素材 ${line}`;
		if (STRICT && !ALLOW_BLOCKING) errors.push(text);
		else warnings.push(text);
	}
	if (STRICT && !ALLOW_BLOCKING) {
		errors.push(
			"处理完上述素材后再打包 iOS；确已知情可用 FIREFLY_ALLOW_BLOCKING_ASSETS=1 跳过",
		);
	} else {
		warnings.push(
			"打包 iOS / 上架应用商店前，请先处理 block 级素材（pnpm legal:check:strict）",
		);
	}
}

function report() {
	const lines = ["", "===== 开源合规自检 =====", ""];
	for (const note of notes) lines.push(`  [OK]   ${note}`);
	for (const warning of warnings) lines.push(`  [WARN] ${warning}`);
	for (const error of errors) lines.push(`  [FAIL] ${error}`);
	lines.push("");
	lines.push(
		`结论：${errors.length} 个错误，${warnings.length} 个待确认（模式：${STRICT ? "strict" : "普通"}）`,
	);
	lines.push("完整说明见 NOTICE.md 与 THIRD-PARTY-NOTICES.md 第 4 / 6 节。");
	lines.push("");
	console.log(lines.join("\n"));
}

function main() {
	const pkg = readJson(join(ROOT, "package.json"));

	checkForbiddenDependencies(pkg);
	checkDependencyLicenses(pkg);
	checkRequiredFiles();
	checkGeneratedLicenses();
	checkRiskyAssets();
	report();

	if (errors.length > 0) process.exitCode = 1;
}

main();
