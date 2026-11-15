import {
	type LocalAnimeEntry,
	localAnimeCollection,
} from "@/config/animeCollection";
import type { UserSubjectCollection } from "@/types/bangumi";

/**
 * 把本地手写的追番清单转成 Bangumi 收藏条目的形状，
 * 这样番组计划页的筛选 / 分页 / 卡片组件可以原样复用，不用另写一套 UI。
 */
export const localAnimeToCollection = (
	entry: LocalAnimeEntry,
): UserSubjectCollection => ({
	subject_id: 0,
	subject_type: 2,
	rate: entry.score,
	type: entry.status,
	comment: entry.comment,
	tags: entry.tags,
	ep_status: entry.ep,
	vol_status: 0,
	updated_at: `${entry.year}-01-01T00:00:00.000Z`,
	private: false,
	subject: {
		id: 0,
		type: 2,
		name: entry.name,
		name_cn: entry.nameCn,
		short_summary: entry.comment,
		date: `${entry.year}-01-01`,
		// 没有封面图：Card 会用 coverArt 生成粉彩占位封面
		images: { large: "", common: "", medium: "", small: "", grid: "" },
		volumes: 0,
		eps: entry.totalEp,
		collection_total: 0,
		score: entry.score,
		rank: 0,
		tags: entry.tags.map((name) => ({ name, count: 1, total_cont: 1 })),
		coverArt: { emoji: entry.emoji, gradient: entry.gradient },
	},
});

/** 本地兜底数据：默认按「在看 → 想看 → 看过」排序，和首页速览保持一致的观感 */
export const getLocalAnimeCollection = (): UserSubjectCollection[] => {
	const weight = (status: number) => (status === 3 ? 0 : status === 1 ? 1 : 2);
	return [...localAnimeCollection]
		.sort((a, b) => weight(a.status) - weight(b.status) || b.score - a.score)
		.map(localAnimeToCollection);
};
