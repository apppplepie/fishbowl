/**
 * lib/lib-card-layout/buildBlocksFromArticle.ts
 * 后端：把文章转成显式 blocks[]（含 gap、pad），每块带 type、span 与必要数据。
 * 图片卡独立处理，不在此处。BLOCK_SPANS 统一从 constants 引入。
 */

import { BLOCK_SPANS } from './constants';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const THRESHOLDS: Record<Breakpoint, number[]> = {
  mobile: [12, 24, 48],
  tablet: [14, 28, 72],
  desktop: [15, 30, 90],
};

/** 按字符数得到行数档位（desktop 等），上限 4 行 */
function charCountToLines(chars: number, bp: Breakpoint = 'desktop'): number {
  const t = THRESHOLDS[bp];
  for (let i = 0; i < t.length; i++) if (chars <= t[i]) return i + 1;
  return 4;
}

export type ArticleForBlocks = {
  id: string;
  title: string;
  excerpt?: string;
  tags?: string[];
  updatedAt?: string;
  publishedAt?: string;
  createdAt?: string;
};

export type BlockPad = { type: 'pad-top' | 'pad-bottom'; span: number };
export type BlockGap = { type: 'gap' };
export type BlockTitle = { type: 'title'; span: number; text: string };
export type BlockTags = { type: 'tags'; span: number; tags: string[] };
export type BlockExcerpt = { type: 'excerpt'; lines: number; span: number; text: string };
export type BlockDivider = { type: 'divider'; span: number };
export type BlockDate = { type: 'date'; span: number; value: string };

export type ArticleBlock =
  | BlockPad
  | BlockGap
  | BlockTitle
  | BlockTags
  | BlockExcerpt
  | BlockDivider
  | BlockDate;

export function buildBlocksFromArticle(
  article: ArticleForBlocks,
  bp: Breakpoint = 'desktop'
): { blocks: ArticleBlock[]; precomputedSpan: number } {
  const blocks: ArticleBlock[] = [];

  blocks.push({ type: 'pad-top', span: BLOCK_SPANS.PAD_TOP });
  blocks.push({ type: 'title', span: BLOCK_SPANS.TITLE, text: article.title });

  if (article.tags && article.tags.length > 0) {
    blocks.push({ type: 'gap' });
    blocks.push({ type: 'tags', span: BLOCK_SPANS.TAGS, tags: article.tags });
  }

  if (article.excerpt && article.excerpt.trim()) {
    blocks.push({ type: 'gap' });
    const chars = article.excerpt.trim().length;
    const lines = Math.min(4, charCountToLines(chars, bp));
    blocks.push({
      type: 'excerpt',
      lines,
      span: lines * BLOCK_SPANS.EXCERPT_LINE,
      text: article.excerpt,
    });
  }

  const hasDate = !!(article.updatedAt || article.publishedAt || article.createdAt);
  if (hasDate) {
    blocks.push({ type: 'gap' });
    blocks.push({ type: 'divider', span: BLOCK_SPANS.DIVIDER });
    blocks.push({ type: 'gap' });
    blocks.push({
      type: 'date',
      span: BLOCK_SPANS.DATE,
      value: article.updatedAt || article.publishedAt || article.createdAt!,
    });
  }

  blocks.push({ type: 'pad-bottom', span: BLOCK_SPANS.PAD_BOTTOM });

  const precomputedSpan = blocks.reduce(
    (s, b) => s + (b.type === 'gap' ? BLOCK_SPANS.GAP : (b as { span?: number }).span ?? 0),
    0
  );

  return { blocks, precomputedSpan: Math.max(1, precomputedSpan) };
}
