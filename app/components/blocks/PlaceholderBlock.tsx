'use client';

import React from 'react';
import { Card, Alert } from 'antd';
import type { PlaceholderBlock as PlaceholderBlockType } from '@/app/types/block';
import PlaceholderDisplay from './PlaceholderDisplay';

interface PlaceholderBlockProps {
  block: PlaceholderBlockType;
}

/**
 * 完整的占位块组件 - 包含Card包装
 * 用于文章内容中的块级占位显示
 */
export default function PlaceholderBlock({ block }: PlaceholderBlockProps) {
  return (
    <Card
      size="small"
      style={{
        border: '1px dashed #d9d9d9',
        backgroundColor: '#fafafa',
        marginBottom: '8px'
      }}
    >
      <Alert
        title="内容受限"
        description={
          <PlaceholderDisplay
            block={block}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              padding: '10px 0',
              margin: '-10px 0'
            }}
          />
        }
        type="warning"
        showIcon
      />
    </Card>
  );
}