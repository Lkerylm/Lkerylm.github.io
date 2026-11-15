/**
 * iOS 启动图（apple-touch-startup-image）生成脚本
 * ------------------------------------------------------------------
 * iPhone / iPad 把本站「添加到主屏幕」之后，点开时 iOS 会先显示一张启动图，
 * 没有启动图就是一片白，看起来特别像「网页还没加载」。
 *
 * 这里按主流机型的像素尺寸生成纯矢量的樱花启动画面（和 App 图标同一套配色），
 * 输出到 public/splash/splash-<宽>x<高>.png，由 Layout.astro 里的
 * <link rel="apple-touch-startup-image"> 按机型 media 查询挑一张。
 *
 * 用法：node scripts/generate-ios-splash.mjs
 */

import { mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const OUT_DIR = join(ROOT_DIR, "public", "splash");

/** 竖屏尺寸 = CSS 像素 × @2x / @3x，和 Layout.astro 里的 media 查询一一对应 */
const SIZES = [
	{ w: 1320, h: 2868 }, // iPhone 16 Pro Max       440×956 @3
	{ w: 1290, h: 2796 }, // iPhone 16 Plus / 15 Pro Max / 14 Pro Max  430×932 @3
	{ w: 1206, h: 2622 }, // iPhone 16 Pro           402×874 @3
	{ w: 1179, h: 2556 }, // iPhone 15 Pro / 14 Pro  393×852 @3
	{ w: 1170, h: 2532 }, // iPhone 14 / 13 / 12     390×844 @3
	{ w: 1125, h: 2436 }, // iPhone X / XS / 11 Pro / 12 mini / 13 mini 375×812 @3
	{ w: 828, h: 1792 }, // iPhone 11 / XR          414×896 @2
	{ w: 750, h: 1334 }, // iPhone SE / 8 / 7       375×667 @2
	{ w: 2048, h: 2732 }, // iPad Pro 12.9"          1024×1366 @2
	{ w: 1668, h: 2388 }, // iPad Pro 11"            834×1194 @2
	{ w: 1536, h: 2048 }, // iPad 9.7" / mini        768×1024 @2
];

/** 一只 512×512 的樱花徽章，按目标尺寸缩放并居中（视觉重心略高于正中，像启动页） */
function buildSvg(w, h) {
	const size = Math.round(Math.min(w, h) * 0.28);
	const x = Math.round((w - size) / 2);
	const y = Math.round(h * 0.42 - size / 2);
	const scale = size / 512;
	const glowR = Math.round(size * 0.98);

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#fffafd"/>
      <stop offset="52%" stop-color="#fff1f8"/>
      <stop offset="100%" stop-color="#f3ecff"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffd0e6" stop-opacity="0.85"/>
      <stop offset="62%" stop-color="#ffd9ea" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#ffd9ea" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffc2dd"/>
      <stop offset="48%" stop-color="#ff8fc1"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <radialGradient id="markGlow" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <circle cx="${w / 2}" cy="${y + size / 2}" r="${glowR}" fill="url(#halo)"/>
  <g transform="translate(${x} ${y}) scale(${scale})">
    <rect width="512" height="512" rx="128" fill="url(#mark)"/>
    <circle cx="256" cy="238" r="156" fill="url(#markGlow)" opacity="0.6"/>
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
  </g>
</svg>`;
}

mkdirSync(OUT_DIR, { recursive: true });

let total = 0;

for (const { w, h } of SIZES) {
	const file = join(OUT_DIR, `splash-${w}x${h}.png`);
	await sharp(Buffer.from(buildSvg(w, h)))
		.png({ compressionLevel: 9, effort: 10, palette: true, colours: 128 })
		.toFile(file);
	const bytes = statSync(file).size;
	total += bytes;
	console.log(`✔ ${`splash-${w}x${h}.png`.padEnd(26)} ${(bytes / 1024).toFixed(1)} KB`);
}

console.log(`\n共 ${SIZES.length} 张，合计 ${(total / 1024 / 1024).toFixed(2)} MB → ${OUT_DIR}`);
