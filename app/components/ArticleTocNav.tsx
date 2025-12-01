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
    <>
      <div 
        className="article-toc-container"
        style={{ 
          height: '100%', 
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* 标题区域 */}
        <div style={{
          padding: '20px',
          borderBottom: '2px solid #f0f0f0',
          background: '#fafafa',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#1a1a1a',
            letterSpacing: '-0.3px',
          }}>
            文章目录
          </div>
        </div>

        {/* 菜单区域 */}
        <div style={{ padding: '8px 0' }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={[currentArticleId]}
            defaultOpenKeys={['cat1', 'cat1-1', 'cat1-1-1', 'cat1-1-2', 'cat1-2', 'cat2', 'cat3']}
            style={{ 
              borderInlineEnd: 'none',
              background: 'transparent',
              fontSize: '14px',
            }}
            items={tocItems}
            onClick={handleMenuClick}
          />
        </div>
      </div>

      {/* 自定义样式 */}
      <style>{`
        /* 滚动条美化 */
        .article-toc-container::-webkit-scrollbar {
          width: 6px;
        }
        .article-toc-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .article-toc-container::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        .article-toc-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }

        /* 菜单项样式优化 */
        .article-toc-container .ant-menu-item,
        .article-toc-container .ant-menu-submenu-title {
          margin: 2px 8px;
          width: calc(100% - 16px);
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        /* 选中态 */
        .article-toc-container .ant-menu-item-selected {
          background: linear-gradient(90deg, #000 0%, #333 100%) !important;
          color: white !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .article-toc-container .ant-menu-item-selected .ant-menu-item-icon,
        .article-toc-container .ant-menu-item-selected .anticon {
          color: white !important;
        }

        /* 悬停态 */
        .article-toc-container .ant-menu-item:hover:not(.ant-menu-item-selected),
        .article-toc-container .ant-menu-submenu-title:hover {
          background: #f5f5f5 !important;
          color: #1a1a1a !important;
        }

        /* 子菜单展开图标 */
        .article-toc-container .ant-menu-submenu-arrow {
          color: #666 !important;
        }

        /* 去掉默认边框 */
        .article-toc-container .ant-menu-inline {
          border-right: none !important;
        }

        /* 文件夹图标颜色 */
        .article-toc-container .ant-menu-submenu-title .anticon-folder {
          color: #666;
        }

        /* 文档图标颜色 */
        .article-toc-container .ant-menu-item .anticon-file-text {
          color: #999;
        }

        /* 激活状态的图标 */
        .article-toc-container .ant-menu-item-selected .anticon-file-text {
          color: white !important;
        }
      `}</style>
    </>
  );
}

