import type { APIRoute } from "astro";
import { getSortedPosts } from "@/utils/content-utils";

// 纯静态部署：构建时从 Markdown 文章生成，无需数据库 / 服务器
export const prerender = true;

export const GET: APIRoute = async () => {
	const posts = await getSortedPosts();

	const allPostsData = posts
		.map((post) => ({
			id: post.id,
			title: post.data.title,
			description: post.data.description,
			published: post.data.published.getTime(),
			category: post.data.category || "",
			password: !!post.data.password,
		}))
		// 日历按纯日期排序，忽略置顶
		.sort((a, b) => b.published - a.published);

	return new Response(JSON.stringify(allPostsData), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
