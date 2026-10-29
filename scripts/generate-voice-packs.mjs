/**
 * 生成看板娘语音包清单
 *
 * 扫描 public/tts/<语音包>/ 下的所有 mp3，按语音包分组写入 public/voice-packs.json，
 * 供「看板娘声音」面板（AnimeVoice.astro）与 Live2D 播放逻辑使用。
 *
 * 用法：pnpm voice-packs（或 node scripts/generate-voice-packs.mjs）
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const TTS_DIR = path.join(PUBLIC, "tts");
const OUT_FILE = path.join(PUBLIC, "voice-packs.json");

/** 语音包展示信息（新增语音包时在这里补一行即可） */
const VOICE_META = {
	Xiaoxiao: { name: "晓晓", desc: "甜到冒泡的软妹音", emoji: "🌸" },
	Xiaoni: { name: "晓妮", desc: "元气满格的少女音", emoji: "🍭" },
	Xiaoyi: { name: "晓伊", desc: "轻声细语的温柔音", emoji: "🎐" },
	Xiaobei: { name: "晓北", desc: "活泼跳脱的邻家音", emoji: "⭐" },
	HsiaoChen: { name: "晓臻", desc: "台湾腔软萌", emoji: "🍰" },
	HsiaoYu: { name: "晓雨", desc: "台妹甜音", emoji: "💗" },
	Nanami: { name: "七海", desc: "日系轻甜", emoji: "🐚" },
	hibiki: { name: "响", desc: "清亮元气", emoji: "🎀" },
	shizuku: { name: "希儿", desc: "游戏互动全语音", emoji: "✨" },
};

function walk(dir) {
	const result = [];
	if (!fs.existsSync(dir)) return result;
	for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, item.name);
		if (item.isDirectory()) {
			result.push(...walk(full));
		} else if (item.name.toLowerCase().endsWith(".mp3")) {
			result.push(full);
		}
	}
	return result;
}

const packs = new Map();
for (const file of walk(TTS_DIR)) {
	const url = `/${path.relative(PUBLIC, file).split(path.sep).join("/")}`;
	const id = url.split("/")[2];
	if (!id) continue;
	if (!packs.has(id)) packs.set(id, []);
	packs.get(id).push(url);
}

const list = [...packs.entries()]
	.map(([id, files]) => {
		const meta = VOICE_META[id] || {};
		return {
			id,
			name: meta.name || id,
			desc: meta.desc || "",
			emoji: meta.emoji || "🎵",
			files: files.sort((a, b) => a.localeCompare(b, "zh-Hans-CN")),
		};
	})
	.sort((a, b) => b.files.length - a.files.length);

fs.writeFileSync(OUT_FILE, `${JSON.stringify(list, null, 2)}\n`);
console.log(
	`[voice-packs] 已生成 ${list.length} 个语音包（共 ${list.reduce((n, p) => n + p.files.length, 0)} 条语音）-> public/voice-packs.json`,
);
