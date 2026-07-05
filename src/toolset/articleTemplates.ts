export const ARTICLE_TEMPLATE_NAMES = [
  '轻感明快',
  '优雅几何',
  '简约基础',
  '涂鸦马克',
  '线条复古',
  '杂志先锋',
  '手帐书写',
  '黑白极简',
  '黄昏手稿',
  '素雅底纹',
  '拼接色块',
  '文艺清新',
  '灵感备忘',
  '清晰明朗',
  '逻辑结构',
  '理性现代',
  '平实叙事',
  '大图纯享',
  '交叉拓扑',
  '札记集尘',
] as const;

export const DEFAULT_ARTICLE_TEMPLATE_NAME = ARTICLE_TEMPLATE_NAMES[0];

export function formatArticleTemplateNames(): string {
  return ARTICLE_TEMPLATE_NAMES.join('、');
}
