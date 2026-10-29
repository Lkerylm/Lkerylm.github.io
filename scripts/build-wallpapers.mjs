/**
 * 二次元壁纸批量构建脚本
 *
 * 把站点里所有可用的动漫壁纸整理成一套「画廊 + 横幅」通用资源：
 *   1. 原图 → public/anime-wallpaper/{desktop,mobile}-NN.avif（1920 / 1080 宽，控制在 200KB 内）
 *   2. 夜色变体 → {kind}-NN+11.avif（压暗 + 蓝色月光，同样是手动可选的壁纸）
 *   3. 缩略图 → public/anime-wallpaper/thumbs/（360 宽，画廊里用）
 *   4. 清单 → public/anime-wallpaper/manifest.json（画廊在构建时直接 import，离线 / APK 都可用）
 *
 * 来源：
 *   src/assets/images/AnimeWallpaper/{desktop,mobile}/*.avif   ← 手绘动漫壁纸
 *   src/assets/images/DesktopWallpaper/d1..d6.avif             ← 主题自带壁纸（也全是二次元）
 *   src/assets/images/MobileWallpaper/m1..m6.avif
 *
 * 用法：node scripts/build-wallpapers.mjs [--force]
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public/anime-wallpaper");
const THUMBS = path.join(OUT, "thumbs");
const FORCE = process.argv.includes("--force");
const VERSION = 2;

const SOURCES = {
	desktop: [
		...["01", "02", "03", "04", "05"].map((n) => `src/assets/images/AnimeWallpaper/desktop/desktop-${n}.avif`),
		...["1", "2", "3", "4", "5", "6"].map((n) => `src/assets/images/DesktopWallpaper/d${n}.avif`),
	],
	mobile: [
		...["01", "02", "03", "04", "05"].map((n) => `src/assets/images/AnimeWallpaper/mobile/mobile-${n}.avif`),
		...["1", "2", "3", "4", "5", "6"].map((n) => `src/assets/images/MobileWallpaper/m${n}.avif`),
	],
};

/** 壁纸名字（画廊里显示）：按顺序给每组一个可爱的名字 */
const NAMES = {
	desktop: [
		"火锅小聚",
		"樱花电车窗",
		"星夜长发",
		"黄昏电车",
		"雨中伞下",
		"月下少女",
		"粉发午后",
		"夏日海边",
		"神社黄昏",
		"猫咪与风铃",
		"天台微风",
	],
	mobile: [
		"樱落少女",
		"星空少女",
		"雪夜灯火",
		"雨伞小径",
		"午后猫尾",
		"月见长发",
		"粉樱插画",
		"夏日泳装",
		"黄昏屋顶",
		"花火夜",
		"海风轻语",
	],
};

const TARGET_WIDTH = { desktop: 1920, mobile: 1080 };

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

/** 夜色变体：压暗 + 蓝调 multiply + 月光 screen（overlay 尺寸必须与图片完全一致） */
function nightLayers(width, height) {
	return [
		{
			input: { create: { width, height, channels: 4, background: { r: 26, g: 34, b: 82, alpha: 0.5 } } },
			blend: "multiply",
		},
		{
			input: { create: { width, height, channels: 4, background: { r: 118, g: 158, b: 255, alpha: 0.15 } } },
			blend: "screen",
		},
	];
}

async function buildOne(kind, index, srcRel, tone) {
	const src = path.join(ROOT, srcRel);
	if (!fs.existsSync(src)) {
		console.warn(`[skip] 缺少素材 ${srcRel}`);
		return null;
	}

	const width = TARGET_WIDTH[kind];
	const num = String(index).padStart(2, "0");
	const file = `${kind}-${num}.avif`;
	const dest = path.join(OUT, file);
	const thumb = path.join(THUMBS, file);

	ensureDir(OUT);
	ensureDir(THUMBS);

	const meta = await sharp(src).metadata();
	// 竖图 / 横图分别按宽度或高度约束，避免手机壁纸被压扁
	let resizeOpts;
	if (kind === "mobile") {
		resizeOpts = meta.height && meta.height > meta.width ? { height: 1850 } : { width };
	} else {
		resizeOpts = { width };
	}

	let pipeline = sharp(src).rotate().resize({ ...resizeOpts, fit: "inside", withoutEnlargement: true }).flatten({ background: "#0b0a12" });

	if (tone === "night") {
		const resized = await pipeline.toBuffer({ resolveWithObject: true });
		const out = await sharp(resized.data)
			.modulate({ brightness: 0.74, saturation: 0.9 })
			.composite(nightLayers(resized.info.width, resized.info.height))
			.avif({ quality: 55, effort: 4 })
			.toFile(dest);
		console.log(`[壁纸] ${file}  ${out.width}x${out.height}  ${(fs.statSync(dest).size / 1024).toFixed(0)}KB (夜色)`);
	} else {
		const out = await pipeline.avif({ quality: 58, effort: 4 }).toFile(dest);
		console.log(`[壁纸] ${file}  ${out.width}x${out.height}  ${(fs.statSync(dest).size / 1024).toFixed(0)}KB`);
	}

	// 缩略图（画廊网格）：直接从原图裁方形，避免二次解码刚写出的文件
	await sharp(src)
		.rotate()
		.resize({ width: 360, height: 360, fit: "cover", position: "attention" })
		.flatten({ background: "#0b0a12" })
		.avif({ quality: 45, effort: 2 })
		.toFile(thumb);

	return { file, width: meta.width, height: meta.height };
}

const items = [];
const total = SOURCES.desktop.length + SOURCES.mobile.length;

let done = 0;
for (const kind of ["desktop", "mobile"]) {
	const list = SOURCES[kind];
	for (let i = 0; i < list.length; i++) {
		const index = i + 1;
		const name = (NAMES[kind] && NAMES[kind][i]) || `${kind === "desktop" ? "桌面" : "手机"}壁纸 ${index}`;
		const orig = await buildOne(kind, index, list[i], "light");
		const nightIndex = i + 1 + list.length;
		if (orig) {
			items.push({
				id: `${kind}-${String(index).padStart(2, "0")}`,
				kind,
				index: index - 1,
				tone: "light",
				label: name,
				file: `/anime-wallpaper/${orig.file}`,
				thumb: `/anime-wallpaper/thumbs/${orig.file}`,
			});
		}
		const night = await buildOne(kind, nightIndex, list[i], "night");
		if (night) {
			items.push({
				id: `${kind}-${String(nightIndex).padStart(2, "0")}`,
				kind,
				index: nightIndex - 1,
				tone: "night",
				label: `${name} · 夜`,
				file: `/anime-wallpaper/${night.file}`,
				thumb: `/anime-wallpaper/thumbs/${night.file}`,
			});
		}
		done += 1;
		console.log(`   -> ${done}/${total} 张素材处理完成`);
	}
}

// 清单：画廊 / 全屏背景 / 横幅都用它，保证索引一致
const manifest = {
	version: VERSION,
	generatedAt: new Date().toISOString(),
	counts: {
		desktop: items.filter((i) => i.kind === "desktop").length,
		mobile: items.filter((i) => i.kind === "mobile").length,
	},
	items,
};
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(
	`\n[manifest] 共 ${items.length} 张壁纸（桌面 ${manifest.counts.desktop} / 手机 ${manifest.counts.mobile}）-> public/anime-wallpaper/manifest.json`,
);
