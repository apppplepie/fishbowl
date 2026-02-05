/**
 * lib/card-layout/constants.ts
 * 1 span = 1 row = 8px；间距、留白、本体全部用 span 表达，不再用 row+gap 公式。
 *
 * 修改 EXCERPT_LINE 时需同步：app/components/cards/card-blocks.css 的 --excerpt-span-per-line 改为同值。
 */

export const ROW_HEIGHT_PX = 8;

/** 各区块占用的 span 数，全站统一；0 表示该块不出现 */
export const BLOCK_SPANS = {
  TITLE: 3,
  EXCERPT_LINE: 2, // 简介每行 span；改此处后同步 CSS 见上方注释
  DIVIDER: 1,
  DATE: 2,
  TAGS: 3,
  EMOJI_WEATHER: 3,
  CODE_BLOCK: 8,
  GAP: 1,
  PAD_TOP: 2,
  PAD_BOTTOM: 2,
} as const;

/** 区间块：相邻内容块之间的间隙，占用的 span 数（改此处即可全局生效） */
export const INTERVAL_BLOCK_SPAN = 1;

/** N span → N×8px（用于卡片内区块 height/minHeight） */
export function spanToHeightPx(span: number): number {
  if (span <= 0) return 0;
  return span * ROW_HEIGHT_PX;
}

export const DEFAULT_COL_WIDTH_PX = 180;
export const DEFAULT_IMAGE_HEIGHT_PX = 280;
