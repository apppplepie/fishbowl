'use client';

import { useMemo } from 'react';
import type React from 'react';
import { useAppTheme } from '@/app/contexts/AppThemeContext';

/** coral 主题的按钮渐变，作为主题未就绪时的兜底 */
export const FALLBACK_ACCENT_GRADIENT =
  'linear-gradient(135deg, rgb(254, 240, 138), rgb(20, 184, 166), rgb(5, 150, 105))';

/** 从渐变字符串里取出颜色停止点 */
export function extractColors(gradient: string): string[] {
  return gradient.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g) ?? [];
}

/** 把任意 rgb/hex 颜色转成带透明度的 rgba，用于焦点环和阴影 */
export function withAlpha(color: string, alpha: number): string {
  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch[1].split(',').map((s) => s.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const hex = color.replace('#', '');
  if (hex.length === 3 || hex.length === 6) {
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

/**
 * 把当前鱼缸主题的强调色输出成 CSS 变量，挂在弹窗根节点上。
 * 主题换肤时弹窗会跟着变。
 */
export function useThemeAccentVars(): React.CSSProperties {
  const { currentFishbowlTheme } = useAppTheme();
  return useMemo(() => {
    const gradient = currentFishbowlTheme?.buttonGradient || FALLBACK_ACCENT_GRADIENT;
    const colors = extractColors(gradient);
    const accent = colors[1] || colors[0] || '#14b8a6';
    return {
      '--glogin-gradient': gradient,
      '--glogin-accent': accent,
      '--glogin-accent-soft': withAlpha(accent, 0.28),
    } as React.CSSProperties;
  }, [currentFishbowlTheme]);
}
