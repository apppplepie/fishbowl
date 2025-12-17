'use client';

import React from 'react';
import { Card, Typography, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { PlaceholderBlock as PlaceholderBlockType } from '@/app/types/block';
import { ACCESS_LEVELS } from '@/app/types/block';

const { Text } = Typography;

interface PlaceholderBlockProps {
  block: PlaceholderBlockType;
}

export default function PlaceholderBlock({ block }: PlaceholderBlockProps) {
  // 使用数字转换的结果
  const requiredLevel = ACCESS_LEVELS.find(level => level.value === Number(block.required_access_level));
  const userLevel = ACCESS_LEVELS.find(level => level.value === Number(block.user_access_level));

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
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LockOutlined />
            <Text strong>内容受限</Text>
          </div>
        }
        description={
          <div>
            <div>此{block.original_type === 'text' ? '文本' : block.original_type === 'image' ? '图片' : '代码'}块需要
              <Text strong style={{ color: requiredLevel?.color || '#666' }}>
                {requiredLevel?.label || `等级${block.required_access_level}`} ({block.required_access_level})
              </Text> 权限
            </div>
            <div style={{ marginTop: '4px' }}>
              您的权限等级：
              <Text strong style={{ color: userLevel?.color || '#666' }}>
                {userLevel?.label || `等级${block.user_access_level}`} ({block.user_access_level})
              </Text>
            </div>
          </div>
        }
        type="warning"
        showIcon
      />
    </Card>
  );
}