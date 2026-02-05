/**
 * lib/card-layout/constants.ts
 * 1 span = 1 row = 8px；间距、留白、本体全部用 span 表达，不再用 row+gap 公式。
 *
 * BLOCK_SPANS 作用于所有卡片类型：
 * - 文章卡（ArticleCard / ArticleCardBlocks）：buildBlocksFromArticle + card-blocks.css
 * - 图片卡（ImageCard）：masonry-server-utils IMAGE_PRESET（titleSpan） + card-blocks.css
 * - 日记卡（DiaryCard）：masonry-server-utils DIARY_PRESET（titleSpan、正文 excerptLines×EXCERPT_LINE、地点 EMOJI_WEATHER） + card-blocks.css
 * - 书籍卡（BookCard）：masonry-server-utils BOOK_PRESET（titleSpan、DATE、正文 EXCERPT_LINE） + card-blocks.css
 * - 代码卡（CodeCard）：masonry-server-utils CODE_PRESET（titleSpan、CODE_BLOCK） + card-blocks.css
 *
 * 修改本文件任意 BLOCK_SPANS、ROW_HEIGHT_PX、INTERVAL_BLOCK_SPAN 时，需同步修改
 * app/components/cards/card-blocks.css 的 :root 中对应 CSS 变量（见该文件顶部注释）。
 */

export const ROW_HEIGHT_PX = 8;

/** 各区块占用的 span 数，全站统一；0 表示该块不出现。标题/简介/分割线/日期/标签/地点/代码块等均由此控制。 */
export const BLOCK_SPANS = {
  TITLE: 3,           /* 标题区：Article / Image / Diary / Book / Code 共用 */
  EXCERPT_LINE: 3,    /* 简介/正文每行 span；改此处后同步 card-blocks.css --excerpt-span-per-line */
  DIVIDER: 1,
  DATE: 2,
  TAGS: 3,
  AUTHOR: 3,           /* 书籍卡作者行 */
  EMOJI_WEATHER: 3,   /* 日记地点块等 */
  CODE_BLOCK: 15,
  GAP: 1,
  PAD_TOP: 3,
  PAD_BOTTOM: 2,
} as const;

/** 区间块：相邻内容块之间的间隙，占用的 span 数（改此处即可全局生效） */
export const INTERVAL_BLOCK_SPAN = 1;

/** 每个卡片下方多占 1 span 作为卡片间隔，仅影响网格行高，卡片内部不渲染 */
export const CARD_BOTTOM_GAP_SPAN = 1;

/** N span → N×8px（用于卡片内区块 height/minHeight） */
export function spanToHeightPx(span: number): number {
  if (span <= 0) return 0;
  return span * ROW_HEIGHT_PX;
}

export const DEFAULT_COL_WIDTH_PX = 180;
export const DEFAULT_IMAGE_HEIGHT_PX = 280;
