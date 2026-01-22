'use client';

import React, { useState, useEffect } from 'react';
import BlockEditor from '@/app/components/blocks/BlockEditor';
import TextBlock from '@/app/components/blocks/TextBlock';
import ImageBlock from '@/app/components/blocks/ImageBlock';
import CodeBlock from '@/app/components/blocks/CodeBlock';
import PlaceholderBlock from '@/app/components/blocks/PlaceholderBlock';

interface ArticleContentClientProps {
  article: any;
  isEditing?: boolean;
  onSave?: (updatedArticle: any) => void;
}

export default function ArticleContentClient({
  article,
  isEditing = false,
  onSave
}: ArticleContentClientProps) {
  const [editedBlocks, setEditedBlocks] = useState<any[]>([]);

  // 初始化编辑块数据
  useEffect(() => {
    if (article?.blocks && isEditing) {
      const editorBlocks = article.blocks
        .map((b: any, index: number) => {
          if (b.type === 'text') {
            return {
              id: b.id,
              type: 'text',
              order: index,
              content: b.parsedContent?.content || b.content || '',
              access_level: b.access_level || 1,
            };
          } else if (b.type === 'image') {
            return {
              id: b.id,
              type: 'image',
              order: index,
              imageUrl: b.parsedContent?.url || b.url || '',
              title: b.parsedContent?.title || b.title || '',
              description: b.parsedContent?.description || b.description || '',
              access_level: b.access_level || 1,
            };
          } else if (b.type === 'code') {
            return {
              id: b.id,
              type: 'code',
              order: index,
              language: b.parsedContent?.language || 'javascript',
              code: b.parsedContent?.code || b.code || '',
              title: b.parsedContent?.title || b.title || '',
              access_level: b.access_level || 1,
            };
          } else if (b.type === 'placeholder') {
            return null;
          }
          return b;
        })
        .filter((block: any) => block !== null);

      setEditedBlocks(editorBlocks);
    }
  }, [article, isEditing]);

  const handleBlocksChange = (blocks: any[]) => {
    setEditedBlocks(blocks);
  };

  // 这里可以添加保存逻辑，如果需要的话
  const handleSave = () => {
    const updatedArticle = {
      ...article,
      blocks: editedBlocks
    };
    onSave?.(updatedArticle);
  };

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
      {isEditing ? (
        // 编辑模式：显示块编辑器
        <BlockEditor
          blocks={editedBlocks}
          onChange={handleBlocksChange}
          showAddButton={true}
        />
      ) : (
        // 查看模式：显示静态内容
        (article.blocks || []).map((block: any, index: number) => {
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
        })
      )}
    </div>
  );
}