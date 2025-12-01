'use client';

import React from 'react';
import { Menu } from 'antd';
import { FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

/**
 * 文章目录导航组件
 * 展示文章所属的目录结构
 */

// 示例目录数据结构 - 支持多级嵌套
const tocItems: MenuProps['items'] = [
  {
    key: 'cat1',
    icon: <FolderOutlined />,
    label: '技术文章',
    children: [
      {
        key: 'cat1-1',
        icon: <FolderOutlined />,
        label: '前端开发',
        children: [
          {
            key: 'cat1-1-1',
            icon: <FolderOutlined />,
            label: 'React 系列',
            children: [
              {
                key: 'article1',
                icon: <FileTextOutlined />,
                label: 'React 入门教程',
              },
              {
                key: 'article2',
                icon: <FileTextOutlined />,
                label: 'React Hooks 详解',
              },
              {
                key: 'article3',
                icon: <FileTextOutlined />,
                label: 'React 性能优化',
              },
            ],
          },
          {
            key: 'cat1-1-2',
            icon: <FolderOutlined />,
            label: 'Vue 系列',
            children: [
              {
                key: 'article4',
                icon: <FileTextOutlined />,
                label: 'Vue 3 新特性',
              },
              {
                key: 'article5',
                icon: <FileTextOutlined />,
                label: 'Composition API',
              },
            ],
          },
        ],
      },
      {
        key: 'cat1-2',
        icon: <FolderOutlined />,
        label: '后端开发',
        children: [
          {
            key: 'article6',
            icon: <FileTextOutlined />,
            label: 'Node.js 实践',
          },
          {
            key: 'article7',
            icon: <FileTextOutlined />,
            label: 'Python Django',
          },
        ],
      },
    ],
  },
  {
    key: 'cat2',
    icon: <FolderOutlined />,
    label: '生活随笔',
    children: [
      {
        key: 'article8',
        icon: <FileTextOutlined />,
        label: '旅行日记',
      },
      {
        key: 'article9',
        icon: <FileTextOutlined />,
        label: '读书笔记',
      },
    ],
  },
  {
    key: 'cat3',
    icon: <FolderOutlined />,
    label: '项目经验',
    children: [
      {
        key: 'article10',
        icon: <FileTextOutlined />,
        label: '项目复盘',
      },
      {
        key: 'article11',
        icon: <FileTextOutlined />,
        label: '技术选型',
      },
      {
        key: 'article12',
        icon: <FileTextOutlined />,
        label: '性能优化',
      },
    ],
  },
];

interface ArticleTocNavProps {
  currentArticleId?: string;
  onArticleClick?: (articleId: string) => void;
}

export default function ArticleTocNav({ 
  currentArticleId = 'article1',
  onArticleClick 
}: ArticleTocNavProps) {
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    // 只处理文章项的点击（不处理分类）
    if (e.key.startsWith('article')) {
      onArticleClick?.(e.key);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{
        padding: '16px',
        fontSize: '16px',
        fontWeight: 600,
        borderBottom: '1px solid #f0f0f0',
        color: '#1a1a1a',
      }}>
        📚 文章目录
      </div>
      <Menu
        mode="inline"
        defaultSelectedKeys={[currentArticleId]}
        defaultOpenKeys={['cat1', 'cat1-1', 'cat1-1-1', 'cat1-1-2', 'cat1-2', 'cat2', 'cat3']}
        style={{ 
          height: 'calc(100% - 57px)',
          borderInlineEnd: 'none',
        }}
        items={tocItems}
        onClick={handleMenuClick}
      />
    </div>
  );
}

