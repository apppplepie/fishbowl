'use client';

import React from 'react';
import { CodeOutlined } from '@ant-design/icons';
import { formatRelativeTime } from '@/app/utils/timeFormat';
import { useCardBackground } from '@/app/components/ui/useCardBackground';
import { Tag, Card } from '@/app/components/ui';

export interface CodeCardProps {
  card: {
    id: string;
    title: string;
    excerpt: string;
    author: string;
    updatedAt?: string;
    publishedAt?: string;
    createdAt?: string;
    codePreview?: string;
    codeLanguage?: string;
    codeBlockCount?: number;
    tags?: string[];
    likes?: number;
    comments?: number;
  };
  onClick?: () => void;
  priority?: boolean;
}

/**
 * 代码主导卡片 - 方案A：代码预览式
 * 适合技术文章、代码示例分享
 */
export default function CodeCard({ card, onClick, priority = false }: CodeCardProps) {
  // 使用卡片背景颜色 Hook，基于代码卡片 ID 生成独特的渐变色
  const colors = useCardBackground(card.id || '');
  
  // 代码预览（最多显示5行）
  const codeLines = card.codePreview 
    ? card.codePreview.split('\n').slice(0, 5) 
    : ['// 代码示例', 'function example() {', '  return "Hello World";', '}'];

  return (
    <Card
      hoverable
      id={card.id || ''}
      onClick={onClick}
      bodyStyle={{ padding: 0 }}
    >
      {/* 标题区域 */}
      <div style={{
        padding: '20px 20px 16px 20px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}>
          <CodeOutlined style={{ fontSize: '20px'}} />
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: colors.textColor,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {card.title}
          </h3>
        </div>

        {/* 标签 */}
        {card.tags && card.tags.length > 0 && (
          <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {card.tags.slice(0, 5).map((tag: string, index: number) => (
              <Tag key={index} id={tag}>
                {tag}
              </Tag>
            ))}
            {card.tags.length > 5 && (
              <Tag id={`more-${card.id}`}>
                +{card.tags.length - 5}
              </Tag>
            )}
          </div>
        )}

        {/* 摘要 */}
        {card.excerpt && (
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: colors.textColor,
            opacity: 0.8,
            lineHeight: '1.6',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {card.excerpt}
          </p>
        )}
      </div>

      {/* 代码预览区域 */}
      <div style={{
        background: '#282c34',
        padding: '16px 20px',
        position: 'relative',
        borderTop: `2px solid ${colors.borderColor}`,
        borderBottom: `2px solid ${colors.borderColor}`,
      }}>
        {/* 语言标签 */}
        {card.codeLanguage && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            background: 'rgba(24, 144, 255, 0.2)',
            color: '#61dafb',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
          }}>
            {card.codeLanguage}
          </div>
        )}

        {/* 代码内容 */}
        <pre style={{
          margin: 0,
          fontSize: '13px',
          lineHeight: '1.5',
          color: '#abb2bf',
          fontFamily: '"Fira Code", "Courier New", monospace',
          overflow: 'hidden',
        }}>
          <code>
            {codeLines.map((line, index) => (
              <div key={index} style={{ minHeight: '19.5px' }}>
                {line || ' '}
              </div>
            ))}
            {card.codePreview && card.codePreview.split('\n').length > 5 && (
              <div style={{ color: '#61dafb', marginTop: '4px' }}>
                // ...
              </div>
            )}
          </code>
        </pre>
      </div>

      {/* 底部信息栏 */}
      {/* <div style={{
        padding: '12px 20px',
        background: '#fafafa',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
        color: '#666',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>👤 {card.author}</span>
          {card.codeBlockCount && card.codeBlockCount > 1 && (
            <span style={{ 
              background: '#e6f7ff', 
              color: '#1890ff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              {card.codeBlockCount} 个代码块
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#999' }}>
          {(card.likes !== undefined && card.likes !== null) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              ❤️ {card.likes}
            </span>
          )}
          {(card.comments !== undefined && card.comments !== null) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageOutlined /> {card.comments}
            </span>
          )}
          <span style={{ fontSize: '12px' }}>
            📝 {formatRelativeTime(card.updatedAt || card.publishedAt || card.createdAt || new Date().toISOString())}
          </span>
        </div> */}
      {/* </div> */}
    </Card>
  );
}

