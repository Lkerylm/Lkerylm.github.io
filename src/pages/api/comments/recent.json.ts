import type { APIRoute } from "astro";

// 静态部署下没有评论后端，返回空列表让首页评论区块优雅降级
export const prerender = true;

export const GET: APIRoute = () =>
	new Response(JSON.stringify({ ok: true, comments: [] }), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
