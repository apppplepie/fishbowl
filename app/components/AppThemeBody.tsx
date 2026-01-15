'use client';

import React, { useMemo } from 'react';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import { convertGradient } from '@/app/utils/colorConverter';

interface AppThemeBodyProps {
  children: React.ReactNode;
}

export const AppThemeBody: React.FC<AppThemeBodyProps> = ({ children }) => {
  const { currentFishbowlTheme, mounted } = useAppTheme();

  // 如果还没挂载，不添加任何背景类，让 globals.css 的背景生效
  // 这样可以避免从纯色背景跳到渐变背景的闪烁
  const bodyBackground = mounted ? currentFishbowlTheme.pageBg : '';

  // 计算合并后的渐变和最深颜色
  const { mergedGradient, deepestColor } = useMemo(() => {
    if (!mounted) {
      // 默认值（coral 主题）
      return {
        mergedGradient: 'linear-gradient(to bottom, #ffedd5 0%, #fef3c7 25%, #fef9c3 50%, #99f6e4 75%, #14b8a6 100%)',
        deepestColor: '#14b8a6'
      };
    }

    const merged = mergeSkyWaterGradient(
      currentFishbowlTheme.skyGradient,
      currentFishbowlTheme.waterGradient
    );
    
    const waterCSS = convertGradient(currentFishbowlTheme.waterGradient);
    const deepest = extractDeepestColor(waterCSS);

    return {
      mergedGradient: merged,
      deepestColor: deepest
    };
  }, [currentFishbowlTheme, mounted]);

  const bodyStyle: React.CSSProperties & {
    '--theme-body-gradient'?: string;
    '--theme-body-bg-color'?: string;
  } = {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
    // 设置 CSS 变量供 globals.css 使用
    '--theme-body-gradient': mergedGradient || '',
    '--theme-body-bg-color': deepestColor || '' ,
  };

  return (
    <body
      style={bodyStyle}
      className={`antialiased ${bodyBackground}`.trim()}
    >
      {children}
    </body>
  );
};
/**
 * 合并天空和水体渐变为一个完整的渐变
 * 天空渐变占前50%，水体渐变占后50%
 */
function mergeSkyWaterGradient(skyGradient: string, waterGradient: string): string {
  // 解析渐变字符串，提取颜色停止点
  const parseGradientStops = (gradient: string): Array<{ color: string; position: number }> => {
    // 匹配 linear-gradient 内容
    const match = gradient.match(/linear-gradient\([^,]*?,\s*(.+)\)/);
    if (!match) return [];
    
    const stopsString = match[1];
    const stops: Array<{ color: string; position: number }> = [];
    
    // 分割颜色停止点（避免在括号内分割）
    let depth = 0;
    let currentStop = '';
    
    for (let i = 0; i < stopsString.length; i++) {
      const char = stopsString[i];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) {
        if (currentStop.trim()) {
          const parsed = parseColorStop(currentStop.trim());
          if (parsed) stops.push(parsed);
        }
        currentStop = '';
        continue;
      }
      currentStop += char;
    }
    
    // 处理最后一个停止点
    if (currentStop.trim()) {
      const parsed = parseColorStop(currentStop.trim());
      if (parsed) stops.push(parsed);
    }
    
    return stops;
  };

  const parseColorStop = (stop: string): { color: string; position: number } | null => {
    // 匹配颜色和百分比，如 "rgba(255, 255, 255, 0.5) 20%"
    const match = stop.match(/^(.+?)\s+(\d+(?:\.\d+)?)%$/);
    if (match) {
      return {
        color: match[1].trim(),
        position: parseFloat(match[2])
      };
    }
    
    // 如果没有百分比，尝试只提取颜色
    const colorMatch = stop.match(/^(rgba?\([^)]+\)|#[0-9a-fA-F]+|[a-z]+)$/i);
    if (colorMatch) {
      return { color: colorMatch[1].trim(), position: 0 };
    }
    
    return null;
  };

  const skyStops = parseGradientStops(skyGradient);
  const waterStops = parseGradientStops(waterGradient);

  // 如果解析失败，返回默认渐变
  if (skyStops.length === 0 && waterStops.length === 0) {
    return 'linear-gradient(to bottom, #f3f4f6 0%, #000000 100%)';
  }

  // 将天空渐变缩放到 0-50%
  const scaledSkyStops = skyStops.map(stop => ({
    color: stop.color,
    position: stop.position * 0.5
  }));

  // 将水体渐变缩放到 50-100%
  const scaledWaterStops = waterStops.map(stop => ({
    color: stop.color,
    position: 50 + (stop.position * 0.5)
  }));

  // 合并停止点
  const allStops = [...scaledSkyStops, ...scaledWaterStops];
  
  // 生成CSS渐变字符串
  const stopsString = allStops
    .map(stop => `${stop.color} ${stop.position.toFixed(1)}%`)
    .join(', ');

  return `linear-gradient(to bottom, ${stopsString})`;
}

/**
 * 从水体渐变CSS中提取最深的颜色（通常是最后一个颜色）
 */
function extractDeepestColor(waterCSS: string): string {
  // 匹配所有颜色值（rgba, rgb, hex等）
  const colorMatches = waterCSS.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-z]+/gi);
  
  if (!colorMatches || colorMatches.length === 0) {
    return '#000000'; // 默认黑色
  }

  // 返回最后一个颜色（通常是最深的）
  return colorMatches[colorMatches.length - 1];
}

