import fs from "fs";
import path from "path";

const ttsDir = "./public/tts";
const outFile = "./public/voices-list.json";

const voices = [];

function scan(dir) {
	const items = fs.readdirSync(dir, { withFileTypes: true });
	for (const item of items) {
		const full = path.join(dir, item.name);
		if (item.isDirectory()) {
			scan(full);
		} else if (item.name.toLowerCase().endsWith(".mp3")) {
			const rel = "/" + path.relative("./public", full).replace(/\\/g, "/");
			voices.push(rel);
		}
	}
}

if (!fs.existsSync(ttsDir)) {
	console.error("找不到 tts 目录：", ttsDir);
	process.exit(1);
}

scan(ttsDir);

fs.writeFileSync(outFile, JSON.stringify(voices, null, 2));
console.log(`已生成 ${voices.length} 条语音 -> ${outFile}`);