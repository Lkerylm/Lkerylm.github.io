import type { BackgroundWallpaperConfig } from "@/types/config";
import { animeWallpaperFiles } from "../utils/anime-wallpaper-utils";

function wallpaperFiles(kind: "desktop" | "mobile"): string[] {
	// 清单顺序已按文件名编号排好，保证「清单下标 === 编号 - 1」
	const files = animeWallpaperFiles(kind);
	if (!files.length) {
		// 兜底：清单缺失时退回仓库自带的示例壁纸，避免横幅空白
		return [`assets/images/AnimeWallpaper/${kind}/${kind}-01.avif`];
	}
	return files;
}

export const backgroundWallpaper: BackgroundWallpaperConfig = {
	// 壁纸模式："banner" 横幅壁纸，"overlay" 全屏透明，"none" 纯色背景无壁纸
	mode: "banner",
	// 是否允许用户通过导航栏切换壁纸模式，设为false可提升性能（只渲染当前模式）
	switchable: true,
	/**
	 * 背景图片配置
	 * 图片路径支持三种格式：
	 * 1. public 目录（以 "/" 开头，不优化）："/assets/images/banner.avif"
	 * 2. src 目录（不以 "/" 开头，自动优化但会增加构建时间，推荐）："assets/images/banner.avif"
	 * 3. 远程 URL："https://example.com/banner.jpg"
	 * 注意：远程URL和public目录的图片不会被优化，请确保图片体积足够小以免影响加载速度
	 *
	 * 本博客使用动漫壁纸，存放于 src/assets/images/AnimeWallpaper/ 目录下
	 * 建议不要替换官方示例图片 d1-d6、m1-m6，自定义图片请使用其他名称以免被覆盖
	 *
	 * 如果只使用一张图片或者使用随机图API，推荐直接使用字符串格式：
	 * desktop: "https://t.alcy.cc/pc",   // 随机图API
	 * desktop: "assets/images/AnimeWallpaper/desktop/desktop-01.avif", // 单张图片
	 *
	 * mobile: "https://t.alcy.cc/mp", // 随机图API
	 * mobile: "assets/images/AnimeWallpaper/mobile/mobile-01.avif", // 单张图片
	 *
	 * 支持配置多张图片（数组），每次刷新页面随机显示一张：
	 * desktop: [
	 * "assets/images/AnimeWallpaper/desktop/desktop-01.avif",
	 * "assets/images/AnimeWallpaper/desktop/desktop-02.avif",
	 * ],
	 *
	 * mobile:[
	 *   "assets/images/AnimeWallpaper/mobile/mobile-01.avif",
	 *   "assets/images/AnimeWallpaper/mobile/mobile-02.avif",
	 * ],
	 */
	src: {
		// 桌面背景图片（动漫壁纸，22 张，每次刷新随机显示一张）
		desktop: wallpaperFiles("desktop"),
		// 移动背景图片（动漫壁纸，22 张，每次刷新随机显示一张）
		mobile: wallpaperFiles("mobile"),
	},
	// Banner模式特有配置
	banner: {
		// 图片位置
		// 支持所有CSS object-position值，如: 'top', 'center', 'bottom', 'left top', 'right bottom', '25% 75%', '10px 20px'..
		// 如果不知道怎么配置百分百之类的配置，推荐直接使用：'center'居中，'top'顶部居中，'bottom' 底部居中，'left'左侧居中，'right'右侧居中
		position: "center",

		// 主页横幅文字
		homeText: {
			// 是否启用主页横幅文字
			enable: true,
			// 是否允许用户通过控制面板切换横幅标题显示
			switchable: true,
			// 主页横幅主标题
			title: "我的动漫小屋",
			// 主页横幅主标题字体大小
			titleSize: "3.8rem",
			// 主页横幅副标题（打字机效果会循环显示）
			subtitle: [
				"记录二次元的美好",
				"追番、补番，也收藏每一份心动",
				"愿所有的喜欢都能被温柔以待",
				"欢迎来到 Koker 的动漫小屋",
			],
			// 主页横幅副标题字体大小
			subtitleSize: "1.5rem",
			typewriter: {
				// 是否启用打字机效果
				// 打字机开启 → 循环显示所有副标题
				// 打字机关闭 → 每次刷新随机显示一条副标题
				enable: true,
				// 打字速度（毫秒）
				speed: 100,
				// 删除速度（毫秒）
				deleteSpeed: 50,
				// 完全显示后的暂停时间（毫秒）
				pauseTime: 2000,
			},
		},
		// 图片来源
		credit: {
			enable: {
				// 桌面端显示横幅图片来源文本
				desktop: true,
				// 移动端显示横幅图片来源文本
				mobile: true,
			},
			text: {
				// 桌面端要显示的来源文本
				desktop: "Pixiv 动漫壁纸",
				// 移动端要显示的来源文本
				mobile: "Pixiv 动漫壁纸",
			},
			url: {
				// 桌面端原始艺术品或艺术家页面的 URL 链接
				desktop: "https://www.pixiv.net/",
				// 移动端原始艺术品或艺术家页面的 URL 链接
				mobile: "https://www.pixiv.net/",
			},
		},
		// 横幅导航栏配置
		navbar: {
			// 横幅导航栏透明模式："semi" 半透明，"full" 完全透明，"semifull" 动态透明
			transparentMode: "semifull",
			// 是否开启毛玻璃模糊效果，开启可能会影响页面性能，如果不开启则是半透明，请根据自己的喜好开启
			enableBlur: true,
			// 毛玻璃模糊度
			blur: 10,
		},
		// 水波纹动画效果配置，开启会影响页面性能，请根据自己的喜好开启
		waves: {
			enable: {
				// 桌面端是否启用水波纹动画效果
				desktop: true,
				// 移动端是否启用水波纹动画效果
				mobile: true,
			},
			// 是否允许用户通过控制面板切换水波纹动画
			switchable: true,
		},
	},
	// 全屏透明覆盖模式特有配置
	overlay: {
		// 是否允许用户通过控制面板调整全屏透明模式参数
		switchable: {
			opacity: true,
			blur: true,
			cardOpacity: true,
		},
		// 层级，确保壁纸在背景层
		zIndex: -1,
		// 壁纸透明度
		opacity: 0.8,
		// 背景模糊度
		blur: 10,
		// 卡片透明度，0-1之间，值越小越透明
		cardOpacity: 0.5,
	},
};
