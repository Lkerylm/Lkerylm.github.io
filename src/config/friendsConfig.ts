import type { FriendLink, FriendsPageConfig } from "../types/config";

// 可以在src/content/spec/friends.md中编写友链页面下方的自定义内容

// 友链页面配置
export const friendsPageConfig: FriendsPageConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 是否显示底部自定义内容（friends.mdx 中的内容）
	showCustomContent: true,

	// 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: true,

	// 是否开启随机排序配置，如果开启，就会忽略权重，构建时进行一次随机排序
	randomizeSort: false,
};

// 友情链接：全部指向本站自己的页面 / 自己的账号
export const friendsConfig: FriendLink[] = [
	{
		title: "Firefly 在线版",
		imgurl: "/favicon/anime-192.png",
		desc: "在手机上直接打开本站：看内容不用登录，发帖评论才需要登录",
		siteurl: "https://lkerylm.github.io/app/",
		tags: ["App"],
		weight: 10,
		enabled: true,
	},
	{
		title: "Firefly 离线版",
		imgurl: "/favicon/anime-180.png",
		desc: "看板娘和模型全部打包进手机，断网、飞行模式也能看",
		siteurl: "https://lkerylm.github.io/app/",
		tags: ["App"],
		weight: 9,
		enabled: true,
	},
	{
		title: "社区投稿",
		imgurl: "/favicon/anime-128.png",
		desc: "登录后就能发帖、评论，和大家一起聊番",
		siteurl: "https://lkerylm.github.io/community/",
		tags: ["Site"],
		weight: 8,
		enabled: true,
	},
];

// 获取启用的友链并进行排序
export const getEnabledFriends = (): FriendLink[] => {
	const friends = friendsConfig.filter((friend) => friend.enabled);

	if (friendsPageConfig.randomizeSort) {
		return friends.sort(() => Math.random() - 0.5);
	}

	return friends.sort((a, b) => b.weight - a.weight);
};
