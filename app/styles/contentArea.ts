/**
 * 文章/书籍主题内容区共享样式
 * 用于：文章页(article [id])、书籍页(book [id])、发布文章、发布章节
 */

import type { CSSProperties } from 'react';

/** 主题内容区最大宽度（与文章页一致；桌面端略宽以缩小两侧页边距） */
export const CONTENT_AREA_MAX_WIDTH = 1000;

/**
 * 主题内容区外层容器样式（宽度、居中）
 */
export function getContentAreaWrapperStyle(overrides?: CSSProperties): CSSProperties {
  return {
    width: '100%',
    maxWidth: CONTENT_AREA_MAX_WIDTH,
    margin: '0 auto',
    padding: '0',
    boxSizing: 'border-box',
    ...overrides,
  };
}

/**
 * 主题内容卡片样式（白底、圆角、阴影、内边距）
 * 以文章页为基准，书籍页、发布页统一跟随
 */
export function getContentCardStyle(
  isMobile: boolean,
  overrides?: CSSProperties
): CSSProperties {
  return {
    width: '100%',
    minHeight: '50vh',
    padding: isMobile ? '20px' : '40px',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(8px)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    boxSizing: 'border-box',
    marginBottom: '40px',
    ...overrides,
  };
}

/** 内容卡片内正文排版（行高、字号、颜色） */
export const contentCardTypography: CSSProperties = {
  lineHeight: '1.8',
  fontSize: '16px',
  color: '#333',
};

/** 内容卡片圆角（供 Card 等组件复用） */
export const contentCardBorderRadius = '12px';

/** 内容卡片阴影（供 Card 等组件复用） */
export const contentCardBoxShadow = '0 4px 20px rgba(0,0,0,0.08)';
