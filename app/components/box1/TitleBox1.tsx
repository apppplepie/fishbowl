'use client';

import React from 'react';

export interface TitleBox1Props {
  title: string;
  subtitle?: string;
  style?: React.CSSProperties;
}

/**
 * 简单标题 Box1 组件
 */
export default function TitleBox1({ title, subtitle, style }: TitleBox1Props) {
  return (
    <div style={{ padding: '16px 24px', ...style }}>
      <h1 style={{ 
        margin: 0, 
        fontSize: '24px', 
        fontWeight: 'bold',
        color: 'white',
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ 
          margin: '8px 0 0 0', 
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.8)',
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

