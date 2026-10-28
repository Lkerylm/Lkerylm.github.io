/**
 * 把所有页面推送到 IndexNow（Bing / Yandex / Seznam 等共用协议）
 *
 * 用法：
 *   $env:SITE_URL="https://你的域名"; pnpm indexnow
 *   $env:SITE_URL="https://你的域名"; pnpm indexnow --dry-run   # 只打印 URL，不发送
 *
 * 前置条件：
 *   1. 站点已部署，且 https://你的域名/<KEY>.txt 可以直接访问（内容就是 KEY）
 *   2. 本地执行过 pnpm build（脚本会读取 dist/sitemap-0.xml）
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const INDEXNOW_KEY = "71eb0a3193d74c01be38358479103e2a";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS = 10000;

const dryRun = process.argv.slice(2).includes("--dry-run");

function fail(message) {
	console.error("✖ " + message);
	process.exit(1);
}

const rawSiteUrl = process.env.SITE_URL;
if (!rawSiteUrl) {
	fail('请先设置 SITE_URL，例如：$env:SITE_URL="https://your-domain.com"; pnpm indexnow');
}
const siteUrl = rawSiteUrl.trim().replace(/\/+$/, "");
if (!/^https?:\/\//i.test(siteUrl)) {
	fail("SITE_URL 必须以 http:// 或 https:// 开头：" + rawSiteUrl);
}
if (!dryRun && /localhost|127\.0\.0\.1/i.test(siteUrl)) {
	fail("SITE_URL 不能是本机地址，请填写部署后的公网域名");
}

// 1. 校验 key 文件（部署后必须能从 https://域名/<key>.txt 访问到）
const keyPath = path.join(process.cwd(), "public", INDEXNOW_KEY + ".txt");
let keyContent;
try {
	keyContent = (await readFile(keyPath, "utf8")).trim();
} catch {
	fail("缺少校验文件 public/" + INDEXNOW_KEY + ".txt");
}
if (keyContent !== INDEXNOW_KEY) {
	fail("校验文件 public/" + INDEXNOW_KEY + ".txt 的内容必须等于 " + INDEXNOW_KEY);
}

// 2. 从 sitemap 读取全部页面
const sitemapPath = path.join(process.cwd(), "dist", "sitemap-0.xml");
let sitemapXml;
try {
	sitemapXml = await readFile(sitemapPath, "utf8");
} catch {
	fail("找不到 dist/sitemap-0.xml，请先执行 pnpm build");
}

const urlList = [];
const seen = new Set();
for (const match of sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
	const loc = match[1].trim();
	let pathname;
	try {
		pathname = new URL(loc).pathname;
	} catch {
		continue;
	}
	const fullUrl = siteUrl + pathname;
	if (seen.has(fullUrl)) continue;
	seen.add(fullUrl);
	urlList.push(fullUrl);
}
if (urlList.length === 0) {
	fail("sitemap 中没有解析到任何 URL");
}

const payload = {
	host: new URL(siteUrl).host,
	key: INDEXNOW_KEY,
	keyLocation: siteUrl + "/" + INDEXNOW_KEY + ".txt",
};

console.log("→ 站点：" + siteUrl);
console.log("→ 待提交：" + urlList.length + " 个 URL");

if (dryRun) {
	for (const url of urlList) console.log("   " + url);
	console.log("（--dry-run 模式，未发送请求）");
	process.exit(0);
}

let hasError = false;
for (let i = 0; i < urlList.length; i += MAX_URLS) {
	const chunk = urlList.slice(i, i + MAX_URLS);
	let response;
	try {
		response = await fetch(ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json; charset=utf-8" },
			body: JSON.stringify({ ...payload, urlList: chunk }),
		});
	} catch (error) {
		hasError = true;
		console.error("✖ 请求失败：" + error.message);
		continue;
	}

	const ok = response.status === 200 || response.status === 202;
	console.log(
		(ok ? "✔" : "✖") +
			" IndexNow 响应：" +
			response.status +
			" " +
			response.statusText +
			"（本批 " +
			chunk.length +
			" 个 URL）",
	);
	if (!ok) {
		hasError = true;
		console.error((await response.text()).slice(0, 500));
	}
}

if (hasError) {
	console.error("部分 URL 提交失败，请检查 SITE_URL 是否已是部署后的地址、key 文件是否可访问");
	process.exit(1);
}
console.log("✅ 已通知 Bing / IndexNow，通常几分钟到 24 小时内开始抓取");
