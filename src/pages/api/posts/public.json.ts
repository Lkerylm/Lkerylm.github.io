import type { APIRoute } from "astro";

// 静态部署下没有社区后端，返回空列表让首页社区区块优雅降级
export const prerender = true;

export const GET: APIRoute = () =>
	new Response(JSON.stringify({ ok: true, posts: [] }), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
