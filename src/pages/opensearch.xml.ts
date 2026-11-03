import type { APIRoute } from "astro";
import { siteConfig } from "@/config";

/**
 * OpenSearch 描述文件
 *
 * 作用：Edge / Chrome / Firefox 等浏览器在地址栏里会「发现」本站的搜索能力，
 * 用户在站点主页按 Tab（Edge 地址栏）即可直接用本站搜索；配合 sitemap + IndexNow，
 * 在 Bing（Edge 默认搜索引擎）里搜站名也更容易命中。
 */
export const prerender = true;

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export const GET: APIRoute = ({ site }) => {
	const origin = (site ?? new URL(siteConfig.site_url)).origin;
	const shortName = siteConfig.title.slice(0, 16);
	const description =
		siteConfig.description || `${siteConfig.title} - ${siteConfig.subtitle}`;

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${escapeXml(shortName)}</ShortName>
  <Description>${escapeXml(description)}</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="32" height="32" type="image/png">${origin}/favicon/anime-32.png</Image>
  <Url type="text/html" method="get" template="${origin}/search/?q={searchTerms}"/>
  <Url type="application/opensearchdescription+xml" rel="self" template="${origin}/opensearch.xml"/>
  <moz:SearchForm xmlns:moz="http://www.mozilla.org/2006/browser/search/">${origin}/search/</moz:SearchForm>
</OpenSearchDescription>
`;

	return new Response(xml, {
		headers: {
			"Content-Type": "application/opensearchdescription+xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
