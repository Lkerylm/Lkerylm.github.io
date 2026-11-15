/**
 * 本地追番清单（离线兜底数据）
 *
 * 为什么需要它：
 * - 番组计划页的数据是「构建时」从 api.bgm.tv 拉的，如果构建环境连不上 Bangumi
 *   （离线 / 网络被墙 / 接口抽风），整页就会变成一张空白卡片；
 * - 把这份手写清单作为兜底，构建时拉不到数据就展示这里的内容，页面永远不空。
 *
 * 怎么用：
 * - 想换成自己的追番：直接改下面的数组即可，字段都有注释；
 * - 构建时能正常访问 Bangumi API 的话，会自动优先展示线上数据，这份清单不会出现；
 * - 条目没有真实封面图时会用「渐变 + emoji + 标题」生成一张漂亮的占位封面。
 */

/** 1=想看 2=看过 3=在看 4=搁置 5=抛弃（与 Bangumi 收藏状态保持一致） */
export type LocalAnimeStatus = 1 | 2 | 3 | 4 | 5;

export interface LocalAnimeEntry {
	/** 中文名（主要显示） */
	nameCn: string;
	/** 原名 / 日文名 */
	name: string;
	/** 首播年份 */
	year: number;
	/** 我的评分（0-10，0 表示不显示） */
	score: number;
	/** 收藏状态 */
	status: LocalAnimeStatus;
	/** 已看集数 */
	ep: number;
	/** 总集数 */
	totalEp: number;
	/** 一句短评 */
	comment: string;
	/** 标签（最多显示 3 个） */
	tags: string[];
	/** 占位封面上的表情 */
	emoji: string;
	/** 占位封面的渐变色（左上 → 右下） */
	gradient: [string, string];
}

export const localAnimeCollection: LocalAnimeEntry[] = [
	{
		nameCn: "葬送的芙莉莲",
		name: "葬送のフリーレン",
		year: 2023,
		score: 9.0,
		status: 2,
		ep: 28,
		totalEp: 28,
		comment: "用一千年的时间，学会好好告别。",
		tags: ["奇幻", "治愈", "公路"],
		emoji: "🧝",
		gradient: ["#cfe9ff", "#b7c4ff"],
	},
	{
		nameCn: "孤独摇滚！",
		name: "ぼっち・ざ・ろっく！",
		year: 2022,
		score: 8.8,
		status: 2,
		ep: 12,
		totalEp: 12,
		comment: "社恐少女抱起了吉他，也抱住了自己。",
		tags: ["音乐", "日常", "喜剧"],
		emoji: "🎸",
		gradient: ["#ffd6ea", "#ffb3d4"],
	},
	{
		nameCn: "紫罗兰永恒花园",
		name: "ヴァイオレット・エヴァーガーデン",
		year: 2018,
		score: 8.7,
		status: 2,
		ep: 13,
		totalEp: 13,
		comment: "「爱」这个字，值得用一整部作品去解释。",
		tags: ["治愈", "催泪", "京都动画"],
		emoji: "💌",
		gradient: ["#ffe3c9", "#ffc2c7"],
	},
	{
		nameCn: "摇曳露营△",
		name: "ゆるキャン△",
		year: 2018,
		score: 8.5,
		status: 2,
		ep: 12,
		totalEp: 12,
		comment: "一个人的露营，也有一群人的风景。",
		tags: ["日常", "治愈", "美食"],
		emoji: "⛺",
		gradient: ["#d8f5e4", "#a9dcc4"],
	},
	{
		nameCn: "夏日重现",
		name: "サマータイムレンダ",
		year: 2022,
		score: 8.4,
		status: 2,
		ep: 25,
		totalEp: 25,
		comment: "同一个夏天，重来多少次也想救你。",
		tags: ["悬疑", "轮回", "热血"],
		emoji: "🌊",
		gradient: ["#c9ecff", "#9fd0f5"],
	},
	{
		nameCn: "轻音少女",
		name: "けいおん！",
		year: 2009,
		score: 8.6,
		status: 2,
		ep: 13,
		totalEp: 13,
		comment: "放学后的茶会和吉他，就是青春本来的样子。",
		tags: ["音乐", "校园", "日常"],
		emoji: "🎹",
		gradient: ["#ffe0f0", "#ffc4e1"],
	},
	{
		nameCn: "辉夜大小姐想让我告白",
		name: "かぐや様は告らせたい",
		year: 2019,
		score: 8.4,
		status: 2,
		ep: 12,
		totalEp: 12,
		comment: "恋爱即战争，先心动的人就输了。",
		tags: ["恋爱", "喜剧", "校园"],
		emoji: "💘",
		gradient: ["#ffd9e2", "#f3b7d4"],
	},
	{
		nameCn: "时光代理人",
		name: "时光代理人",
		year: 2021,
		score: 8.3,
		status: 2,
		ep: 11,
		totalEp: 11,
		comment: "每一次穿越，都要付一点代价。",
		tags: ["国产", "悬疑", "催泪"],
		emoji: "⌛",
		gradient: ["#d6e4ff", "#b9c6f2"],
	},
	{
		nameCn: "药屋少女的呢喃",
		name: "薬屋のひとりごと",
		year: 2023,
		score: 8.6,
		status: 3,
		ep: 18,
		totalEp: 24,
		comment: "后宫里的解谜，全靠好奇心驱动。",
		tags: ["悬疑", "古风", "轻小说改"],
		emoji: "🌿",
		gradient: ["#dff3d8", "#b5e0c0"],
	},
	{
		nameCn: "迷宫饭",
		name: "ダンジョン飯",
		year: 2024,
		score: 8.4,
		status: 3,
		ep: 12,
		totalEp: 24,
		comment: "先吃饭，再冒险。",
		tags: ["奇幻", "美食", "喜剧"],
		emoji: "🍲",
		gradient: ["#ffeccc", "#ffd6a5"],
	},
	{
		nameCn: "我心里危险的东西",
		name: "僕の心のヤバイやつ",
		year: 2023,
		score: 8.2,
		status: 1,
		ep: 0,
		totalEp: 12,
		comment: "中二病少年的暗恋观察日记，甜到蛀牙。",
		tags: ["恋爱", "校园", "喜剧"],
		emoji: "💗",
		gradient: ["#ffd7ea", "#ffbfe0"],
	},
	{
		nameCn: "间谍过家家",
		name: "SPY×FAMILY",
		year: 2022,
		score: 8.3,
		status: 2,
		ep: 25,
		totalEp: 25,
		comment: "为了任务，先学会当一个好爸爸。",
		tags: ["喜剧", "家庭", "动作"],
		emoji: "🕵️",
		gradient: ["#e2e0ff", "#c4bdf7"],
	},
];

/** 收藏状态 → 中文文案 */
export const localAnimeStatusText: Record<LocalAnimeStatus, string> = {
	1: "想看",
	2: "看过",
	3: "在看",
	4: "搁置",
	5: "抛弃",
};

/**
 * 取首页展示用的几部番：优先「在看」，其次「看过」里评分高的，
 * 这样首页的追番速览永远有东西可展示。
 */
export const pickFeaturedAnime = (count = 6): LocalAnimeEntry[] => {
	const weight = (entry: LocalAnimeEntry) => {
		if (entry.status === 3) return 0;
		if (entry.status === 1) return 1;
		if (entry.status === 2) return 2;
		return 3;
	};
	return [...localAnimeCollection]
		.sort((a, b) => weight(a) - weight(b) || b.score - a.score)
		.slice(0, count);
};
