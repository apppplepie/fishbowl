'use client';

import React from 'react';
import { Card } from 'antd';
import { CodeOutlined, EyeOutlined, MessageOutlined } from '@ant-design/icons';

interface CodeCardProps {
  card: {
    id: string;
    title: string;
    excerpt: string;
    author: string;
    publish_date?: string;
    createdAt?: string;
    codePreview?: string; // 第一个代码块的预览
    codeLanguage?: string; // 第一个代码块的语言
    codeBlockCount?: number; // 代码块数量
    views?: number;
    comments?: number;
  };
  onClick?: () => void;
}

/**
 * 代码主导卡片 - 方案A：代码预览式
 * 适合技术文章、代码示例分享
 */
export default function CodeCard({ card, onClick }: CodeCardProps) {
  // 代码预览（最多显示5行）
  const codeLines = card.codePreview 
    ? card.codePreview.split('\n').slice(0, 5) 
    : ['// 代码示例', 'function example() {', '  return "Hello World";', '}'];

  return (
    <Card
      hoverable
      style={{ 
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e8e8e8',
      }}
      styles={{ body: { padding: 0 } }}
      onClick={onClick}
    >
      {/* 标题区域 */}
      <div style={{
        padding: '20px 20px 16px 20px',
        background: '#fff',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}>
          <CodeOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: '#1a1a1a',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {card.title}
          </h3>
        </div>

        {/* 摘要 */}
        {card.excerpt && (
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#666',
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
        borderTop: '2px solid #1890ff',
        borderBottom: '2px solid #1890ff',
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
      <div style={{
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
          {card.views !== undefined && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <EyeOutlined /> {card.views}
            </span>
          )}
          {card.comments !== undefined && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageOutlined /> {card.comments}
            </span>
          )}
          <span>📅 {card.publish_date || card.createdAt}</span>
        </div>
      </div>
    </Card>
  );
}

