'use client';

import React from 'react';
import TextBlock from '@/app/components/blocks/TextBlock';
import ImageBlock from '@/app/components/blocks/ImageBlock';
import CodeBlock from '@/app/components/blocks/CodeBlock';
import PlaceholderBlock from '@/app/components/blocks/PlaceholderBlock';
import { useResponsive } from '@/app/hooks/useResponsive';
import { getContentCardStyle, contentCardTypography } from '@/app/styles/contentArea';

/** 块间距，与 contentArea 统一布局一致 */
export const CONTENT_BLOCK_MARGIN_BOTTOM = '32px';

interface ArticleContentClientProps {
  article: any;
  /** 为 true 时不包一层内容卡片样式（由父级提供），仅应用排版与块间距，用于书籍页等已有卡片的场景 */
  noCard?: boolean;
}

export default function ArticleContentClient({ article, noCard = false }: ArticleContentClientProps) {
  const { isMobile } = useResponsive();
  if (!article) return null;

  const wrapperStyle = noCard
    ? { ...contentCardTypography, width: '100%' as const, boxSizing: 'border-box' as const }
    : { ...getContentCardStyle(isMobile), ...contentCardTypography };

  return (
    <div
      style={wrapperStyle}
      data-content-area
    >
      {/* 查看模式：显示静态内容，块间距与统一布局一致 */}
      {(article.blocks || []).map((block: any) => (
        <div key={block.id} className="book-content-block" style={{ marginBottom: CONTENT_BLOCK_MARGIN_BOTTOM }}>
          {block.type === 'text' ? (
            <TextBlock block={block} mode="view" />
          ) : block.type === 'image' ? (
            <ImageBlock block={block} mode="view" />
          ) : block.type === 'code' ? (
            <CodeBlock block={block} mode="view" />
          ) : block.type === 'placeholder' ? (
            <PlaceholderBlock block={block} />
          ) : null}
        </div>
      ))}
    </div>
  );
}