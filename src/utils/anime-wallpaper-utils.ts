// 动漫壁纸清单由 scripts/build-wallpapers.mjs 生成（22 张横屏 + 22 张竖屏，含夜色变体）
import animeWallpaperManifest from "../../public/anime-wallpaper/manifest.json";

export type AnimeWallpaperKind = "desktop" | "mobile";

type WallpaperEntry = { kind: AnimeWallpaperKind; file: string };

/**
 * 读取壁纸清单，返回指定设备的壁纸路径列表（按文件名编号排序）。
 *
 * 清单里「原图 / 夜色」是交错排列的（01、12、02、13 …），
 * 而横幅、壁纸画廊、全屏层、页面背景都按「index + 1 = 编号」取图，
 * 所以这里必须按编号排序，才能保证清单下标与画廊选中的是同一张图。
 *
 * 清单缺失时返回空数组，由调用方决定兜底图。
 */
export function animeWallpaperFiles(kind: AnimeWallpaperKind): string[] {
	const items = ((animeWallpaperManifest as { items?: WallpaperEntry[] }).items || []) as WallpaperEntry[];
	const files = items.filter((item) => item.kind === kind).map((item) => item.file);
	return files.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}
