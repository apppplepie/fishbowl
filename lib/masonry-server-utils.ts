import { CARD_HEIGHTS, GRID_CONFIG, IMAGE_CARD_META_HEIGHT, type CardType } from './constants';

/** 与前端 getImageCardSpan 一致：用 DEFAULT_COL_WIDTH 估算列宽，保证 precomputedSpan 与前端无 columnWidth 时一致 */
const ESTIMATED_COL_WIDTH = GRID_CONFIG.DEFAULT_COL_WIDTH;

/** API 文章 type 与 CARD_HEIGHTS 的映射 */
const TYPE_TO_CARD: Record<string, CardType> = {
  text: 'TEXT_CARD',
  article: 'TEXT_CARD',
  code: 'CODE_CARD',
  diary: 'DIARY_CARD',
  book: 'BOOK_CARD',
};

/**
 * 服务端预计算 masonry 项的 grid-row span
 * 与 getImageCardSpan 逻辑一致，使用固定列宽估算，避免前端测量
 */
export function calculateServerSpan(
  aspectRatio: number,
  type: string,
  tagsCount = 0
): number {
  const cardType = TYPE_TO_CARD[type];
  if (cardType && cardType !== 'IMAGE_CARD') {
    const h = CARD_HEIGHTS[cardType];
    if (typeof h === 'number' && Number.isFinite(h)) {
      return Math.max(1, Math.round(h));
    }
  }

  // image / drawing 或未知类型按图片卡公式
  if (type === 'image' || type === 'drawing') {
    const imageH = ESTIMATED_COL_WIDTH / (Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 3 / 2);
    const metaHeight =
      IMAGE_CARD_META_HEIGHT.TITLE +
      IMAGE_CARD_META_HEIGHT.PADDING +
      (tagsCount > 0 ? IMAGE_CARD_META_HEIGHT.TAGS : 0);
    const estimatedTotal = imageH + metaHeight;
    const ROW_PX = GRID_CONFIG.GRID_AUTO_ROWS;
    const GAP_PX = GRID_CONFIG.GRID_ROW_GAP;
    return Math.max(1, Math.ceil((estimatedTotal + GAP_PX) / (ROW_PX + GAP_PX)));
  }

  return 10;
}

/** 从文章对象解析 aspect_ratio（供服务端/API 计算 precomputedSpan） */
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
