'use client';

import React from 'react';
import { useResponsive } from '@/app/hooks/useResponsive';

export interface TitleBox1Props {
  title: string;
  subtitle?: string;
  /** 作者名：仅桌面端显示在标题右侧 */
  author?: string;
  style?: React.CSSProperties;
}

/**
 * 简单标题 Box1 组件（单行省略，小字号，与书籍/文章统一）
 */
export default function TitleBox1({ title, subtitle, author, style }: TitleBox1Props) {
  const { isMobile } = useResponsive();
  const showAuthor = Boolean(author) && !isMobile;

  return (
    <div
      style={{
        padding: '0 24px 8px 24px',
        overflow: 'hidden',
        minWidth: 0,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '16px',
          minWidth: 0,
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
            flex: '1 1 auto',
            minWidth: 0,
          }}
        >
          {title}
        </h1>
        {showAuthor && (
          <span
            style={{
              flex: '0 0 auto',
              fontSize: '14px',
              fontWeight: 400,
              color: '#666',
              lineHeight: '1.3',
              whiteSpace: 'nowrap',
            }}
          >
            {author}
          </span>
        )}
      </div>
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
