export const BLOG_CATEGORIES = [
	{
		slug: 'ai-workflow',
		label: 'AI Workflow',
		description: 'AI 작업 환경, 운영 규칙, 자동화 시행착오를 정리합니다.',
	},
	{
		slug: 'secondbrain',
		label: 'SecondBrain',
		description: '사용자 의도 해석, 기억 구조, 그래프 기반 AI 운영 방식을 정리합니다.',
	},
] as const;

export type BlogCategorySlug = (typeof BLOG_CATEGORIES)[number]['slug'];

export const BLOG_CATEGORY_SLUGS = BLOG_CATEGORIES.map((category) => category.slug) as [
	BlogCategorySlug,
	...BlogCategorySlug[],
];

export function getBlogCategory(slug: BlogCategorySlug) {
	return BLOG_CATEGORIES.find((category) => category.slug === slug) ?? BLOG_CATEGORIES[0];
}
