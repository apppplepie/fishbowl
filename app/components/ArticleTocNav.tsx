'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Spin, Empty } from 'antd';
import { 
  FileTextOutlined, 
  FolderOutlined, 
  CodeOutlined,
  PictureOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useRouter } from 'next/navigation';

/**
 * 文章目录导航组件
 * 展示文章所属的目录结构，支持点击跳转
 */

interface Article {
  id: string;
  title: string;
  type: string;
  publish_date: string;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  children?: Category[];
  articles?: Article[];
}

interface ArticleTocNavProps {
  currentArticleId?: string;
  onArticleClick?: (articleId: string) => void;
}

export default function ArticleTocNav({ 
  currentArticleId,
  onArticleClick
}: ArticleTocNavProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuProps['items']>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  /**
   * 获取文章类型图标
   */
  const getArticleIcon = (type: string) => {
    switch (type) {
      case 'code':
        return <CodeOutlined />;
      case 'drawing':
      case 'image':
        return <PictureOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  /**
   * 构建菜单项
   */
  const buildMenuItems = (categories: Category[]): MenuProps['items'] => {
    return categories.map(category => {
      const children: MenuProps['items'] = [];

      // 添加子分类
      if (category.children && category.children.length > 0) {
        const subCategories = buildMenuItems(category.children);
        children.push(...(subCategories || []));
      }

      // 添加文章
      if (category.articles && category.articles.length > 0) {
        const articleItems = category.articles.map(article => ({
          key: `article-${article.id}`,
          icon: getArticleIcon(article.type),
          label: (
            <span style={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              <span style={{ 
                flex: 1, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {article.title}
              </span>
            </span>
          ),
        }));
        children.push(...articleItems);
      }

      return {
        key: `category-${category.id}`,
        icon: <FolderOutlined />,
        label: (
          <span style={{ fontWeight: 500 }}>
            {category.name}
            {category.articles && category.articles.length > 0 && (
              <span style={{ 
                marginLeft: '8px', 
                fontSize: '12px', 
                color: '#999',
              }}>
                ({category.articles.length})
              </span>
            )}
          </span>
        ),
        children: children.length > 0 ? children : undefined,
      };
    });
  };

  /**
   * 收集所有应该展开的 keys
   */
  const getAllCategoryKeys = (categories: Category[]): string[] => {
    const keys: string[] = [];
    const collect = (cats: Category[]) => {
      cats.forEach(cat => {
        keys.push(`category-${cat.id}`);
        if (cat.children) {
          collect(cat.children);
        }
      });
    };
    collect(categories);
    return keys;
  };

  /**
   * 加载分类树和文章
   */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/categories/tree-with-articles');
        const result = await response.json();

        if (result.success) {
          setCategories(result.data);
          const items = buildMenuItems(result.data);
          setMenuItems(items);
          
          // 默认展开所有分类
          const keys = getAllCategoryKeys(result.data);
          setOpenKeys(keys);
        }
      } catch (error) {
        console.error('加载目录失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /**
   * 处理菜单点击
   */
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    // 只处理文章项的点击
    if (e.key.startsWith('article-')) {
      const articleId = e.key.replace('article-', '');
      // 如果有回调函数，调用回调；否则直接跳转
      if (onArticleClick) {
        onArticleClick(articleId);
      } else {
        router.push(`/article/${articleId}`);
      }
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
          {loading ? (
            <div style={{ 
              padding: '40px 0', 
              textAlign: 'center',
            }}>
              <Spin tip="加载中...">
                <div style={{ minHeight: '50px' }} />
              </Spin>
            </div>
          ) : menuItems && menuItems.length > 0 ? (
            <Menu
              mode="inline"
              selectedKeys={currentArticleId ? [`article-${currentArticleId}`] : []}
              openKeys={openKeys}
              onOpenChange={(keys) => setOpenKeys(keys)}
              style={{ 
                borderInlineEnd: 'none',
                background: 'transparent',
                fontSize: '14px',
              }}
              items={menuItems}
              onClick={handleMenuClick}
            />
          ) : (
            <Empty 
              description="暂无文章"
              style={{ padding: '40px 0' }}
            />
          )}
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

