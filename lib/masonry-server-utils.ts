/**
 * Masonry span / layout：服务端预算 span；非文章卡用 preset + layout 算 span。
 * 文章卡用 blocks + precomputedSpan（lib-card-layout buildBlocksFromArticle）。
 */
import {
  DEFAULT_COL_WIDTH_PX,
  ROW_HEIGHT_PX,
  BLOCK_SPANS,
  INTERVAL_BLOCK_SPAN,
  DEFAULT_IMAGE_HEIGHT_PX,
  CARD_BOTTOM_GAP_SPAN,
} from '@/lib/lib-card-layout/constants';
import { computeSpanFromBlocks } from '@/lib/lib-card-layout';

export type LayoutHint = {
  titleSpan?: number;
  excerptLines?: number;
  dividerSpan?: number;
  dateSpan?: number;
  tagsSpan?: number;
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
  const thresholds = [15, 30, 90];
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
  const emojiSpan = layout.emojiWeatherSpan ?? 0;
  const codeSpan = layout.codeBlockSpan ?? 0;
  const blockCount =
    (imageSpan > 0 ? 1 : 0) +
    (titleSpan > 0 ? 1 : 0) +
    (excerptSpan > 0 ? 1 : 0) +
    (dividerSpan > 0 ? 1 : 0) +
    (dateSpan > 0 ? 1 : 0) +
    (tagsSpan > 0 ? 1 : 0) +
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
    emojiSpan +
    codeSpan +
    internalGapSpan +
    topPad +
    bottomPad;
  return Math.max(1, span);
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
    return { ...IMAGE_PRESET, ...hint, imageHeightPx };
  }
  if (article.type === 'code' || (article as any).codePreview) {
    return { ...CODE_PRESET, ...hint };
  }
  if (article.type === 'text' || article.type === 'article' || (article as any).content) {
    const layout = { ...ARTICLE_PRESET, ...hint };
    const hasDate =
      (article as any).updated_at != null ||
      (article as any).published_at != null ||
      (article as any).created_at != null;
    if (hasDate && (layout.dateSpan ?? 0) === 0) layout.dateSpan = BLOCK_SPANS.DATE;
    return layout;
  }
  if (article.type === 'diary' || (article as any).excerpt) {
    const layout = { ...DIARY_PRESET, ...hint };
    // 日记 3 span 只给地点用；有地点才占这块，没有就不渲染
    const hasLocation = !!(article as any).location;
    if (!hasLocation) layout.emojiWeatherSpan = 0;
    return layout;
  }
  if (article.type === 'book' || (article as any).coverImage) {
    return { ...BOOK_PRESET, ...hint };
  }
  return { ...ARTICLE_PRESET, ...hint };
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

/** 服务端计算 span 用，仅内容高度（不含 CARD_BOTTOM_GAP_SPAN），存为 precomputedSpan */
export function calculateServerSpan(article: ArticleLike): number {
  return getContentSpanForCard(article, DEFAULT_COL_WIDTH_PX);
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

export function calculateGalleryCoverSpan(
  article: Parameters<typeof getAspectRatioFromArticle>[0]
): number {
  const ar = getAspectRatioFromArticle(article);
  const heightPx = DEFAULT_COL_WIDTH_PX / (Number.isFinite(ar) && ar > 0 ? ar : 3 / 2);
  return Math.max(1, Math.ceil(heightPx / ROW_HEIGHT_PX));
}
