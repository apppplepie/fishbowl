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
    <div style={{ padding: '0 24px 16px 24px', ...style }}>
      <h1 style={{
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#000',
        margin: 0,
        lineHeight: '1.2',
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          margin: '8px 0 0 0',
          fontSize: '14px',
          color: '#666',
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

