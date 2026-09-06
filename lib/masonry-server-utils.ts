/**
 * Masonry span / layout：服务端预算 span；非文章卡用 preset + layout 算 span。
 * 文章卡用 blocks + precomputedSpan（lib-card-layout buildBlocksFromArticle）。
 *
 * 容器/列宽：与前端一致，用屏幕宽度推算容器宽度，再算列数、列宽；请求头 X-Container-Width 传容器宽。
 */
import {
  DEFAULT_COL_WIDTH_PX,
  ROW_HEIGHT_PX,
  BLOCK_SPANS,
  INTERVAL_BLOCK_SPAN,
  DEFAULT_IMAGE_HEIGHT_PX,
  CARD_BOTTOM_GAP_SPAN,
} from '@/lib/lib-card-layout/constants';
import {
  computeSpanFromBlocks,
  estimateTitleLines,
  type TitleCardKind,
} from '@/lib/lib-card-layout';

/** 屏幕宽度推算容器宽度时的左右占位（与前端 padding 一致） */
export const CONTAINER_WIDTH_OFFSET_PX = 48;
/** 容器最大宽度（与前端 maxWidth 一致） */
export const CONTAINER_MAX_WIDTH_PX = 1400;

/** 由屏幕宽度推算父容器宽度（前端同源逻辑） */
export function getContainerWidthFromScreenWidth(screenWidth: number): number {
  const w = Number(screenWidth);
  if (!Number.isFinite(w) || w <= 0) return CONTAINER_MAX_WIDTH_PX;
  return Math.min(CONTAINER_MAX_WIDTH_PX, Math.max(0, w - CONTAINER_WIDTH_OFFSET_PX));
}

/** 由容器宽度算列数（与 archive/bookcase 断点一致：1200→4，800→3，否则 2，最大 4） */
export function getColumnCountFromContainerWidth(containerWidth: number): number {
  const w = Number(containerWidth);
  if (!Number.isFinite(w) || w <= 0) return 2;
  if (w >= 1200) return 4;
  if (w >= 800) return 3;
  return 2;
}

/** 由容器宽度算列宽（与前端 columnWidth = containerWidth / cappedColumns 一致） */
export function getColumnWidthFromContainerWidth(containerWidth: number): number {
  const w = Number(containerWidth);
  if (!Number.isFinite(w) || w <= 0) return DEFAULT_COL_WIDTH_PX;
  const cols = Math.min(getColumnCountFromContainerWidth(w), 4);
  return w / cols;
}

export type LayoutHint = {
  titleSpan?: number;
  /** 标题允许的行数；卡片据此设 --title-lines，titleSpan 必须是 TITLE × 它 */
  titleLines?: number;
  excerptLines?: number;
  dividerSpan?: number;
  dateSpan?: number;
  tagsSpan?: number;
  authorSpan?: number;
  emojiWeatherSpan?: number;
  codeBlockSpan?: number;
  imageHeightPx?: number;
  topPaddingSpan?: number;
  bottomPaddingSpan?: number;
  spanOverride?: number | null;
};

export type ArticleLike = {
  type?: string;
  layoutHint?: LayoutHint | null;
  precomputedSpan?: number | null;
  blocks?: Array<{ type: string; span?: number }>;
  coverImage?: { aspect_ratio?: number | string; width?: number; height?: number } | null;
  cover_image?: { aspect_ratio?: number | string; width?: number; height?: number } | null;
  imageWidth?: number;
  imageHeight?: number;
  [k: string]: unknown;
};

/** 按正文字符数得到行数档位（desktop），用于日记正文 span；上限 4 行 */
export function charCountToLinesForDiary(charCount: number, maxLines = 4): number {
  const thresholds = [10, 20, 50];
  for (let i = 0; i < thresholds.length; i++) {
    if (charCount <= thresholds[i]) return Math.min(i + 1, maxLines);
  }
  return maxLines;
}

function parseAspectRatio(article: ArticleLike, fallback: number): number {
  const media = article.coverImage ?? article.cover_image ?? null;
  if (media?.aspect_ratio != null) {
    const v =
      typeof media.aspect_ratio === 'number' ? media.aspect_ratio : parseFloat(String(media.aspect_ratio));
    if (Number.isFinite(v) && v > 0) return v;
  }
  if (article.imageWidth != null && article.imageHeight != null && Number(article.imageHeight) > 0) {
    return Number(article.imageWidth) / Number(article.imageHeight);
  }
  return fallback;
}

const IMAGE_PRESET: LayoutHint = {
  titleSpan: BLOCK_SPANS.TITLE,
  excerptLines: 0,
  dividerSpan: 0,
  dateSpan: 0,
  tagsSpan: 0,
  emojiWeatherSpan: 0,
  codeBlockSpan: 0,
  imageHeightPx: DEFAULT_IMAGE_HEIGHT_PX,
  topPaddingSpan: 0,
  bottomPaddingSpan: BLOCK_SPANS.PAD_BOTTOM,
};
const ARTICLE_PRESET: LayoutHint = {
  titleSpan: BLOCK_SPANS.TITLE,
  excerptLines: 1,
  dividerSpan: BLOCK_SPANS.DIVIDER,
  dateSpan: BLOCK_SPANS.DATE,
  tagsSpan: BLOCK_SPANS.TAGS,
  emojiWeatherSpan: 0,
  codeBlockSpan: 0,
  imageHeightPx: 0,
  topPaddingSpan: BLOCK_SPANS.PAD_TOP,
  bottomPaddingSpan: BLOCK_SPANS.PAD_BOTTOM,
};
const DIARY_PRESET: LayoutHint = {
  titleSpan: BLOCK_SPANS.TITLE,
  excerptLines: 1,
  dividerSpan: 0,
  dateSpan: 0,
  tagsSpan: 0,
  emojiWeatherSpan: BLOCK_SPANS.EMOJI_WEATHER,
  codeBlockSpan: 0,
  imageHeightPx: 0,
  topPaddingSpan: BLOCK_SPANS.PAD_TOP,
  bottomPaddingSpan: BLOCK_SPANS.PAD_BOTTOM,
};
const BOOK_PRESET: LayoutHint = {
  titleSpan: BLOCK_SPANS.TITLE,
  excerptLines: 1,
  dividerSpan: 0,
  dateSpan: BLOCK_SPANS.DATE,
  tagsSpan: 0,
  authorSpan: BLOCK_SPANS.AUTHOR,
  emojiWeatherSpan: 0,
  codeBlockSpan: 0,
  imageHeightPx: 280,
  topPaddingSpan: BLOCK_SPANS.PAD_TOP,
  bottomPaddingSpan: BLOCK_SPANS.PAD_BOTTOM,
};
const CODE_PRESET: LayoutHint = {
  titleSpan: BLOCK_SPANS.TITLE,
  excerptLines: 0,
  dividerSpan: 0,
  dateSpan: 0,
  tagsSpan: 0,
  emojiWeatherSpan: 0,
  codeBlockSpan: BLOCK_SPANS.CODE_BLOCK,
  imageHeightPx: 0,
  topPaddingSpan: BLOCK_SPANS.PAD_TOP,
  bottomPaddingSpan: 0,
};

function computeSpanFromLayout(layout: LayoutHint): number {
  if (layout.spanOverride != null && Number.isFinite(layout.spanOverride) && layout.spanOverride > 0) {
    return Math.max(1, Math.floor(layout.spanOverride));
  }
  let imageSpan = 0;
  if (layout.imageHeightPx != null && layout.imageHeightPx > 0) {
    imageSpan = Math.ceil(layout.imageHeightPx / ROW_HEIGHT_PX);
  }
  const titleSpan = layout.titleSpan ?? 0;
  const excerptSpan = (layout.excerptLines ?? 0) * BLOCK_SPANS.EXCERPT_LINE;
  const dividerSpan = layout.dividerSpan ?? 0;
  const dateSpan = layout.dateSpan ?? 0;
  const tagsSpan = layout.tagsSpan ?? 0;
  const authorSpan = layout.authorSpan ?? 0;
  const emojiSpan = layout.emojiWeatherSpan ?? 0;
  const codeSpan = layout.codeBlockSpan ?? 0;
  const blockCount =
    (imageSpan > 0 ? 1 : 0) +
    (titleSpan > 0 ? 1 : 0) +
    (excerptSpan > 0 ? 1 : 0) +
    (dividerSpan > 0 ? 1 : 0) +
    (dateSpan > 0 ? 1 : 0) +
    (tagsSpan > 0 ? 1 : 0) +
    (authorSpan > 0 ? 1 : 0) +
    (emojiSpan > 0 ? 1 : 0) +
    (codeSpan > 0 ? 1 : 0);
  const internalGapSpan = Math.max(0, blockCount - 1) * INTERVAL_BLOCK_SPAN;
  const topPad = layout.topPaddingSpan ?? 0;
  const bottomPad = layout.bottomPaddingSpan ?? 0;
  let span =
    imageSpan +
    titleSpan +
    excerptSpan +
    dividerSpan +
    dateSpan +
    tagsSpan +
    authorSpan +
    emojiSpan +
    codeSpan +
    internalGapSpan +
    topPad +
    bottomPad;
  return Math.max(1, span);
}

/**
 * 标题行数：优先用卡片自带的 layoutHint.titleLines（服务端按请求头列宽算好下发的），
 * 拿不到才按当前列宽现估。span 和 clamp 必须来自同一个值，所以只在这一处决定。
 */
export function getTitleLinesForCard(
  article: ArticleLike,
  columnWidth?: number,
  kind: TitleCardKind = 'article'
): number {
  const hinted = article.layoutHint?.titleLines;
  if (hinted != null && Number.isFinite(hinted) && hinted > 0) return Math.floor(hinted);
  return estimateTitleLines((article as any).title, columnWidth, kind);
}

/** 把标题行数写进 layout：titleLines 给卡片 clamp，titleSpan 给网格算高 */
function withTitleLines(
  layout: LayoutHint,
  article: ArticleLike,
  columnWidth: number,
  kind: TitleCardKind
): LayoutHint {
  // 标题块本来就不占位的卡（如代码卡的 titleSpan 被显式置 0）不掺和
  if ((layout.titleSpan ?? 0) === 0) return layout;
  const titleLines = getTitleLinesForCard(article, columnWidth, kind);
  layout.titleLines = titleLines;
  if (article.layoutHint?.titleSpan == null) {
    layout.titleSpan = BLOCK_SPANS.TITLE * titleLines;
  }
  return layout;
}

/** 非文章卡：preset + layoutHint → LayoutHint */
export function getLayoutForCard(
  article: ArticleLike,
  columnWidth?: number
): LayoutHint {
  const hint = article.layoutHint ?? {};
  const colW = columnWidth && columnWidth > 0 ? columnWidth : DEFAULT_COL_WIDTH_PX;

  if (article.type === 'image' || article.type === 'drawing') {
    const aspect = parseAspectRatio(article, 3 / 2);
    const imageHeightPx = hint.imageHeightPx ?? colW / aspect;
    return withTitleLines({ ...IMAGE_PRESET, ...hint, imageHeightPx }, article, colW, 'image');
  }
  if (article.type === 'code' || (article as any).codePreview) {
    return withTitleLines({ ...CODE_PRESET, ...hint }, article, colW, 'code');
  }
  if (article.type === 'text' || article.type === 'article' || (article as any).content) {
    const layout = { ...ARTICLE_PRESET, ...hint };
    const hasDate =
      (article as any).updated_at != null ||
      (article as any).published_at != null ||
      (article as any).created_at != null;
    if (hasDate && (layout.dateSpan ?? 0) === 0) layout.dateSpan = BLOCK_SPANS.DATE;
    return withTitleLines(layout, article, colW, 'article');
  }
  if (article.type === 'diary' || (article as any).excerpt) {
    const layout = { ...DIARY_PRESET, ...hint };
    // 日记 3 span 只给地点用；有地点才占这块，没有就不渲染
    const hasLocation = !!(article as any).location;
    if (!hasLocation) layout.emojiWeatherSpan = 0;
    return withTitleLines(layout, article, colW, 'diary');
  }
  if (article.type === 'book' || (article as any).coverImage) {
    return withTitleLines({ ...BOOK_PRESET, ...hint }, article, colW, 'book');
  }
  return withTitleLines({ ...ARTICLE_PRESET, ...hint }, article, colW, 'article');
}

/** 仅内容 span（不含卡片底部间隔），供服务端存 precomputedSpan 用 */
function getContentSpanForCard(article: ArticleLike, columnWidth?: number): number {
  if (article.precomputedSpan != null && Number.isFinite(article.precomputedSpan)) {
    return Math.max(1, Math.floor(article.precomputedSpan));
  }
  if (article.blocks && article.blocks.length > 0) {
    return computeSpanFromBlocks(article.blocks);
  }
  const layout = getLayoutForCard(article, columnWidth);
  if (layout.spanOverride != null && Number.isFinite(layout.spanOverride) && layout.spanOverride > 0) {
    return Math.max(1, Math.floor(layout.spanOverride));
  }
  return computeSpanFromLayout(layout);
}

/** 任意卡：precomputedSpan / blocks 优先，否则 preset+layout 计算；返回值含卡片底部间隔 CARD_BOTTOM_GAP_SPAN（仅占网格行，卡片内不渲染） */
export function getSpanForCard(article: ArticleLike, columnWidth?: number): number {
  return getContentSpanForCard(article, columnWidth) + CARD_BOTTOM_GAP_SPAN;
}

/** 服务端计算 span 用，仅内容高度（不含 CARD_BOTTOM_GAP_SPAN），存为 precomputedSpan；传入 columnWidth 时替代默认 180px */
export function calculateServerSpan(article: ArticleLike, columnWidth?: number): number {
  const colW = columnWidth != null && columnWidth > 0 ? columnWidth : DEFAULT_COL_WIDTH_PX;
  return getContentSpanForCard(article, colW);
}

export function getAspectRatioFromArticle(article: {
  coverImage?: { aspect_ratio?: number | string; width?: number; height?: number } | null;
  cover_image?: { aspect_ratio?: number | string; width?: number; height?: number } | null;
}): number {
  const media = article.coverImage ?? article.cover_image ?? null;
  if (media?.aspect_ratio != null) {
    const v = typeof media.aspect_ratio === 'number' ? media.aspect_ratio : parseFloat(String(media.aspect_ratio));
    if (Number.isFinite(v) && v > 0) return v;
  }
  if (media?.width && media?.height && Number(media.height) > 0) {
    return Number(media.width) / Number(media.height);
  }
  return 3 / 2;
}

/** 画廊封面卡 span；传入 columnWidth 时替代默认 180px，与前端列宽一致 */
export function calculateGalleryCoverSpan(
  article: Parameters<typeof getAspectRatioFromArticle>[0],
  columnWidth?: number
): number {
  const colW = columnWidth != null && columnWidth > 0 ? columnWidth : DEFAULT_COL_WIDTH_PX;
  const ar = getAspectRatioFromArticle(article);
  const heightPx = colW / (Number.isFinite(ar) && ar > 0 ? ar : 3 / 2);
  return Math.max(1, Math.ceil(heightPx / ROW_HEIGHT_PX));
}
