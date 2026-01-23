'use client';

import React from 'react';
import TextBlock from '@/app/components/blocks/TextBlock';
import ImageBlock from '@/app/components/blocks/ImageBlock';
import CodeBlock from '@/app/components/blocks/CodeBlock';
import PlaceholderBlock from '@/app/components/blocks/PlaceholderBlock';

interface ArticleContentClientProps {
  article: any;
}

export default function ArticleContentClient({ article }: ArticleContentClientProps) {
  if (!article) return null;

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        minHeight: '50vh',
        padding: '40px',
        borderRadius: '12px',
        marginBottom: '40px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        lineHeight: '1.8',
        fontSize: '16px',
        color: '#333',
        width: '100%',
        boxSizing: 'border-box',
      }}
      data-content-area
    >
      {/* 查看模式：显示静态内容 */}
      {(article.blocks || []).map((block: any) => (
        <div key={block.id} className="book-content-block" style={{ marginBottom: '32px' }}>
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