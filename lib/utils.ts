import { CARD_HEIGHTS, GRID_CONFIG, IMAGE_CARD_META_HEIGHT, type CardType } from './constants';

export interface ArticleLike {
  coverImage?: { aspect_ratio?: number | string } | null;
  cover_image?: { aspect_ratio?: number | string } | null;
  imageWidth?: number;
  imageHeight?: number;
  tags?: unknown;
}

/**
 * 尝试解析 aspect_ratio：
 * - 如果是数字字符串或数字直接用 parseFloat/Number
 * - 否则退回到 imageWidth/imageHeight
 * - 最后退回到默认
 */
function parseAspectRatio(
  media: { aspect_ratio?: number | string } | null,
  fallback?: number,
  article?: ArticleLike
): number {
  if (media?.aspect_ratio != null) {
    const v = typeof media.aspect_ratio === 'number' ? media.aspect_ratio : parseFloat(String(media.aspect_ratio));
    if (Number.isFinite(v) && v > 0) return v;
  }
  if (article?.imageWidth && article?.imageHeight && article.imageHeight > 0) {
    return article.imageWidth / article.imageHeight;
  }
  return fallback ?? 3 / 2;
}

/**
 * 计算动态图片卡片的 grid-row span
 */
export function getImageCardSpan(article: ArticleLike, columnWidth?: number): number {
  const media = article.coverImage ?? article.cover_image ?? null;
  const aspect = parseAspectRatio(media, 3 / 2, article);
  const colW = columnWidth && columnWidth > 0 ? columnWidth : GRID_CONFIG.DEFAULT_COL_WIDTH;
  const imageH = colW / aspect;

  const TITLE_AREA = IMAGE_CARD_META_HEIGHT.TITLE;

  const estimatedTotal = imageH + TITLE_AREA;
  const ROW_PX = GRID_CONFIG.GRID_AUTO_ROWS;
  const GAP_PX = GRID_CONFIG.GRID_ROW_GAP;

  // N * ROW + (N - 1) * GAP >= estimatedTotal
  // => N >= (estimatedTotal + GAP) / (ROW + GAP)
  const span = Math.max(1, Math.ceil((estimatedTotal + GAP_PX) / (ROW_PX + GAP_PX)));
  return span;
}

/** get height (rows) or 'dynamic' */
export const getCardHeight = (cardType: CardType): number | 'dynamic' => {
  return CARD_HEIGHTS[cardType];
};

/** get card span */
export const getCardSpan = (cardType: CardType): number | 'dynamic' => {
  const h = getCardHeight(cardType);
  if (h === 'dynamic') return 'dynamic';
  if (typeof h === 'number' && Number.isFinite(h)) {
    return Math.max(1, Math.round(h));
  }
  return 'dynamic';
};

// 方便只从 utils 拿卡片相关：一并导出类型
export type { CardType } from './constants';
