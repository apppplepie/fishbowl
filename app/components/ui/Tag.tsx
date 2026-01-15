'use client';

import React, { useMemo } from 'react';
import './ui.css';
import { generateVisualsFromId } from './colorUtils';

export interface TagProps {
  id?: string; // 标签的唯一标识符，用于生成颜色
  color?: string; // 可选：手动指定颜色（如果提供则不使用 id 生成）
  closable?: boolean;
  onClose?: (e?: React.MouseEvent) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Tag: React.FC<TagProps> = ({
  id,
  color,
  closable = false,
  onClose,
  children,
  className = '',
  style,
}) => {
  // 根据 id 生成渐变配置，如果没有提供 color 且提供了 id
  const visuals = useMemo(() => {
    if (color) {
      // 如果手动指定了颜色，返回简单的配置
      const isPresetColor = !color.startsWith('#') && !color.startsWith('rgb') && !color.startsWith('hsl');
      if (isPresetColor) {
        return null; // 预设颜色使用 CSS 类
      }
      return {
        background: color,
        textColor: '#fff',
        borderColor: color,
      };
    }
    // 使用 id 或 children（标签文本）作为标识符生成渐变
    const identifier = id || (typeof children === 'string' ? children : String(children));
    const baseVisuals = generateVisualsFromId(identifier);
    
    // 提取主色调并创建更鲜亮的纯色背景
    // 从渐变中提取第一个 HSL 值，提高饱和度和明度
    const gradientMatch = baseVisuals.background.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (gradientMatch) {
      const [, h, s, l] = gradientMatch;
      const hue = parseInt(h);
      // 提高饱和度到 85-100%，提高明度到 60-75%，使其更鲜亮
      const saturation = Math.min(100, parseInt(s) + 20);
      const lightness = Math.min(80, parseInt(l) + 10);
      return {
        ...baseVisuals,
        background: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        textColor: 'black', // 使用白色文字，在鲜亮背景上更清晰
        borderColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      };
    }
    
    return baseVisuals;
  }, [id, color, children]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClose) {
      onClose(e);
    }
  };

  // 判断是否为预设颜色名称（antd 风格的颜色名）
  const isPresetColor = color && !color.startsWith('#') && !color.startsWith('rgb') && !color.startsWith('hsl');
  
  const tagClasses = ['ui-tag', isPresetColor && `ui-tag-${color}`, className]
    .filter(Boolean)
    .join(' ');

  const tagStyle: React.CSSProperties = {
    ...style,
    ...(isPresetColor
      ? {} // 预设颜色使用 CSS 类
      : visuals
      ? {
          background: visuals.background,
          borderColor: visuals.borderColor,
          color: visuals.textColor,
        }
      : {}),
  };

  return (
    <span className={tagClasses} style={tagStyle}>
      <span className="ui-tag-text">{children}</span>
      {closable && (
        <span className="ui-tag-close" onClick={handleClose}>
          <svg viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor">
            <path d="M563.8 512l262.5-262.5c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L518.5 466.7 256 204.2c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L471.2 512 210.7 772.5c-12.5 12.5-12.5 32.8 0 45.3 6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4L518.5 557.3 781 819.8c6.2 6.2 14.4 9.4 22.6 9.4s16.4-3.1 22.6-9.4c12.5-12.5 12.5-32.8 0-45.3L563.8 512z" />
          </svg>
        </span>
      )}
    </span>
  );
};

export default Tag;

