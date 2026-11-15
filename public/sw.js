/* 「我的动漫小屋」Service Worker
 * ------------------------------------------------------------------
 * 目的：让 iPhone / iPad（以及安卓、桌面浏览器）把本站「添加到主屏幕」
 *       之后，断网也能继续看已经逛过的内容。
 *
 * 策略（简单、可预测，不玩花样）：
 *   1. 页面导航（含 Swup 的 fetch 换页）→ 先联网，断网时回退到缓存过的页面，
 *      再不行就返回 /offline/ 离线小页面；
 *   2. /_astro/ 下的样式与脚本（带内容哈希，永远不变）→ 缓存优先；
 *   3. 图片 / 图标 / 字体 → 缓存优先（有上限，超出按最旧淘汰）；
 *   4. pagefind 搜索索引、JSON / XML → 先联网，断网用缓存；
 *   5. /api/ 后端接口、APK、音视频（含 Range 请求）→ 完全不碰，直接走网络，
 *      免得把几百兆的安装包塞进缓存。
 *
 * 想强制刷新全站缓存时，把 VERSION 加一即可（旧缓存会自动清掉）。
 */

const VERSION = "anime-home-v2";

const CORE_CACHE = `${VERSION}-core`;
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;
const IMAGE_CACHE = `${VERSION}-images`;

// sw.js 可能部署在子路径（例如 /blog/sw.js），所有地址都跟着它走
const BASE = new URL(self.location.href).pathname.replace(/\/sw\.js$/, "");
const toUrl = (path) => `${BASE}${path}`;

const OFFLINE_URL = toUrl("/offline/");

// 安装时就抓下来的「门面」：离线页 + 图标，保证断网时至少有一张体面的脸
const CORE_FILES = [
	OFFLINE_URL,
	toUrl("/ios/"),
	toUrl("/manifest.webmanifest"),
	toUrl("/favicon/anime-192.png"),
	toUrl("/favicon/anime-512.png"),
	toUrl("/favicon/anime-180.png"),
	toUrl("/favicon/anime.svg"),
	toUrl("/favicon/anime.ico"),
];

const MAX_PAGES = 80;
const MAX_ASSETS = 160;
const MAX_IMAGES = 140;

const NAVIGATION_TIMEOUT = 10000;
const REQUEST_TIMEOUT = 15000;

// 不缓存的请求：安装包、音视频（都太大，也不属于「阅读」范畴）
const SKIP_PATTERNS = [
	/\.(apk|aab|ipa|zip|7z|rar|exe|dmg)$/i,
	/\.(mp4|webm|ogv|mov|m4v)$/i,
	/\.(mp3|ogg|oga|wav|m4a|aac|flac)$/i,
];

/* ---------------------------------------------------------------- 安装 / 激活 */

self.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CORE_CACHE);
			// 逐个抓，某个文件 404 也不影响整体安装
			await Promise.allSettled(
				CORE_FILES.map((file) =>
					cache.add(new Request(file, { cache: "reload" })),
				),
			);
			await self.skipWaiting();
		})(),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter((key) => !key.startsWith(`${VERSION}-`))
					.map((key) => caches.delete(key)),
			);
			await self.clients.claim();
		})(),
	);
});

/* ------------------------------------------------------------------- 小工具 */

function withTimeout(request, ms) {
	// 极端老浏览器：没有 AbortController 就直接放行
	if (typeof AbortController === "undefined") {
		return fetch(request);
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), ms);

	return fetch(request, { signal: controller.signal }).finally(() =>
		clearTimeout(timer),
	);
}

async function trimCache(cacheName, maxEntries) {
	const cache = await caches.open(cacheName);
	const keys = await cache.keys();
	if (keys.length <= maxEntries) {
		return;
	}
	// Cache Storage 的 keys() 按写入顺序返回，先删最旧的
	for (const key of keys.slice(0, keys.length - maxEntries)) {
		await cache.delete(key);
	}
}

async function putInCache(cacheName, request, response, maxEntries) {
	const cache = await caches.open(cacheName);
	await cache.put(request, response);
	if (maxEntries) {
		await trimCache(cacheName, maxEntries);
	}
}

function textResponse(message, status = 503) {
	return new Response(message, {
		status,
		statusText: status === 503 ? "Offline" : "OK",
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}

/** 1×1 透明 GIF：图片离线取不到时用它占位，别让页面裂开 */
function placeholderImage() {
	return new Response(
		Uint8Array.from([
			71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255,
			33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1,
			0, 59,
		]),
		{ headers: { "Content-Type": "image/gif" } },
	);
}

/* ------------------------------------------------------------------ 各策略 */

/** 页面导航：先联网，失败再用缓存，最后给离线页 */
async function handleNavigation(event) {
	const request = event.request;

	try {
		const response = await withTimeout(request, NAVIGATION_TIMEOUT);
		if (response && response.ok) {
			await putInCache(PAGE_CACHE, request, response.clone(), MAX_PAGES);
			return response;
		}
		// 5xx / 404 之类的服务端问题，能用旧页面就先顶上
		const cached = await caches.match(request, { ignoreSearch: true });
		return cached || response;
	} catch {
		const cached = await caches.match(request, { ignoreSearch: true });
		if (cached) {
			return cached;
		}

		const core = await caches.open(CORE_CACHE);
		const offline = await core.match(OFFLINE_URL);
		return offline || textResponse("现在离线中，联网后再试试吧 🌸");
	}
}

/** 样式 / 脚本：文件名带内容哈希，缓存优先 */
async function handleAsset(event) {
	const request = event.request;
	const cached = await caches.match(request);
	if (cached) {
		return cached;
	}

	try {
		const response = await withTimeout(request, REQUEST_TIMEOUT);
		if (response && response.ok && response.type === "basic") {
			await putInCache(ASSET_CACHE, request, response.clone(), MAX_ASSETS);
		}
		return response;
	} catch {
		return textResponse("离线中，样式或脚本没缓存到 😢");
	}
}

/** 图片 / 图标 / 字体：缓存优先 + 数量上限 */
async function handleImage(event) {
	const request = event.request;
	const cached = await caches.match(request);
	if (cached) {
		return cached;
	}

	try {
		const response = await withTimeout(request, REQUEST_TIMEOUT);
		if (response && response.ok && response.type === "basic") {
			await putInCache(IMAGE_CACHE, request, response.clone(), MAX_IMAGES);
		}
		return response;
	} catch {
		return placeholderImage();
	}
}

/** 数据类（pagefind 索引、JSON、XML）：先联网，断网用缓存 */
async function handleData(event) {
	const request = event.request;

	try {
		const response = await withTimeout(request, REQUEST_TIMEOUT);
		if (response && response.ok) {
			await putInCache(ASSET_CACHE, request, response.clone(), MAX_ASSETS);
		}
		return response;
	} catch {
		const cached = await caches.match(request, { ignoreSearch: true });
		return cached || textResponse("离线中，这份数据还没缓存 🌸");
	}
}

/* ------------------------------------------------------------------- 路由 */

function isNavigationRequest(request) {
	if (request.mode === "navigate") {
		return true;
	}
	const accept = request.headers.get("accept") || "";
	// Swup 换页走的是 fetch（不是 navigate），靠 Accept 头识别成页面请求
	return accept.includes("text/html");
}

function isSkipped(request, url) {
	if (request.method !== "GET") {
		return true;
	}
	if (url.origin !== self.location.origin) {
		return true;
	}
	if (request.headers.has("range")) {
		return true;
	}
	// 后端接口永远走网络
	if (url.pathname.startsWith(`${BASE}/api/`)) {
		return true;
	}
	return SKIP_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

self.addEventListener("fetch", (event) => {
	const request = event.request;
	let url;
	try {
		url = new URL(request.url);
	} catch {
		return;
	}

	if (isSkipped(request, url)) {
		return;
	}

	if (isNavigationRequest(request)) {
		event.respondWith(handleNavigation(event));
		return;
	}

	const path = url.pathname;

	if (path.startsWith(`${BASE}/_astro/`)) {
		event.respondWith(handleAsset(event));
		return;
	}

	if (
		request.destination === "style" ||
		request.destination === "script" ||
		request.destination === "font" ||
		/\.(css|js|mjs|woff2?|ttf|otf)$/i.test(path)
	) {
		event.respondWith(handleAsset(event));
		return;
	}

	if (
		request.destination === "image" ||
		/\.(png|jpe?g|webp|avif|gif|svg|ico|bmp)$/i.test(path)
	) {
		event.respondWith(handleImage(event));
		return;
	}

	if (/\.(json|xml|webmanifest)$/i.test(path) || path.includes("/pagefind/")) {
		event.respondWith(handleData(event));
	}
});

/* --------------------------------------------------------------- 消息通道 */

self.addEventListener("message", (event) => {
	const data = event.data || {};

	// 新版本就绪：立刻接管（前端会顺手刷新一次）
	if (data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}

	// 清理全部缓存（调试 / 「清空离线内容」按钮用）
	if (data.type === "CLEAR_CACHES") {
		event.waitUntil(
			(async () => {
				const keys = await caches.keys();
				await Promise.all(keys.map((key) => caches.delete(key)));
			})(),
		);
	}
});
