'use client';

import React from 'react';

export interface TitleBox1Props {
  title: string;
  subtitle?: string;
  style?: React.CSSProperties;
}

/**
 * 简单标题 Box1 组件（单行省略，小字号，与书籍/文章统一）
 */
export default function TitleBox1({ title, subtitle, style }: TitleBox1Props) {
  return (
    <div
      style={{
        padding: '0 24px 8px 24px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
        ...style,
      }}
    >
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#000',
          margin: 0,
          lineHeight: '1.3',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            color: '#666',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

