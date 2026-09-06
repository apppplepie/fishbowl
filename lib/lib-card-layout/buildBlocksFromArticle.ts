/**
 * lib/lib-card-layout/buildBlocksFromArticle.ts
 * 后端：把文章转成显式 blocks[]（含 gap、pad），每块带 type、span 与必要数据。
 * 图片卡独立处理，不在此处。BLOCK_SPANS 统一从 constants 引入。
 */

import { BLOCK_SPANS } from './constants';
import { estimateTitleLines } from './estimateTitleLines';
import { estimateTagRows } from './estimateTagRows';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/** 拿不到真实列宽时按断点兜底（手机 2 列、平板 3 列、桌面 4 列的常见列宽） */
const FALLBACK_COL_WIDTH_PX: Record<Breakpoint, number> = {
  mobile: 164,
  tablet: 250,
  desktop: 310,
};

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
  author?: string;
  updatedAt?: string;
  publishedAt?: string;
  createdAt?: string;
};

export type BlockPad = { type: 'pad-top' | 'pad-bottom'; span: number };
export type BlockGap = { type: 'gap' };
/** lines：标题允许的行数，由 estimateTitleLines 按列宽估出来，前端照着 clamp */
export type BlockTitle = { type: 'title'; span: number; text: string; lines: number };
/** rows：标签排几行；visibleCount：前几个完整显示，其余用「+N」收尾 */
export type BlockTags = {
  type: 'tags';
  span: number;
  tags: string[];
  rows: number;
  visibleCount: number;
};
export type BlockExcerpt = { type: 'excerpt'; lines: number; span: number; text: string };
export type BlockDivider = { type: 'divider'; span: number };
/** author：手机端在同一行右侧显示作者，不额外占 span */
export type BlockDate = { type: 'date'; span: number; value: string; author?: string };

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
  bp: Breakpoint = 'desktop',
  columnWidth?: number
): { blocks: ArticleBlock[]; precomputedSpan: number } {
  const blocks: ArticleBlock[] = [];
  const isMobile = bp === 'mobile';

  const colW = columnWidth ?? FALLBACK_COL_WIDTH_PX[bp];
  // 标题按列宽估行数：窄列（手机、多列）下长标题会换行撑高，不再被一行 clamp 截掉
  const titleLines = estimateTitleLines(article.title, colW, 'article');

  blocks.push({ type: 'pad-top', span: BLOCK_SPANS.PAD_TOP });
  blocks.push({
    type: 'title',
    span: BLOCK_SPANS.TITLE * titleLines,
    text: article.title,
    lines: titleLines,
  });

  if (article.tags && article.tags.length > 0) {
    blocks.push({ type: 'gap' });
    // 标签按列宽排行：窄列（手机）下多排几行，把标签显示全，而不是只留一个 +N
    const { rows, visibleCount } = estimateTagRows(article.tags, colW, 'article');
    blocks.push({
      type: 'tags',
      // 行与行之间留一个 GAP，跟 card-blocks.css 的 row-gap 对齐
      span: rows * BLOCK_SPANS.TAGS + (rows - 1) * BLOCK_SPANS.GAP,
      tags: article.tags,
      rows,
      visibleCount,
    });
  }

  // 手机端不放简介：窄列里它会把标题挤没，标题 + 时间 + 标签 + 作者已经够用
  if (!isMobile && article.excerpt && article.excerpt.trim()) {
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
      // 作者和时间共用这一行，所以不需要额外的 span
      ...(isMobile && article.author ? { author: article.author } : {}),
    });
  }

  blocks.push({ type: 'pad-bottom', span: BLOCK_SPANS.PAD_BOTTOM });

  const precomputedSpan = blocks.reduce(
    (s, b) => s + (b.type === 'gap' ? BLOCK_SPANS.GAP : (b as { span?: number }).span ?? 0),
    0
  );

  return { blocks, precomputedSpan: Math.max(1, precomputedSpan) };
}
