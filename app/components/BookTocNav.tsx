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
 * 书籍目录导航组件
 * 展示书籍所属的目录结构，支持点击跳转
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

interface BookTocNavProps {
  currentArticleId?: string;
  bookCategoryId?: string;
  onArticleClick?: (articleId: string) => void;
  onCategoryClick?: () => void;
}

export default function BookTocNav({
  currentArticleId,
  bookCategoryId,
  onArticleClick,
  onCategoryClick
}: BookTocNavProps) {
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
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => handleCategoryTextClick(category.id)}
            >
              {category.name}
            </span>
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
   * 获取根目录的 keys（禁止关闭的目录）- 对于书籍，只有一个根目录
   */
  const getRootCategoryKeys = (categories: Category[]): string[] => {
    return categories.map(cat => `category-${cat.id}`);
  };

  /**
   * 加载书籍分类树和文章
   */
  useEffect(() => {
    const loadData = async () => {
      console.log('BookTocNav: 开始加载，bookCategoryId:', bookCategoryId);

      if (!bookCategoryId) {
        console.log('BookTocNav: bookCategoryId 为空，跳过加载');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 加载书籍分类的子分类和文章
        console.log('BookTocNav: 调用API:', `/api/categories/${bookCategoryId}/tree-with-articles`);
        const response = await fetch(`/api/categories/${bookCategoryId}/tree-with-articles`);
        const result = await response.json();

        console.log('BookTocNav: API响应:', result);

        if (result.success) {
          setCategories(result.data);
          const items = buildMenuItems(result.data);
          setMenuItems(items);

          // 默认展开所有目录（书籍目录固定展开）
          const allKeys = getAllCategoryKeys(result.data);
          setOpenKeys(allKeys);
        }
      } catch (error) {
        console.error('加载书籍目录失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [bookCategoryId]);

  /**
   * 处理目录文字点击
   */
  const handleCategoryTextClick = (categoryId: string) => {
    if (onCategoryClick) {
      onCategoryClick(); // 先调用回调（关闭抽屉等）
    }
    router.push(`/articles?category=${categoryId}`);
  };

  /**
   * 处理菜单点击
   */
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    // 只处理文章项的点击
    if (e.key.startsWith('article-')) {
      const articleId = e.key.replace('article-', '');
      // 书籍目录中的所有文章都应该跳转到book页面显示
      if (onArticleClick) {
        onArticleClick(articleId);
      } else {
        router.push(`/book/${articleId}`);
      }
    }
  };

  return (
    <>
      <div
        className="book-toc-container"
        style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >

        {/* 菜单区域 */}
        <div>
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
              onOpenChange={(keys) => {
                // 获取根目录的 keys，这些不能被关闭
                const rootKeys = getRootCategoryKeys(categories);
                // 确保根目录始终在展开列表中
                const newKeys = [...new Set([...keys, ...rootKeys])];
                setOpenKeys(newKeys);
              }}
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
              description="暂无内容"
              style={{ padding: '40px 0' }}
            />
          )}
        </div>
      </div>

      {/* 自定义样式 */}
      <style>{`
        /* 滚动条美化 */
        .book-toc-container::-webkit-scrollbar {
          width: 6px;
        }
        .book-toc-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .book-toc-container::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        .book-toc-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }

        /* 菜单项样式优化 */
        .book-toc-container .ant-menu-item,
        .book-toc-container .ant-menu-submenu-title {
          margin: 2px 8px;
          width: calc(100% - 16px);
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        /* 选中态 */
        .book-toc-container .ant-menu-item-selected {
          background: linear-gradient(90deg, #000 0%, #333 100%) !important;
          color: white !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .book-toc-container .ant-menu-item-selected .ant-menu-item-icon,
        .book-toc-container .ant-menu-item-selected .anticon {
          color: white !important;
        }

        /* 悬停态 */
        .book-toc-container .ant-menu-item:hover:not(.ant-menu-item-selected),
        .book-toc-container .ant-menu-submenu-title:hover {
          background: #f5f5f5 !important;
          color: #1a1a1a !important;
        }

        /* 子菜单展开图标 */
        .book-toc-container .ant-menu-submenu-arrow {
          color: #666 !important;
        }

        /* 去掉默认边框 */
        .book-toc-container .ant-menu-inline {
          border-right: none !important;
        }

        /* 文件夹图标颜色 */
        .book-toc-container .ant-menu-submenu-title .anticon-folder {
          color: #666;
        }

        /* 文档图标颜色 */
        .book-toc-container .ant-menu-item .anticon-file-text {
          color: #999;
        }

        /* 激活状态的图标 */
        .book-toc-container .ant-menu-item-selected .anticon-file-text {
          color: white !important;
        }
      `}</style>
    </>
  );
}
