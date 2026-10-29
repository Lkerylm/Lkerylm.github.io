import {
	LinkPreset,
	type NavBarConfig,
	type NavBarLink,
	type NavBarSearchConfig,
	NavBarSearchMethod,
} from "../types/config";
import { siteConfig } from "./siteConfig";

// 根据页面开关动态生成导航栏配置
const getDynamicNavBarConfig = (): NavBarConfig => {
	// 基础导航栏链接
	const links: (NavBarLink | LinkPreset)[] = [
		// 主页
		LinkPreset.Home,

		// 归档
		LinkPreset.Archive,
	];

	// 站内二次元分区（社区 / 番组 / 相册 / 留言板 / 友链），全部指向自己的站点
	links.push({
		name: "社区",
		url: "/community/",
		icon: "mingcute:magic-1-fill",
		children: [
			{
				name: "社区投稿",
				url: "/community/",
				icon: "mingcute:planet-fill",
			},
			...(siteConfig.pages.bangumi
				? [
						{
							name: "番组计划",
							url: "/bangumi/",
							icon: "mingcute:play-circle-fill",
						},
					]
				: []),
			...(siteConfig.pages.gallery
				? [
						{
							name: "相册",
							url: "/gallery/",
							icon: "mingcute:pic-fill",
						},
					]
				: []),
			...(siteConfig.pages.guestbook
				? [
						{
							name: "留言板",
							url: "/guestbook/",
							icon: "mingcute:chat-3-fill",
						},
					]
				: []),
			...(siteConfig.pages.friends
				? [
						{
							name: "友链",
							url: "/friends/",
							icon: "mingcute:link-2-fill",
						},
					]
				: []),
		],
	});

	// 我的及其子菜单
	links.push({
		name: "我的",
		url: "/my/",
		icon: "mingcute:cat-fill",
		children: [
			// 根据配置决定是否添加相册，在siteConfig关闭pages.gallery时导航栏不显示相册
			...(siteConfig.pages.gallery ? [LinkPreset.Gallery] : []),

			// 根据配置决定是否添加番组计划，在siteConfig关闭pages.bangumi时导航栏不显示番组计划
			...(siteConfig.pages.bangumi ? [LinkPreset.Bangumi] : []),
		],
	});

	// 关于及其子菜单
	links.push({
		name: "关于",
		url: "/content/",
		icon: "mingcute:flower-2-fill",
		children: [
			// 根据配置决定是否添加赞助，在siteConfig关闭pages.sponsor时导航栏不显示赞助
			...(siteConfig.pages.sponsor ? [LinkPreset.Sponsor] : []),

			// 关于页面
			LinkPreset.About,
		],
	});

	// 下载 App（在线版 / 离线版）
	links.push({
		name: "App",
		url: "/app/",
		icon: "mingcute:cellphone-fill",
	});

	// 仅返回链接，其它导航搜索相关配置在模块顶层常量中独立导出
	return { links } as NavBarConfig;
};

// 导航搜索配置
export const navBarSearchConfig: NavBarSearchConfig = {
	method: NavBarSearchMethod.PageFind,
};

export const navBarConfig: NavBarConfig = getDynamicNavBarConfig();
