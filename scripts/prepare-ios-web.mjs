/**
 * 把构建好的站点（dist/）塞进 iOS「离线版」壳里。
 *
 * 在线版（FireflyOnline）直接加载 https://lkerylm.github.io/，不需要这一步；
 * 离线版（FireflyOffline）把整站打进 App 包，用 app://localhost/ 自定义协议读本地文件，
 * 所以这里只需要把 dist 拷成 ios/App/OfflineWeb/，Xcode 会把它作为文件夹引用整个塞进 .app。
 *
 * 用法：
 *   pnpm build && node scripts/prepare-ios-web.mjs         # 默认读 dist/
 *   node scripts/prepare-ios-web.mjs --src=dist            # 指定别的构建目录
 *
 * 会跳过的东西：
 *   *.apk      —— 安卓安装包，iOS 上用不到，还占 80MB
 *   *.map      —— sourcemap
 *   .DS_Store  —— macOS 垃圾文件
 */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const srcArg = process.argv.find((arg) => arg.startsWith("--src="));
const SRC = path.resolve(root, srcArg ? srcArg.slice("--src=".length) : "dist");
const DEST = path.join(root, "ios/App/OfflineWeb");

const SKIP_PATTERNS = [/\.apk$/i, /\.map$/i, /(^|\/)\.DS_Store$/];

function shouldSkip(source) {
	const rel = path.relative(SRC, source).replaceAll("\\", "/");
	if (!rel) return false;
	return SKIP_PATTERNS.some((pattern) => pattern.test(rel));
}

async function measure(dir) {
	let files = 0;
	let bytes = 0;
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			const sub = await measure(full);
			files += sub.files;
			bytes += sub.bytes;
		} else {
			files += 1;
			bytes += (await stat(full)).size;
		}
	}
	return { bytes, files };
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

async function main() {
	if (!(await stat(SRC).catch(() => null))) {
		throw new Error(`找不到构建产物：${SRC}（先跑 pnpm build）`);
	}

	await rm(DEST, { force: true, recursive: true });
	await mkdir(DEST, { recursive: true });

	await cp(SRC, DEST, {
		filter: (source) => !shouldSkip(source),
		recursive: true,
	});

	// 首页兜底：Astro 的 /index.html 已经是 dir index，这里只是确认一下存在
	const index = path.join(DEST, "index.html");
	if (!(await stat(index).catch(() => null))) {
		throw new Error("离线壳里缺 index.html，构建产物不对劲");
	}

	const { bytes, files } = await measure(DEST);
	const pkg = JSON.parse(
		await readFile(path.join(root, "package.json"), "utf8"),
	);

	await writeFile(
		path.join(DEST, "_firefly-build.json"),
		`${JSON.stringify(
			{
				version: pkg.version ?? "0.0.0",
				files,
				bytes,
				builtAt: new Date().toISOString(),
				source: path.relative(root, SRC).replaceAll("\\", "/"),
			},
			null,
			"\t",
		)}\n`,
	);

	console.log(
		`[ios-web] ${files} 个文件 / ${mb(bytes)} → ios/App/OfflineWeb（已跳过 *.apk、*.map）`,
	);
}

await main();
