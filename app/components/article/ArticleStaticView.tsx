'use client';
// Client Component - ArticleStaticView.tsx
// Renders title, excerpt, and static blocks on the client for responsive behavior.
import React from 'react';
import dynamic from 'next/dynamic';
import TextBlock from '@/app/components/blocks/TextBlock';
import ImageBlock from '@/app/components/blocks/ImageBlock';
import CodeBlock from '@/app/components/blocks/CodeBlock';
import PlaceholderBlock from '@/app/components/blocks/PlaceholderBlock';
import { useResponsive } from '@/app/hooks/useResponsive';

export default function ArticleStaticView({ article }: { article: any }) {
  const { isMobile } = useResponsive();

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '800px',
        minWidth: isMobile ? 'auto' : '600px',
        margin: '0 auto',
        padding: isMobile ? '20px' : '40px',
        boxSizing: 'border-box',
      }}
    >
      {/* 文章主体内容 */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          minHeight: '50vh',
          padding: isMobile ? '20px' : '40px',
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
        {(article.blocks || []).map((block: any, index: number) => {
          return (
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
          );
        })}
      </div>
    </div>
  );
}
