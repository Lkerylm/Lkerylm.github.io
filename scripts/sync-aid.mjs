/**
 * 公益寻亲数据同步脚本
 *
 * 作用：把「你有权转载的官方公益信息源」同步成站点使用的
 *      public/data/aid/missing-children.json，实现「实时更新」。
 *
 * 用法（本地）：
 *   $env:AID_FEED_URL="https://你的授权数据源/feed.json"; node scripts/sync-aid.mjs
 *   $env:AID_FEED_URL="..."; node scripts/sync-aid.mjs --dry-run   # 只打印，不写文件
 *
 * 数据源要求（很重要，关系到不侵权）：
 *   - 必须是你有权转载的官方 / 授权渠道（例如官方平台提供的公开 JSON、你自己维护的公益清单）；
 *   - 本脚本不会、也不应该去抓取带版权保护的照片 / 海报，只同步文字字段；
 *   - 没有官方来源链接（sourceUrl）的条目会被自动丢弃，避免传播无法核实的信息。
 *
 * feed.json 支持两种形态：
 *   1) [ {...}, {...} ]                       // 直接是条目数组
 *   2) { "updatedAt": "...", "entries": [ ... ] } // 带元信息
 *
 * 条目字段（全部为可选，name / sourceUrl 至少有一个）：
 *   name, gender, birthYear, missingDate, missingPlace, feature, source, sourceUrl
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_PATH = path.join(
	process.cwd(),
	"public",
	"data",
	"aid",
	"missing-children.json",
);
const dryRun = process.argv.slice(2).includes("--dry-run");
const feedUrl = (process.env.AID_FEED_URL || "").trim();

const DEFAULT_TIPS = [
	"带孩子出门前，先约定走散后的集合点，并让孩子记住你的手机号。",
	"发现走失儿童请立即拨打 110，不要自行带走孩子，也不要公开孩子的实时位置。",
	"寻亲信息一律以官方平台为准，任何索要转账、红包的「内部渠道」都是诈骗。",
];

function text(value, max = 400) {
	if (typeof value !== "string") return "";
	return value.trim().slice(0, max);
}

function normalize(raw) {
	if (!raw || typeof raw !== "object") return null;
	const sourceUrl = text(raw.sourceUrl || raw.url, 500);
	const name = text(raw.name, 40);
	if (!sourceUrl || !name) return null;

	const entry = {
		name,
		gender: text(raw.gender, 4),
		birthYear: Number(raw.birthYear) || 0,
		missingDate: text(raw.missingDate, 20),
		missingPlace: text(raw.missingPlace, 60),
		feature: text(raw.feature, 300),
		source: text(raw.source, 40) || "官方平台",
		sourceUrl,
	};
	return entry;
}

async function main() {
	const current = JSON.parse(await readFile(DATA_PATH, "utf8"));

	if (!feedUrl) {
		console.log("ℹ 未设置 AID_FEED_URL，保持现有数据不变。");
		console.log("  如需自动同步：$env:AID_FEED_URL=\"https://.../feed.json\"; node scripts/sync-aid.mjs");
		return;
	}

	console.log("→ 拉取：", feedUrl);
	const res = await fetch(feedUrl, {
		headers: { Accept: "application/json" },
	});
	if (!res.ok) throw new Error(`拉取失败：HTTP ${res.status}`);

	const payload = await res.json();
	const list = Array.isArray(payload) ? payload : payload?.entries;
	if (!Array.isArray(list)) throw new Error("数据源格式不正确：需要数组或 { entries: [] }");

	const seen = new Set();
	const entries = [];
	for (const item of list) {
		const entry = normalize(item);
		if (!entry) continue;
		const key = `${entry.name}|${entry.sourceUrl}`;
		if (seen.has(key)) continue;
		seen.add(key);
		entries.push(entry);
	}

	const next = {
		version: 1,
		updatedAt: new Date().toISOString(),
		notice:
			text(current.notice, 300) ||
			"本页仅转载官方已公开的寻亲文字要点，不转载任何照片；如信息已更新或孩子已回家，请以官方发布为准。",
		tips: Array.isArray(current.tips) && current.tips.length ? current.tips : DEFAULT_TIPS,
		entries,
	};

	console.log(`→ 有效条目：${entries.length} / ${list.length}（无官方来源的已丢弃）`);
	if (dryRun) {
		console.log(JSON.stringify(next, null, 2).slice(0, 4000));
		console.log("（--dry-run 模式，未写入文件）");
		return;
	}

	await writeFile(DATA_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
	console.log("✔ 已写入", path.relative(process.cwd(), DATA_PATH));
}

main().catch((error) => {
	console.error("✗ 同步失败：", error.message);
	process.exitCode = 1;
});
