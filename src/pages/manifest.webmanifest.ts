import type { APIRoute } from "astro";
import { siteConfig } from "@/config";

/**
 * PWA 清单（Web App Manifest）
 *
 * 作用：iPhone / iPad 用 Safari 打开本站 →「分享 → 添加到主屏幕」后，
 * 会得到一个和 App 一样的全屏图标（没有地址栏），Android / 桌面浏览器
 * 也会把它识别成可安装的 PWA。配合 /sw.js 就能离线阅读。
 *
 * 内容全部取自 siteConfig，改站名 / 描述不用动这里。
 */
export const prerender = true;

// 与站点的樱花粉配色保持一致（见 public/app/index.html、anime-pages.css）
const THEME_COLOR = "#ffe9f4";
const BACKGROUND_COLOR = "#fff7fb";

export const GET: APIRoute = () => {
	const base = import.meta.env.BASE_URL.endsWith("/")
		? import.meta.env.BASE_URL
		: `${import.meta.env.BASE_URL}/`;

	const manifest = {
		id: base,
		name: siteConfig.title,
		short_name: siteConfig.title.slice(0, 12),
		description:
			siteConfig.description ||
			`${siteConfig.title} - ${siteConfig.subtitle}`.trim(),
		lang: siteConfig.lang.replace("_", "-"),
		dir: "ltr",
		start_url: base,
		scope: base,
		display: "standalone",
		display_override: ["standalone", "minimal-ui", "browser"],
		orientation: "any",
		background_color: BACKGROUND_COLOR,
		theme_color: THEME_COLOR,
		categories: ["blog", "entertainment", "lifestyle"],
		icons: [
			{
				src: `${base}favicon/anime-192.png`,
				sizes: "192x192",
				type: "image/png",
				purpose: "any",
			},
			{
				src: `${base}favicon/anime-512.png`,
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
			{
				// 安卓的圆形 / 异形图标会用到（樱花居中，裁切也安全）
				src: `${base}favicon/anime-512.png`,
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: `${base}favicon/anime.svg`,
				sizes: "any",
				type: "image/svg+xml",
				purpose: "any",
			},
		],
		shortcuts: [
			{
				name: "时光归档",
				short_name: "归档",
				url: `${base}archive/`,
				icons: [
					{
						src: `${base}favicon/anime-192.png`,
						sizes: "192x192",
						type: "image/png",
					},
				],
			},
			{
				name: "全站搜索",
				short_name: "搜索",
				url: `${base}search/`,
				icons: [
					{
						src: `${base}favicon/anime-192.png`,
						sizes: "192x192",
						type: "image/png",
					},
				],
			},
			{
				name: "在线 / 离线 App",
				short_name: "App",
				url: `${base}app/`,
				icons: [
					{
						src: `${base}favicon/anime-192.png`,
						sizes: "192x192",
						type: "image/png",
					},
				],
			},
		],
	};

	return new Response(JSON.stringify(manifest, null, 2), {
		headers: {
			"Content-Type": "application/manifest+json; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
