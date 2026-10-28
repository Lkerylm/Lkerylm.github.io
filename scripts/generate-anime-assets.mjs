/**
 * 二次元主题资源生成脚本
 *
 * 1. 把 src/assets 里的动漫壁纸复制到 public/anime-wallpaper（SSR / 独立页面也能直接引用）
 * 2. 合成登录、退出、点击等 UI 音效（public/sounds/ui）
 * 3. 生成动漫风格的站点图标（public/favicon/anime.svg / png / ico）
 * 4. 重新扫描 public 下的 Live2D 模型与语音，刷新 models-list.json / voices-list.json
 *
 * 使用方法：node scripts/generate-anime-assets.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

/* -------------------------------------------------------------------------- */
/* 1. 壁纸                                                                     */
/* -------------------------------------------------------------------------- */
function copyWallpapers() {
	const srcRoot = path.join(ROOT, "src/assets/images/AnimeWallpaper");
	const outRoot = path.join(PUBLIC, "anime-wallpaper");
	ensureDir(outRoot);

	let count = 0;
	for (const group of ["desktop", "mobile"]) {
		const dir = path.join(srcRoot, group);
		if (!fs.existsSync(dir)) continue;
		for (const file of fs.readdirSync(dir)) {
			if (!/\.(avif|webp|jpe?g|png)$/i.test(file)) continue;
			fs.copyFileSync(path.join(dir, file), path.join(outRoot, file));
			count++;
		}
	}
	console.log(`[wallpaper] 已复制 ${count} 张动漫壁纸 -> public/anime-wallpaper`);
}

/* -------------------------------------------------------------------------- */
/* 2. UI 音效（纯代码合成，无需外部素材）                                       */
/* -------------------------------------------------------------------------- */
const SAMPLE_RATE = 44100;

/**
 * 合成一段音频
 * @param {{duration:number, notes:Array<{freq:number,start:number,dur:number,type?:string,gain?:number,vibrato?:number}>}} spec
 */
function renderWav(spec) {
	const total = Math.ceil(spec.duration * SAMPLE_RATE);
	const buf = new Float32Array(total);

	for (const note of spec.notes) {
		const startSample = Math.floor((note.start || 0) * SAMPLE_RATE);
		const durSample = Math.floor((note.dur || 0.2) * SAMPLE_RATE);
		const gain = note.gain ?? 0.5;
		const type = note.type || "sine";
		const vibrato = note.vibrato || 0;

		for (let i = 0; i < durSample; i++) {
			const idx = startSample + i;
			if (idx >= total) break;
			const t = i / SAMPLE_RATE;
			const progress = i / durSample;
			// 快起慢落，避免爆音
			const attack = Math.min(1, t / 0.006);
			const release = Math.pow(1 - progress, 2.2);
			const env = attack * release;

			const freq = note.freq * (1 + vibrato * Math.sin(2 * Math.PI * 6 * t));
			const phase = 2 * Math.PI * freq * t;
			let wave;
			switch (type) {
				case "square":
					wave = Math.sign(Math.sin(phase)) * 0.6;
					break;
				case "triangle":
					wave = (2 / Math.PI) * Math.asin(Math.sin(phase));
					break;
				case "bell":
					wave =
						Math.sin(phase) * 0.7 +
						Math.sin(phase * 2.01) * 0.2 +
						Math.sin(phase * 3.02) * 0.1;
					break;
				default:
					wave = Math.sin(phase);
			}
			buf[idx] += wave * env * gain;
		}
	}

	// 轻微归一化，防止削波
	let peak = 0;
	for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(buf[i]));
	const norm = peak > 0.92 ? 0.92 / peak : 1;

	const data = Buffer.alloc(total * 2);
	for (let i = 0; i < total; i++) {
		const v = Math.max(-1, Math.min(1, buf[i] * norm));
		data.writeInt16LE(Math.round(v * 32767), i * 2);
	}

	const header = Buffer.alloc(44);
	header.write("RIFF", 0);
	header.writeUInt32LE(36 + data.length, 4);
	header.write("WAVE", 8);
	header.write("fmt ", 12);
	header.writeUInt32LE(16, 16); // fmt chunk size
	header.writeUInt16LE(1, 20); // PCM
	header.writeUInt16LE(1, 22); // mono
	header.writeUInt32LE(SAMPLE_RATE, 24);
	header.writeUInt32LE(SAMPLE_RATE * 2, 28);
	header.writeUInt16LE(2, 32);
	header.writeUInt16LE(16, 34);
	header.write("data", 36);
	header.writeUInt32LE(data.length, 40);

	return Buffer.concat([header, data]);
}

const SOUNDS = {
	// 通用点击（清脆的铃音）
	click: {
		duration: 0.22,
		notes: [
			{ freq: 1046.5, start: 0, dur: 0.16, gain: 0.32, type: "bell" },
			{ freq: 1568, start: 0.012, dur: 0.12, gain: 0.18, type: "sine" },
		],
	},
	// 轻触（链接 / 卡片）
	tap: {
		duration: 0.2,
		notes: [
			{ freq: 880, start: 0, dur: 0.13, gain: 0.24, type: "sine" },
			{ freq: 1318.5, start: 0.01, dur: 0.1, gain: 0.12, type: "bell" },
		],
	},
	// 登录成功：上行的魔法琶音
	login: {
		duration: 0.95,
		notes: [
			{ freq: 523.25, start: 0, dur: 0.6, gain: 0.3, type: "bell" },
			{ freq: 659.25, start: 0.1, dur: 0.6, gain: 0.26, type: "bell" },
			{ freq: 783.99, start: 0.2, dur: 0.65, gain: 0.24, type: "bell" },
			{ freq: 1046.5, start: 0.3, dur: 0.62, gain: 0.26, type: "bell" },
			{ freq: 2093, start: 0.36, dur: 0.4, gain: 0.08, type: "sine" },
		],
	},
	// 退出登录：下行的告别音
	logout: {
		duration: 0.95,
		notes: [
			{ freq: 783.99, start: 0, dur: 0.45, gain: 0.26, type: "bell" },
			{ freq: 659.25, start: 0.12, dur: 0.45, gain: 0.24, type: "bell" },
			{ freq: 523.25, start: 0.24, dur: 0.5, gain: 0.22, type: "bell" },
			{ freq: 392, start: 0.36, dur: 0.55, gain: 0.2, type: "sine" },
		],
	},
	// 操作成功
	success: {
		duration: 0.68,
		notes: [
			{ freq: 659.25, start: 0, dur: 0.36, gain: 0.26, type: "bell" },
			{ freq: 783.99, start: 0.1, dur: 0.38, gain: 0.24, type: "bell" },
			{ freq: 1046.5, start: 0.2, dur: 0.42, gain: 0.26, type: "bell" },
		],
	},
	// 操作失败
	error: {
		duration: 0.5,
		notes: [
			{ freq: 311.13, start: 0, dur: 0.24, gain: 0.22, type: "triangle" },
			{ freq: 233.08, start: 0.14, dur: 0.3, gain: 0.2, type: "triangle" },
		],
	},
	// 通知 / 新消息
	notification: {
		duration: 0.8,
		notes: [
			{ freq: 1318.5, start: 0, dur: 0.36, gain: 0.22, type: "bell" },
			{ freq: 1760, start: 0.12, dur: 0.36, gain: 0.18, type: "bell" },
			{ freq: 2637, start: 0.24, dur: 0.34, gain: 0.09, type: "sine" },
		],
	},
	// 打开面板
	open: {
		duration: 0.36,
		notes: [
			{ freq: 660, start: 0, dur: 0.18, gain: 0.18, type: "sine" },
			{ freq: 990, start: 0.09, dur: 0.22, gain: 0.16, type: "sine" },
		],
	},
	// 关闭面板
	close: {
		duration: 0.32,
		notes: [
			{ freq: 880, start: 0, dur: 0.16, gain: 0.16, type: "sine" },
			{ freq: 587.33, start: 0.08, dur: 0.2, gain: 0.15, type: "sine" },
		],
	},
};

function generateSounds() {
	const outDir = path.join(PUBLIC, "sounds/ui");
	ensureDir(outDir);
	for (const [name, spec] of Object.entries(SOUNDS)) {
		fs.writeFileSync(path.join(outDir, `${name}.wav`), renderWav(spec));
	}
	console.log(
		`[sounds] 已生成 ${Object.keys(SOUNDS).length} 个 UI 音效 -> public/sounds/ui`,
	);
}

copyWallpapers();
generateSounds();

/* -------------------------------------------------------------------------- */
/* 3. 动漫风格站点图标                                                          */
/* -------------------------------------------------------------------------- */
const ANIME_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffc2dd"/>
      <stop offset="48%" stop-color="#ff8fc1"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#bg)"/>
  <circle cx="256" cy="238" r="156" fill="url(#glow)" opacity="0.6"/>
  <g fill="#ffffff" fill-opacity="0.96">
    <path d="M256 92c30 30 36 80 0 128c-36-48-30-98 0-128z"/>
    <path d="M256 92c30 30 36 80 0 128c-36-48-30-98 0-128z" transform="rotate(72 256 236)"/>
    <path d="M256 92c30 30 36 80 0 128c-36-48-30-98 0-128z" transform="rotate(144 256 236)"/>
    <path d="M256 92c30 30 36 80 0 128c-36-48-30-98 0-128z" transform="rotate(216 256 236)"/>
    <path d="M256 92c30 30 36 80 0 128c-36-48-30-98 0-128z" transform="rotate(288 256 236)"/>
  </g>
  <circle cx="256" cy="236" r="30" fill="#ff8fc1"/>
  <circle cx="256" cy="236" r="13" fill="#ffffff"/>
  <path d="M396 108l13 32 32 13-32 13-13 32-13-32-32-13 32-13z" fill="#ffffff" fill-opacity="0.92"/>
  <path d="M126 332l9 22 22 9-22 9-9 22-9-22-22-9 22-9z" fill="#ffffff" fill-opacity="0.78"/>
  <path d="M372 322l7 17 17 7-17 7-7 17-7-17-17-7 17-7z" fill="#ffffff" fill-opacity="0.65"/>
</svg>
`;

async function generateFavicons() {
	const outDir = path.join(PUBLIC, "favicon");
	ensureDir(outDir);
	fs.writeFileSync(path.join(outDir, "anime.svg"), ANIME_ICON_SVG);

	const svg = Buffer.from(ANIME_ICON_SVG);
	const sizes = [32, 64, 128, 180, 192, 512];
	for (const size of sizes) {
		await sharp(svg, { density: 384 })
			.resize(size, size)
			.png({ compressionLevel: 9 })
			.toFile(path.join(outDir, `anime-${size}.png`));
	}

	// 生成包含 32 / 64 两种尺寸的 favicon.ico（PNG 内嵌格式）
	const pngs = [32, 64].map((size) => ({
		size,
		data: fs.readFileSync(path.join(outDir, `anime-${size}.png`)),
	}));
	const header = Buffer.alloc(6);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(pngs.length, 4);

	let offset = 6 + pngs.length * 16;
	const entries = [];
	for (const png of pngs) {
		const entry = Buffer.alloc(16);
		entry.writeUInt8(png.size >= 256 ? 0 : png.size, 0);
		entry.writeUInt8(png.size >= 256 ? 0 : png.size, 1);
		entry.writeUInt8(0, 2);
		entry.writeUInt8(0, 3);
		entry.writeUInt16LE(1, 4);
		entry.writeUInt16LE(32, 6);
		entry.writeUInt32LE(png.data.length, 8);
		entry.writeUInt32LE(offset, 12);
		entries.push(entry);
		offset += png.data.length;
	}
	fs.writeFileSync(
		path.join(outDir, "anime.ico"),
		Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]),
	);
	console.log("[favicon] 已生成动漫图标 -> public/favicon/anime.{svg,png,ico}");
}

/* -------------------------------------------------------------------------- */
/* 4. Live2D 模型 / 语音清单                                                    */
/* -------------------------------------------------------------------------- */
function walk(dir, predicate) {
	const result = [];
	if (!fs.existsSync(dir)) return result;
	for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, item.name);
		if (item.isDirectory()) {
			if (item.name === "node_modules" || item.name.startsWith(".")) continue;
			result.push(...walk(full, predicate));
		} else if (predicate(item.name)) {
			result.push(full);
		}
	}
	return result;
}

function toUrl(full) {
	return "/" + path.relative(PUBLIC, full).replace(/\\/g, "/");
}

function refreshLists() {
	// 语音：public/tts 下所有 mp3
	const voices = walk(path.join(PUBLIC, "tts"), (name) =>
		name.toLowerCase().endsWith(".mp3"),
	)
		.map(toUrl)
		.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
	fs.writeFileSync(
		path.join(PUBLIC, "voices-list.json"),
		JSON.stringify(voices, null, 2),
	);
	console.log(`[voices] 已收录 ${voices.length} 条语音 -> public/voices-list.json`);

	// 模型：public 下所有 model3.json（跳过重复的 FileReferences_Moc_0 别名）
	const models = walk(
		PUBLIC,
		(name) =>
			name.endsWith(".model3.json") && !name.startsWith("FileReferences_Moc_0"),
	)
		.map(toUrl)
		.sort((a, b) => a.localeCompare(b));
	fs.writeFileSync(
		path.join(PUBLIC, "models-list.json"),
		JSON.stringify(models, null, 2),
	);
	console.log(`[live2d] 已收录 ${models.length} 个模型 -> public/models-list.json`);
}

await generateFavicons();
refreshLists();


