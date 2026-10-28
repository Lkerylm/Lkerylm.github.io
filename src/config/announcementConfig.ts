import type { AnnouncementConfig } from "../types/config";

export const announcementConfig: AnnouncementConfig = {
	// 公告标题
	title: "欢迎来到我的动漫小屋",

	// 公告内容
	content:
		"这里是 Koker 的二次元自留地：追番笔记、动画杂谈、同人碎片，都会慢慢搬进来～",

	// 是否允许用户关闭公告
	closable: true,

	link: {
		// 启用链接
		enable: true,
		// 链接文本
		text: "认识一下",
		// 链接 URL
		url: "/about/",
		// 内部链接
		external: false,
	},
};
