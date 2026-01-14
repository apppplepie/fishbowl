'use client';

import React, { ReactNode } from 'react';
import { Input, Select, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Option } = Select;

export interface SearchBox1Props {
  // 搜索框配置
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  // 筛选器配置
  filters?: Array<{
    label: string;
    value: string | number;
    options: Array<{ label: string; value: string | number }>;
    onChange: (value: any) => void;
  }>;
  
  // 自定义操作按钮
  actions?: ReactNode;
  
  // 样式
  style?: React.CSSProperties;
}

/**
 * 搜索栏 Box1 组件
 * 支持搜索框 + 多个筛选器 + 自定义操作
 */
export default function SearchBox1({ 
  searchValue,
  onSearchChange,
  searchPlaceholder = '搜索...',
  filters = [],
  actions,
  style 
}: SearchBox1Props) {
  return (
    <div style={{ 
      padding: '16px 24px', 
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
      ...style 
    }}>
      {/* 搜索框 */}
      {onSearchChange && (
        <Input
          prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ 
            width: 240,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
          }}
          allowClear
        />
      )}
      
      {/* 筛选器 */}
      {filters.map((filter, index) => (
        <Space key={index} size="small" style={{ alignItems: 'center' }}>
          <span style={{ 
            color: 'white', 
            fontSize: '14px',
            whiteSpace: 'nowrap',
          }}>
            {filter.label}
          </span>
          <Select
            value={filter.value}
            onChange={filter.onChange}
            style={{ 
              minWidth: 120,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            {filter.options.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Space>
      ))}
      
      {/* 自定义操作 */}
      {actions && (
        <div style={{ marginLeft: 'auto' }}>
          {actions}
        </div>
      )}
    </div>
  );
}

