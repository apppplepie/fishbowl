'use client';

import React, { useMemo } from 'react';
import { useCardBackground } from './useCardBackground';

export interface CardProps {
  children: React.ReactNode;
  hoverable?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  id?: string; // 用于生成背景颜色
  cover?: React.ReactNode; // 封面内容（如图片）
  bodyStyle?: React.CSSProperties; // body 区域样式
}

/**
 * 自定义 Card 组件，参考 IdentityCard 样式
 * 替代 antd Card，提供更现代的设计
 */
export default function Card({
  children,
  hoverable = false,
  onClick,
  style,
  className = '',
  id = '',
  cover,
  bodyStyle,
}: CardProps) {
  // 使用卡片背景颜色 Hook，基于 ID 生成独特的渐变色
  const colors = useCardBackground(id);

  // 合并样式
  const cardStyle: React.CSSProperties = useMemo(() => ({
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: hoverable || onClick ? 'pointer' : 'default',
    background: colors.background,
    color: colors.textColor,
    border: `1px solid ${colors.borderColor}`,
    boxShadow: `0 8px 30px -6px ${colors.shadowColor}, 0 4px 12px -4px rgba(0,0,0,0.1)`,
    transition: 'all 0.3s ease',
    ...(hoverable && {
      ':hover': {
        transform: 'translateY(-6px) scale(1.02)',
      },
    }),
    ...style,
  }), [colors, hoverable, onClick, style]);

  return (
    <div
      className={`relative break-inside-avoid group ${className}`}
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
          e.currentTarget.style.boxShadow = `0 12px 40px -8px ${colors.shadowColor}, 0 6px 16px -4px rgba(0,0,0,0.15)`;
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = `0 8px 30px -6px ${colors.shadowColor}, 0 4px 12px -4px rgba(0,0,0,0.1)`;
        }
      }}
    >
      {/* Subtle Noise Texture Overlay for "Paper" feel */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Cover 区域 */}
      {cover && (
        <div style={{ position: 'relative', width: '100%' }}>
          {cover}
        </div>
      )}

      {/* Body 区域 */}
      <div className="relative z-10" style={bodyStyle}>
        {children}
      </div>
    </div>
  );
}

