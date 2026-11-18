/**
 * 生成 iOS 原生壳（ios/）要用的图标 / 启动画面素材。
 *
 * 产物（都是 Assets.xcassets 里 Xcode 直接认的格式）：
 *   ios/App/Assets.xcassets/AppIcon.appiconset/icon-1024.png   不带透明通道的 1024 图标
 *   ios/App/Assets.xcassets/LaunchLogo.imageset/launch-*.png   启动页中间的樱花小图标（1x/2x/3x）
 *   ios/App/Assets.xcassets/LaunchBackground.colorset/…       启动页底色（#fff7fb）
 *   ios/App/Assets.xcassets/AccentColor.colorset/…            主题粉（#ff8fbf）
 *
 * 原图用 public/favicon/anime.svg（和 PWA 图标同源），配色与 manifest 保持一致，
 * 改配色时只要改下面的常量，再 `pnpm run ios:assets`。
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const SOURCE_SVG = path.join(root, "public/favicon/anime.svg");
const ASSETS = path.join(root, "ios/App/Assets.xcassets");

/** 与 src/pages/manifest.webmanifest.ts 里的 theme_color / background_color 对应 */
const ICON_BG = "#ffe9f4";
const LAUNCH_BG = "#fff7fb";
const ACCENT = "#ff8fbf";

const json = (data) => `${JSON.stringify(data, null, "\t")}\n`;

/** #rrggbb → {red, green, blue, alpha}（asset catalog 要 0~1 的小数） */
function colorComponents(hex) {
	const value = hex.replace("#", "");
	const toUnit = (offset) =>
		(Number.parseInt(value.slice(offset, offset + 2), 16) / 255).toFixed(3);
	return {
		alpha: "1.000",
		blue: toUnit(4),
		green: toUnit(2),
		red: toUnit(0),
	};
}

function colorset(hex) {
	return {
		colors: [
			{
				color: {
					"color-space": "srgb",
					components: colorComponents(hex),
				},
				idiom: "universal",
			},
		],
		info: { author: "xcode", version: 1 },
	};
}

async function renderBadge(size, { background } = {}) {
	const pipeline = sharp(SOURCE_SVG, { density: 1024 }).resize(size, size, {
		fit: background ? "cover" : "contain",
	});

	if (!background) return pipeline.png({ compressionLevel: 9 }).toBuffer();

	// iOS 的 AppIcon 不能带透明通道：铺一层同色底色把 SVG 自己的圆角补齐
	// （系统还会再套一次圆角遮罩，所以这里不需要留白边）
	return pipeline
		.flatten({ background })
		.removeAlpha()
		.png({ compressionLevel: 9 })
		.toBuffer();
}

async function main() {
	const iconDir = path.join(ASSETS, "AppIcon.appiconset");
	const logoDir = path.join(ASSETS, "LaunchLogo.imageset");

	await Promise.all([
		mkdir(iconDir, { recursive: true }),
		mkdir(logoDir, { recursive: true }),
		mkdir(path.join(ASSETS, "LaunchBackground.colorset"), { recursive: true }),
		mkdir(path.join(ASSETS, "AccentColor.colorset"), { recursive: true }),
	]);

	// 图标：苹果只要求一张 1024×1024、不带 alpha 的 png（Xcode 14+ 单尺寸模式）
	await writeFile(
		path.join(iconDir, "icon-1024.png"),
		await renderBadge(1024, { background: ICON_BG }),
	);

	// 启动页图标：背景由 LaunchBackground 负责，这里保持透明
	for (const [name, size] of [
		["launch@1x.png", 240],
		["launch@2x.png", 480],
		["launch@3x.png", 720],
	]) {
		await writeFile(path.join(logoDir, name), await renderBadge(size));
	}

	await Promise.all([
		writeFile(
			path.join(iconDir, "Contents.json"),
			json({
				images: [
					{
						filename: "icon-1024.png",
						idiom: "universal",
						platform: "ios",
						size: "1024x1024",
					},
				],
				info: { author: "xcode", version: 1 },
			}),
		),
		writeFile(
			path.join(logoDir, "Contents.json"),
			json({
				images: [
					{ filename: "launch@1x.png", idiom: "universal", scale: "1x" },
					{ filename: "launch@2x.png", idiom: "universal", scale: "2x" },
					{ filename: "launch@3x.png", idiom: "universal", scale: "3x" },
				],
				info: { author: "xcode", version: 1 },
			}),
		),
		writeFile(
			path.join(ASSETS, "LaunchBackground.colorset/Contents.json"),
			json(colorset(LAUNCH_BG)),
		),
		writeFile(
			path.join(ASSETS, "AccentColor.colorset/Contents.json"),
			json(colorset(ACCENT)),
		),
		writeFile(
			path.join(ASSETS, "Contents.json"),
			json({ info: { author: "xcode", version: 1 } }),
		),
	]);

	console.log("[ios-assets] 图标与启动素材已生成到 ios/App/Assets.xcassets");
}

await main();
