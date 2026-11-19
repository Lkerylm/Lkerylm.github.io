#!/usr/bin/env node
/**
 * 同步开源许可信息 —— 生成站点 /licenses/ 页面
 *
 * 为什么需要它：
 *  - MIT / Apache-2.0 / CC BY 4.0 等许可要求「分发时保留版权与许可声明」，
 *    本站会把站点静态文件打进 iOS 离线 App（ios/App/OfflineWeb），
 *    所以声明必须随产物一起分发，而不是只躺在仓库根目录。
 *
 * 生成内容（public/licenses/）：
 *  - index.html            许可总览页（含自动生成的依赖清单）
 *  - dependencies.json     机器可读的依赖 / 许可清单
 *  - LICENSE.txt, NOTICE.txt, THIRD-PARTY-NOTICES.txt
 *  - 各许可原文副本（来自仓库 LICENSES/）
 *
 * 用法：pnpm legal（已串进 pnpm build）
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "licenses");
const LICENSE_DIR = join(ROOT, "LICENSES");

/** 需要额外提示的高风险许可（出现时提醒人工确认） */
const REVIEW_PATTERN = /(^|[^A-Za-z])(A?GPL|LGPL|SSPL|BUSL|Commons-Clause)/i;

const TEXT_COPIES = [
	{ from: "LICENSE", to: "LICENSE.txt" },
	{ from: "NOTICE.md", to: "NOTICE.txt" },
	{ from: "THIRD-PARTY-NOTICES.md", to: "THIRD-PARTY-NOTICES.txt" },
];

function readJson(file) {
	return JSON.parse(readFileSync(file, "utf8"));
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** 读取 package.json 声明的许可（兼容 license / licenses 两种写法） */
function normalizeLicense(meta) {
	const raw = meta.license ?? meta.licenses;
	if (typeof raw === "string") return raw;
	if (Array.isArray(raw)) {
		return raw
			.map((item) => (typeof item === "string" ? item : item?.type))
			.filter(Boolean)
			.join(" OR ");
	}
	if (raw && typeof raw === "object" && typeof raw.type === "string") return raw.type;
	return "UNKNOWN";
}

/** 汇总直接依赖的版本与许可 */
function collectDependencies(pkg) {
	const declared = { ...pkg.dependencies, ...pkg.devDependencies };
	const list = [];

	for (const name of Object.keys(declared).sort()) {
		const metaFile = join(ROOT, "node_modules", name, "package.json");
		if (!existsSync(metaFile)) {
			list.push({ name, version: declared[name], license: "未安装（仅声明）", homepage: "" });
			continue;
		}
		const meta = readJson(metaFile);
		const repositoryUrl = typeof meta.repository === "string" ? meta.repository : meta.repository?.url;
		list.push({
			name,
			version: meta.version ?? declared[name],
			license: normalizeLicense(meta),
			homepage: meta.homepage ?? (repositoryUrl ? repositoryUrl.replace(/^git\+/, "").replace(/\.git$/, "") : ""),
		});
	}

	return list;
}

function groupByLicense(list) {
	const groups = new Map();
	for (const dep of list) {
		if (!groups.has(dep.license)) groups.set(dep.license, []);
		groups.get(dep.license).push(dep);
	}
	return [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

function renderDependencyRows(list) {
	return list
		.map((dep) => {
			const label = escapeHtml(dep.name);
			const name = dep.homepage
				? `<a href="${escapeHtml(dep.homepage)}" rel="noopener noreferrer" target="_blank">${label}</a>`
				: label;
			const flagged = REVIEW_PATTERN.test(dep.license) ? ' class="warn"' : "";
			return `<tr${flagged}><td>${name}</td><td>${escapeHtml(dep.version)}</td><td>${escapeHtml(dep.license)}</td></tr>`;
		})
		.join("\n");
}

function renderLicenseFiles() {
	if (!existsSync(LICENSE_DIR)) return "";
	return readdirSync(LICENSE_DIR)
		.filter((file) => file.toLowerCase().endsWith(".txt"))
		.sort()
		.map((file) => `<li><a href="./${encodeURIComponent(file)}">${escapeHtml(file)}</a></li>`)
		.join("\n");
}

const PAGE_STYLE = `
  :root { color-scheme: light dark; --fg:#1c1a22; --muted:#605b6e; --bg:#fbf9ff; --card:#ffffff; --line:#e7e1f2; --accent:#b45cff; }
  @media (prefers-color-scheme: dark) { :root { --fg:#ece9f5; --muted:#a8a2ba; --bg:#0f0d14; --card:#17141f; --line:#2b2637; --accent:#c98bff; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:2.5rem 1.25rem 4rem; background:var(--bg); color:var(--fg);
         font: 15px/1.75 system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
  main { max-width: 62rem; margin: 0 auto; }
  h1 { font-size: 1.75rem; margin: 0 0 .35rem; }
  h2 { font-size: 1.05rem; margin: 0 0 .75rem; }
  p.lead { color: var(--muted); margin: 0 0 1.5rem; }
  .card { background: var(--card); border:1px solid var(--line); border-radius: 14px; padding: 1.1rem 1.25rem; }
  .card + .card { margin-top: .9rem; }
  ul { margin:.4rem 0; padding-left: 1.35rem; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .9em; }
  .chips { display:flex; flex-wrap: wrap; gap: .45rem; margin:0 0 .9rem; }
  .chip { border:1px solid var(--line); border-radius: 999px; padding: .15rem .7rem; font-size: .82rem; color: var(--muted); }
  .chip b { color: var(--fg); }
  table { width: 100%; border-collapse: collapse; font-size: .88rem; }
  th, td { text-align: left; padding: .45rem .6rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; }
  tr.warn td { color: #d1554a; }
  .scroll { max-height: 32rem; overflow: auto; border:1px solid var(--line); border-radius: 12px; }
  .scroll table { margin: 0; }
  .scroll thead th { position: sticky; top: 0; background: var(--card); }
  .hint { margin:.9rem 0 0; color: var(--muted); font-size: .85rem; }
  footer { margin-top: 2.5rem; color: var(--muted); font-size: .85rem; }
`;

function renderIntro() {
	return `
  <div class="card">
    <h2>1. 代码：MIT</h2>
    <p>本站源码以 MIT 许可开放，可自由使用、修改与再分发，但须保留版权与许可声明。</p>
    <ul>
      <li>许可原文：<a href="./LICENSE.txt">LICENSE.txt</a></li>
      <li>版权行：saicaca (2024)、CuteLeaf (2025)、Lkerylm (2025-2026)</li>
      <li>基于开源项目 <a href="https://github.com/CuteLeaf/Firefly" rel="noopener noreferrer" target="_blank">Firefly</a> 二次开发</li>
    </ul>
  </div>

  <div class="card">
    <h2>2. 内容与素材：不在开源范围内</h2>
    <p>文章正文采用 <b>CC BY-NC-SA 4.0</b>；壁纸、相册、音频、Live2D 模型等素材的版权归各自权利人所有，
      未经许可请勿转载或再分发。</p>
    <ul>
      <li>授权分层与二创声明：<a href="./NOTICE.txt">NOTICE.txt</a></li>
      <li>第三方组件与素材逐项致谢：<a href="./THIRD-PARTY-NOTICES.txt">THIRD-PARTY-NOTICES.txt</a></li>
      <li>角色形象（流萤 /《崩坏：星穹铁道》）版权归 miHoYo / HoYoverse，本站为非官方、非商业的同人展示</li>
    </ul>
  </div>`;
}

function renderDepsSection({ total, groups, rows }) {
	const chips = groups
		.map(([license, deps]) => `<span class="chip">${escapeHtml(license)} <b>${deps.length}</b></span>`)
		.join(" ");

	return `
  <div class="card">
    <h2>3. 第三方组件（${total} 个直接依赖）</h2>
    <div class="chips">${chips}</div>
    <p>图标来自 <a href="https://fontawesome.com/license/free" rel="noopener noreferrer" target="_blank">Font Awesome Free</a>
      （Icons: CC BY 4.0，Fonts: SIL OFL 1.1，Code: MIT，© Fonticons, Inc.）；
      图片灯箱为 <a href="https://photoswipe.com" rel="noopener noreferrer" target="_blank">PhotoSwipe</a>（MIT）；
      站内搜索为 <a href="https://pagefind.app" rel="noopener noreferrer" target="_blank">Pagefind</a>（MIT）。</p>
    <div class="scroll">
      <table>
        <thead><tr><th>依赖</th><th>版本</th><th>许可</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
    <p class="hint">机器可读清单：<a href="./dependencies.json">dependencies.json</a>（含首页地址，便于核对许可原文）</p>
  </div>`;
}

function renderFilesSection() {
	return `
  <div class="card">
    <h2>4. 许可原文</h2>
    <ul>
${renderLicenseFiles()}
    </ul>
    <p class="hint">MIT / Apache-2.0 / OFL-1.1 / MPL-2.0 等完整文本随仓库 LICENSES/ 目录一并分发。</p>
  </div>`;
}

function renderFooter() {
	return `
  <footer>
    <p>发现侵权内容？请到
      <a href="https://github.com/Lkerylm/Lkerylm.github.io/issues" rel="noopener noreferrer" target="_blank">GitHub Issues</a>
      提交文件路径与权利说明，核实后会尽快删除或替换。</p>
    <p>本页由 <code>scripts/sync-legal.mjs</code> 生成，请勿直接编辑；
      修改 <code>NOTICE.md</code> 或 <code>THIRD-PARTY-NOTICES.md</code> 后重新构建即可。</p>
  </footer>`;
}

function renderIndexHtml({ pkg, list, groups }) {
	const rows = renderDependencyRows(list);
	const body = [
		renderIntro(),
		renderDepsSection({ total: list.length, groups, rows }),
		renderFilesSection(),
		renderFooter(),
	].join("\n");

	return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>许可与致谢 · ${escapeHtml(pkg.name)} ${escapeHtml(pkg.version)}</title>
<meta name="robots" content="index,follow" />
<style>${PAGE_STYLE}</style>
</head>
<body>
<main>
  <h1>许可与致谢</h1>
  <p class="lead">${escapeHtml(pkg.name)} ${escapeHtml(pkg.version)} · 本页随站点与 iOS 离线包一起分发。</p>
${body}
</main>
</body>
</html>
`;
}

function main() {
	const pkg = readJson(join(ROOT, "package.json"));
	const list = collectDependencies(pkg);
	const groups = groupByLicense(list);

	mkdirSync(OUT_DIR, { recursive: true });

	for (const { from, to } of TEXT_COPIES) {
		const src = join(ROOT, from);
		if (!existsSync(src)) {
			console.warn(`[legal] 缺少 ${from}，已跳过`);
			continue;
		}
		copyFileSync(src, join(OUT_DIR, to));
	}

	if (existsSync(LICENSE_DIR)) {
		for (const file of readdirSync(LICENSE_DIR)) {
			copyFileSync(join(LICENSE_DIR, file), join(OUT_DIR, file));
		}
	}

	writeFileSync(
		join(OUT_DIR, "dependencies.json"),
		`${JSON.stringify(
			{
				project: pkg.name,
				version: pkg.version,
				license: pkg.license ?? "MIT",
				generatedAt: new Date().toISOString(),
				count: list.length,
				dependencies: list,
			},
			null,
			2,
		)}\n`,
		"utf8",
	);

	writeFileSync(join(OUT_DIR, "index.html"), renderIndexHtml({ pkg, list, groups }), "utf8");

	console.log(`[legal] 已生成 public/licenses/（${list.length} 个直接依赖）`);
	for (const [license, deps] of groups) {
		const flag = REVIEW_PATTERN.test(license) ? "   <-- 需人工确认（copyleft / 商业许可）" : "";
		console.log(`        ${license}: ${deps.length}${flag}`);
	}
}

main();



