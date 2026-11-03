import type { AidConfig } from "@/types/config";

/**
 * 公益寻亲（帮走失 / 被拐的孩子回家）配置
 *
 * 设计原则（很重要，避免侵权与误导）：
 * 1. 只展示「文字要点」，全程不转载任何照片 / 海报，避免侵犯肖像权与著作权；
 * 2. 每条信息都必须带官方来源链接，详情一律以官方页面为准；
 * 3. 数据来自 public/data/aid/missing-children.json，页面运行时拉取（默认 5 分钟刷新一次），
 *    可通过 scripts/sync-aid.mjs 或 GitHub Actions 定时同步，做到「实时更新」；
 * 4. 卡片可以手动关闭，关闭后一段时间内不再自动出现，右下角 🧸 按钮随时可以重新打开；
 * 5. 点击卡片正文会跳转到官方公益链接（或该条信息的官方详情页）。
 */
export const aidConfig: AidConfig = {
	// 总开关：false 时全站不显示公益卡片（/aid/ 页面仍然可以直接访问）
	enable: true,

	// 卡片标题 / 副标题
	title: "公益寻亲",
	subtitle: "多看一眼，也许就多一次团圆",

	// 是否允许访客手动关闭卡片
	closeable: true,

	// 关闭后多少天内不再自动弹出（点右下角 🧸 仍可随时重新打开）
	rememberDays: 7,

	// 卡片默认位置（手机端会自动靠下并缩窄）
	position: "bottom-right",

	// 多条协查信息 / 公益提示的轮播间隔（秒）
	rotateSeconds: 8,

	// 数据自动刷新间隔（分钟）
	refreshMinutes: 5,

	// 数据文件（相对站点根目录，运行时拉取，改 JSON 即可实时生效）
	dataUrl: "/data/aid/missing-children.json",

	// 点击卡片正文时默认跳转的官方公益链接
	portalUrl: "https://www.baobeihuijia.com/",

	// 官方渠道（卡片底部与 /aid/ 页面都会展示）
	sources: [
		{
			name: "宝贝回家寻子网",
			url: "https://www.baobeihuijia.com/",
			description: "国内知名的公益寻子平台，可查询公开寻亲信息、登记寻亲线索",
		},
		{
			name: "公安部（团圆系统）",
			url: "https://www.mps.gov.cn/",
			description:
				"儿童失踪无需等待，请立即报警，由警方通过「团圆」系统紧急发布",
		},
		{
			name: "报警电话 110",
			url: "tel:110",
			description:
				"发现走失、被拐儿童线索，请第一时间拨打 110，不要自行带走孩子",
		},
	],
};
