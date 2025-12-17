'use client';

import React from 'react';
import { Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { PlaceholderBlock as PlaceholderBlockType } from '@/app/types/block';
import { ACCESS_LEVELS } from '@/app/types/block';

const { Text } = Typography;

interface PlaceholderDisplayProps {
  block: PlaceholderBlockType;
  style?: React.CSSProperties;
}

/**
 * 占位块显示组件 - 通用的占位块内容显示
 * 可以被其他组件复用，不包含Card包装
 */
export default function PlaceholderDisplay({ block, style = {} }: PlaceholderDisplayProps) {
  const requiredLevel = ACCESS_LEVELS.find(level => level.value === Number(block.required_access_level));

  // 用户权限直接使用数值，不使用ACCESS_LEVELS映射
  const userLevelValue = Number(block.user_access_level);
  const userLevelColor = userLevelValue <= 2 ? '#52c41a' :
                        userLevelValue === 3 ? '#faad14' :
                        userLevelValue === 4 ? '#f5222d' :
                        userLevelValue >= 5 ? '#722ed1' : '#666';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fafafa',
        border: '1px dashed #d9d9d9',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        color: '#666',
        ...style
      }}
    >
      <div>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
          内容受限
        </div>
        <div style={{ fontSize: '12px', color: '#999' }}>
          此{block.original_type === 'text' ? '文本' : block.original_type === 'image' ? '图片' : '代码'}块需要
          <Text strong style={{ color: requiredLevel?.color, margin: '0 4px' }}>
            {requiredLevel?.label} ({block.required_access_level})
          </Text>
          权限
        </div>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
          您的权限等级：
          <Text strong style={{ color: userLevelColor, marginLeft: '4px' }}>
            等级{userLevelValue}
          </Text>
        </div>
      </div>
    </div>
  );
}