import { RGBColor } from '../types/garden';

// ============================================================================
// 颜色转换工具
// 从 app/page.tsx 提取，添加缓存优化
// ============================================================================

/**
 * Tailwind 颜色映射表（常用颜色）
 */
const TAILWIND_COLOR_MAP: Record<string, string> = {
  // Orange
  'orange-50': '#fff7ed',
  'orange-100': '#ffedd5',
  'orange-200': '#fed7aa',
  'orange-300': '#fdba74',
  'orange-400': '#fb923c',
  'orange-500': '#f97316',
  
  // Rose
  'rose-50': '#fff1f2',
  'rose-100': '#ffe4e6',
  'rose-200': '#fecdd3',
  'rose-300': '#fda4af',
  
  // Indigo
  'indigo-50': '#eef2ff',
  'indigo-100': '#e0e7ff',
  'indigo-200': '#c7d2fe',
  'indigo-300': '#a5b4fc',
  
  // Teal
  'teal-50': '#f0fdfa',
  'teal-100': '#ccfbf1',
  'teal-200': '#99f6e4',
  'teal-300': '#5eead4',
  'teal-400': '#2dd4bf',
  'teal-500': '#14b8a6',
  
  // Emerald
  'emerald-50': '#ecfdf5',
  'emerald-100': '#d1fae5',
  'emerald-200': '#a7f3d0',
  'emerald-300': '#6ee7b7',
  
  // Pink
  'pink-50': '#fdf2f8',
  'pink-100': '#fce7f3',
  'pink-200': '#fbcfe8',
  
  // Purple
  'purple-50': '#faf5ff',
  'purple-100': '#f3e8ff',
  'purple-200': '#e9d5ff',
  'purple-300': '#d8b4fe',
  
  // Violet
  'violet-50': '#f5f3ff',
  'violet-100': '#ede9fe',
  'violet-200': '#ddd6fe',
  'violet-300': '#c4b5fd',
  
  // Red
  'red-50': '#fef2f2',
  'red-100': '#fee2e2',
  'red-200': '#fecaca',
  
  // Yellow
  'yellow-50': '#fefce8',
  'yellow-100': '#fef9c3',
  'yellow-200': '#fef08a',
  
  // Amber
  'amber-50': '#fffbeb',
  'amber-100': '#fef3c7',
  'amber-200': '#fde68a',
  
  // Lime
  'lime-50': '#f7fee7',
  'lime-100': '#ecfccb',
  'lime-200': '#d9f99d',
  
  // Green
  'green-50': '#f0fdf4',
  'green-100': '#dcfce7',
  'green-200': '#bbf7d0',
  
  // Cyan
  'cyan-50': '#ecfeff',
  'cyan-100': '#cffafe',
  'cyan-200': '#a5f3fc',
  'cyan-400': '#22d3ee',
  'cyan-500': '#06b6d4',
  
  // Blue
  'blue-50': '#eff6ff',
  'blue-100': '#dbeafe',
  'blue-200': '#bfdbfe',
  'blue-600': '#2563eb',
  
  // Sky
  'sky-50': '#f0f9ff',
  'sky-100': '#e0f2fe',
  'sky-200': '#bae6fd',
  'sky-300': '#7dd3fc',
  
  // Slate
  'slate-50': '#f8fafc',
  'slate-900': '#0f172a',
  'slate-950': '#020617',
  
  // Fuchsia
  'fuchsia-900': '#701a75',
  'fuchsia-950': '#4a044e',
  
  // Stone
  'stone-100': '#f5f5f4',
  
  // Gray
  'gray-50': '#f9fafb',
  'gray-100': '#f3f4f6',
  'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db',
  'gray-400': '#9ca3af',
  'gray-500': '#6b7280',
  'gray-700': '#374151',
  
  // Black
  'black': '#000000',
};

/**
 * 缓存：Tailwind 类名 -> CSS 渐变字符串
 */
const gradientCache = new Map<string, string>();

/**
 * 解析 Hex 颜色为 RGB 对象
 * @param hex Hex 颜色字符串（如 #ffffff）
 * @returns RGB 颜色对象
 */
export function parseHexColor(hex: string): RGBColor {
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  };
}

/**
 * RGB 转 Hex 颜色
 * @param rgb RGB 颜色对象
 * @returns Hex 颜色字符串
 */
export function rgbToHex(rgb: RGBColor): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * 线性插值两个颜色
 * @param start 起始颜色（Hex）
 * @param end 结束颜色（Hex）
 * @param t 插值比例 (0-1)
 * @returns 插值后的 RGB 颜色字符串
 */
export function lerpColor(start: string, end: string, t: number): string {
  t = Math.max(0, Math.min(1, t));
  
  const s = parseHexColor(start);
  const e = parseHexColor(end);
  
  const r = Math.round(s.r + (e.r - s.r) * t);
  const g = Math.round(s.g + (e.g - s.g) * t);
  const b = Math.round(s.b + (e.b - s.b) * t);
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 将 Tailwind 渐变类名转换为 CSS 渐变字符串
 * @param tailwindClass Tailwind 类名（如 "bg-gradient-to-b from-orange-50 to-rose-200"）
 * @returns CSS 渐变字符串
 * 
 * @example
 * tailwindToCSS('bg-gradient-to-b from-orange-50 to-rose-200')
 * // => 'linear-gradient(to bottom, #fff7ed 0%, #fecdd3 100%)'
 */
export function tailwindToCSS(tailwindClass: string): string {
  // 检查缓存
  if (gradientCache.has(tailwindClass)) {
    return gradientCache.get(tailwindClass)!;
  }

  // 解析 Tailwind 类名
  const fromMatch = tailwindClass.match(/from-(\S+)/);
  const viaMatch = tailwindClass.match(/via-(\S+)/);
  const toMatch = tailwindClass.match(/to-(\S+)/);

  const fromColor = fromMatch ? TAILWIND_COLOR_MAP[fromMatch[1]] || '#ffffff' : '#ffffff';
  const toColor = toMatch ? TAILWIND_COLOR_MAP[toMatch[1]] || '#ffffff' : '#ffffff';

  let result: string;

  if (viaMatch) {
    const viaColor = TAILWIND_COLOR_MAP[viaMatch[1]] || '#ffffff';
    result = `linear-gradient(to bottom, ${fromColor} 0%, ${viaColor} 50%, ${toColor} 100%)`;
  } else {
    result = `linear-gradient(to bottom, ${fromColor} 0%, ${toColor} 100%)`;
  }

  // 存入缓存
  gradientCache.set(tailwindClass, result);
  
  return result;
}

/**
 * 检测颜色是否为 Tailwind 类名格式
 * @param gradient 颜色/渐变字符串
 * @returns 是否为 Tailwind 类名
 */
export function isTailwindGradient(gradient: string): boolean {
  return gradient.startsWith('bg-');
}

/**
 * 智能转换渐变背景
 * 如果是 Tailwind 类名，转换为 CSS；否则直接返回
 * @param gradient 渐变字符串
 * @returns CSS 渐变字符串
 */
export function convertGradient(gradient: string): string {
  if (isTailwindGradient(gradient)) {
    return tailwindToCSS(gradient);
  }
  return gradient;
}

/**
 * 清空渐变缓存（用于测试或内存管理）
 */
export function clearGradientCache(): void {
  gradientCache.clear();
}

