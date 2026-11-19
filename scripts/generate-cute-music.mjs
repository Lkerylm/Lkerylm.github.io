#!/usr/bin/env node
/**
 * 生成「萤火虫摇篮曲」—— 本站自制的背景音乐与封面
 * ------------------------------------------------------------------
 * 为什么要有这个脚本：
 *   原来 public/assets/music 里放的是《崩坏：星穹铁道》同名曲目的录音和网易云的专辑封面，
 *   版权属于原权利方，不能随仓库 / App 分发（见 THIRD-PARTY-NOTICES.md 第 4 节）。
 *   与其找一首「免费但要求署名 / 条款随时会变」的曲子，不如在这里用几千行数学算一首：
 *
 *   · 零依赖：只用 node:fs，不下载任何东西
 *   · 零版权风险：波形全部由本脚本算出，随仓库以 CC0 释出，谁都能用
 *   · 确定性：伪随机种子固定，任何人跑一遍都得到同样的字节
 *
 * 产出（两个文件都已提交到仓库，构建时不需要重新生成）：
 *   public/assets/music/firefly-lullaby.wav        八音盒小循环（16 kHz / 单声道 / 16 bit）
 *   public/assets/music/cover/firefly-lullaby.svg  手绘感的可爱封面（播放器里会转起来）
 *
 * 用法：
 *   pnpm music:generate      # 想换调子/速度就改下面的常量再跑
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_WAV = join(ROOT, "public/assets/music/firefly-lullaby.wav");
const OUT_SVG = join(ROOT, "public/assets/music/cover/firefly-lullaby.svg");

const SAMPLE_RATE = 16000;
const BPM = 84;
const BEAT = 60 / BPM;
const TOTAL_BEATS = 32; // 8 小节 × 4 拍
const DURATION = TOTAL_BEATS * BEAT;
const FRAMES = Math.round(DURATION * SAMPLE_RATE);

/** MIDI 音高 → 频率（A4 = 69 = 440Hz） */
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/** 固定种子的伪随机：保证每次生成的文件一模一样 */
function mulberry32(seed) {
	let a = seed >>> 0;
	return function () {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * 旋律：[起始拍, MIDI 音高, 时值(拍)]
 * C 大调，五声音阶为主，跳进不超过四度，末句回到主音，适合哄睡
 */
const MELODY = [
	[0, 76, 1], [1, 79, 1], [2, 76, 1], [3, 74, 1],
	[4, 72, 1.5], [5.5, 76, 0.5], [6, 79, 2],
	[8, 74, 1], [9, 76, 1], [10, 79, 1], [11, 81, 1],
	[12, 79, 3],
	[16, 76, 1], [17, 79, 1], [18, 81, 1], [19, 79, 1],
	[20, 76, 1.5], [21.5, 74, 0.5], [22, 72, 2],
	[24, 74, 1], [25, 76, 1], [26, 74, 1], [27, 72, 1],
	[28, 72, 4],
];

/** 低音铺底：[起始拍, MIDI 音高, 时值(拍)] —— C → Am → F → G 各两小节 */
const BASS = [
	[0, 48, 4], [4, 45, 4], [8, 41, 4], [12, 43, 4],
	[16, 48, 4], [20, 45, 4], [24, 41, 4], [28, 43, 4],
];

/** 八音盒音色：几组泛音 + 各自不同的衰减速度，听起来像小铃铛 */
const BELL_PARTIALS = [
	{ ratio: 1, gain: 1, decay: 2.4 },
	{ ratio: 2.0, gain: 0.42, decay: 3.6 },
	{ ratio: 2.98, gain: 0.22, decay: 5.0 },
	{ ratio: 4.06, gain: 0.12, decay: 6.4 },
];

const buffer = new Float32Array(FRAMES);

function addBell(startSec, midi, durSec, amp) {
	const f0 = hz(midi);
	const start = Math.max(0, Math.round(startSec * SAMPLE_RATE));
	const body = Math.min(DURATION - startSec, Math.max(durSec, 0.9));
	const len = Math.min(FRAMES - start, Math.round((body + 1.2) * SAMPLE_RATE));
	const attack = Math.round(0.004 * SAMPLE_RATE);
	for (let i = 0; i < len; i++) {
		const t = i / SAMPLE_RATE;
		// 4ms 起音，避免爆音
		const env = i < attack ? i / attack : 1;
		let s = 0;
		for (const p of BELL_PARTIALS) {
			s += p.gain * Math.exp(-p.decay * t) * Math.sin(2 * Math.PI * f0 * p.ratio * t);
		}
		// 被"按住"的那段时间稍微托住音量，松手后自然衰减
		const hold = t < body ? 0.55 : 1;
		buffer[start + i] += s * env * amp * hold;
	}
}

function addPad(startSec, midi, durSec, amp) {
	const f = hz(midi);
	const start = Math.max(0, Math.round(startSec * SAMPLE_RATE));
	const len = Math.min(FRAMES - start, Math.round(durSec * SAMPLE_RATE));
	const atk = 0.5;
	const rel = 0.8;
	for (let i = 0; i < len; i++) {
		const t = i / SAMPLE_RATE;
		let env = 1;
		if (t < atk) env = t / atk;
		if (t > durSec - rel) env = Math.max(0, (durSec - t) / rel);
		// 一点点颤音，让铺底不那么"电子"
		const vib = 1 + 0.0025 * Math.sin(2 * Math.PI * 5.2 * t);
		const s =
			Math.sin(2 * Math.PI * f * vib * t) +
			0.28 * Math.sin(2 * Math.PI * f * 2 * t) +
			0.12 * Math.sin(2 * Math.PI * f * 3 * t);
		buffer[start + i] += s * env * amp * 0.33;
	}
}

// ── 排布：旋律八音盒 → 低音铺底 → 几颗随机的高音"萤火"点缀 ────────────────
for (const [beat, midi, beats] of MELODY) {
	addBell(beat * BEAT, midi, beats * BEAT, 0.5);
}
for (const [beat, midi, beats] of BASS) {
	addPad(beat * BEAT, midi, beats * BEAT, 0.5);
	addBell(beat * BEAT, midi + 12, beats * BEAT, 0.12);
}

const rand = mulberry32(20261119);
const SPARKLE_SCALE = [84, 86, 88, 91, 93, 96];
for (let i = 0; i < 26; i++) {
	const beat = rand() * TOTAL_BEATS;
	const midi = SPARKLE_SCALE[Math.floor(rand() * SPARKLE_SCALE.length)];
	addBell(beat * BEAT, midi, 0.15, 0.05 + rand() * 0.05);
}

// ── 简易混响：两级反馈延迟，尾巴短短的，像在小房间里弹八音盒 ────────────────
function reverb(src, taps) {
	const out = new Float32Array(src.length);
	out.set(src);
	for (const { delay, gain } of taps) {
		const d = Math.round(delay * SAMPLE_RATE);
		for (let i = d; i < out.length; i++) {
			out[i] += out[i - d] * gain;
		}
	}
	return out;
}

const wet = reverb(buffer, [
	{ delay: 0.11, gain: 0.26 },
	{ delay: 0.19, gain: 0.18 },
	{ delay: 0.31, gain: 0.11 },
]);

// ── 归一化到 -3 dBFS，并在首尾各做 12ms 淡入淡出，循环时不会有咔哒声 ──────────
let peak = 0;
for (let i = 0; i < wet.length; i++) {
	const v = Math.abs(wet[i]);
	if (v > peak) peak = v;
}
const target = 0.708; // -3 dBFS
const gain = peak > 0 ? target / peak : 1;
const fadeFrames = Math.round(0.012 * SAMPLE_RATE);

const pcm = Buffer.alloc(wet.length * 2);
for (let i = 0; i < wet.length; i++) {
	let v = wet[i] * gain;
	if (i < fadeFrames) v *= i / fadeFrames;
	const tail = wet.length - 1 - i;
	if (tail < fadeFrames) v *= tail / fadeFrames;
	const clamped = Math.max(-1, Math.min(1, v));
	pcm.writeInt16LE(Math.round(clamped * 32767), i * 2);
}

/** 44 字节标准 WAV 头 + PCM 数据 */
function wavFile(data) {
	const header = Buffer.alloc(44);
	header.write("RIFF", 0, "ascii");
	header.writeUInt32LE(36 + data.length, 4);
	header.write("WAVE", 8, "ascii");
	header.write("fmt ", 12, "ascii");
	header.writeUInt32LE(16, 16); // fmt chunk 大小
	header.writeUInt16LE(1, 20); // PCM
	header.writeUInt16LE(1, 22); // 单声道
	header.writeUInt32LE(SAMPLE_RATE, 24);
	header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
	header.writeUInt16LE(2, 32); // block align
	header.writeUInt16LE(16, 34); // 位深
	header.write("data", 36, "ascii");
	header.writeUInt32LE(data.length, 40);
	return Buffer.concat([header, data]);
}

mkdirSync(dirname(OUT_WAV), { recursive: true });
writeFileSync(OUT_WAV, wavFile(pcm));
console.log(
	`[music] ${OUT_WAV}  ${(pcm.length / 1024 / 1024).toFixed(2)} MB  ${DURATION.toFixed(1)}s  ` +
		`${SAMPLE_RATE}Hz mono  (peak ${(20 * Math.log10(target)).toFixed(1)} dBFS)`,
);

// ── 封面：播放器里会当黑胶转，所以做成同心圆 + 中心小标签 ─────────────────────
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="萤火虫摇篮曲封面">
  <defs>
    <radialGradient id="disc" cx="38%" cy="30%" r="78%">
      <stop offset="0%" stop-color="#fff6fb"/>
      <stop offset="46%" stop-color="#ffd9ec"/>
      <stop offset="100%" stop-color="#d9c4ff"/>
    </radialGradient>
    <linearGradient id="label" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffb3d6"/>
      <stop offset="100%" stop-color="#b9a4ff"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fffbe8" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#ffe9a8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="256" cy="256" r="250" fill="url(#disc)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.55">
    <circle cx="256" cy="256" r="232" stroke-width="2"/>
    <circle cx="256" cy="256" r="204" stroke-width="1.5"/>
    <circle cx="256" cy="256" r="176" stroke-width="1.5"/>
    <circle cx="256" cy="256" r="148" stroke-width="1.2"/>
  </g>
  <circle cx="256" cy="256" r="120" fill="url(#label)" fill-opacity="0.92"/>
  <circle cx="256" cy="256" r="120" fill="none" stroke="#ffffff" stroke-width="6" stroke-opacity="0.85"/>
  <circle cx="256" cy="256" r="18" fill="#fffafd"/>
  <circle cx="256" cy="256" r="7" fill="#e6a7c9"/>
  <!-- 两只小萤火虫 -->
  <g>
    <circle cx="176" cy="188" r="26" fill="url(#glow)"/>
    <circle cx="176" cy="188" r="7" fill="#fff6c9"/>
    <circle cx="330" cy="322" r="20" fill="url(#glow)"/>
    <circle cx="330" cy="322" r="5.5" fill="#fff6c9"/>
  </g>
  <!-- 音符 -->
  <g fill="#fffdfe">
    <ellipse cx="238" cy="286" rx="15" ry="11" transform="rotate(-18 238 286)"/>
    <rect x="250" y="228" width="6.5" height="58" rx="3"/>
    <path d="M256 228c22-9 34-2 34 14 0 9-7 15-15 15 9-6 10-14 3-18-6-4-14-1-22 1z"/>
  </g>
  <!-- 爱心 -->
  <path d="M300 176c7-11 25-9 27 4 2 12-14 22-27 31-13-9-29-19-27-31 2-13 20-15 27-4z" fill="#ffffff" fill-opacity="0.9"/>
  <g fill="#ffffff" fill-opacity="0.75">
    <circle cx="128" cy="330" r="4"/>
    <circle cx="392" cy="150" r="3.5"/>
    <circle cx="150" cy="132" r="3"/>
    <circle cx="368" cy="392" r="3.5"/>
  </g>
</svg>
`;

mkdirSync(dirname(OUT_SVG), { recursive: true });
writeFileSync(OUT_SVG, svg, "utf8");
console.log(`[music] ${OUT_SVG}  ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`);
