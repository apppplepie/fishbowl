// Application constants
export const PLACEHOLDER_IMAGE_URL = '/static/covers/locked.svg';

// Masonry Grid Configuration - 固定高度卡片配置
// 基于 grid-auto-rows: 8px, row-gap: 8px 的网格系统
export const CARD_HEIGHT_CONFIG = {
  // 这里的数值明确为 rows（行数）
  TEXT_CARD: 12,      // 12 rows -> 12 * GRID_AUTO_ROWS px
  DIARY_CARD: 9,     // 9 rows -> 9 * GRID_AUTO_ROWS px
  CODE_CARD: 14,      // 14 rows -> 14 * GRID_AUTO_ROWS px
  BOOK_CARD: 27,      // 27 rows -> 27 * GRID_AUTO_ROWS px

  // 动态高度卡片类型（保持aspect-ratio）
  IMAGE_CARD: 'dynamic', // 图片卡片保持动态高度

  // Grid基础配置
  GRID_AUTO_ROWS: 8,  // px
  GRID_ROW_GAP: 8,    // px
} as const;

// 卡片类型映射
export type CardType = keyof typeof CARD_HEIGHT_CONFIG;

// 获取卡片高度的辅助函数
export const getCardHeight = (cardType: CardType): number | 'dynamic' => {
  return CARD_HEIGHT_CONFIG[cardType];
};

// 修正后的 getCardSpan：
// - 如果配置的是 rows（number），直接返回该 rows（span）
// - 如果是 'dynamic'，返回 'dynamic'
export const getCardSpan = (cardType: CardType): number | 'dynamic' => {
  const heightOrDynamic = getCardHeight(cardType);
  if (heightOrDynamic === 'dynamic') return 'dynamic';

  // 此处 heightOrDynamic 是 rows（整数），直接作为 span 返回
  if (typeof heightOrDynamic === 'number' && Number.isFinite(heightOrDynamic)) {
    return Math.max(1, Math.floor(heightOrDynamic)); // 确保为正整数
  }

  return 'dynamic';
};