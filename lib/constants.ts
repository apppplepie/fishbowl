// lib/constants.ts

// Application constants
export const PLACEHOLDER_IMAGE_URL = '/static/covers/locked.svg';

/** Grid 基础配置（不参与 CardType） */
export const GRID_CONFIG = {
  GRID_AUTO_ROWS: 8, // px
  GRID_ROW_GAP: 8,   // px
  DEFAULT_COL_WIDTH: 180,
} as const;

/** 图片卡信息区高度（px），仅标题，与 getImageCardSpan、ImageCard 共用 */
export const IMAGE_CARD_META_HEIGHT = {
  TITLE: 48, // 标题区总高度（含内边距）
} as const;

/** 卡片高度配置（单位：rows） */
export const CARD_HEIGHTS = {
  TEXT_CARD: 11,
  DIARY_CARD: 9,
  CODE_CARD: 14,
  BOOK_CARD: 27,
  IMAGE_CARD: 'dynamic',
} as const;

/** 只包含真正的卡片类型 */
export type CardType = keyof typeof CARD_HEIGHTS;
