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

interface TreeNode {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  depth: number;
  order_index: number;
  node_type: 'category' | 'article';
  type?: string; // article type
  publish_date?: string; // for articles
  children?: TreeNode[];
}

interface BookCategorySidebarProps {
  currentArticleId?: string;
  bookCategoryId?: string;
  onArticleClick?: (articleId: string) => void;
  onCategoryClick?: () => void;
}

export default function BookCategorySidebar({
  currentArticleId,
  bookCategoryId,
  onArticleClick,
  onCategoryClick
}: BookCategorySidebarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<TreeNode[]>([]);
  const [menuItems, setMenuItems] = useState<MenuProps['items']>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [bookRootId, setBookRootId] = useState<string | null>(null);

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
   * 找到书籍根节点（depth=2的祖先节点）
   * 通过解析path字符串直接计算，无需额外API调用
   */
  const findBookRootId = async (categoryId: string): Promise<string> => {
    try {
      // 获取当前分类的path
      const response = await fetch(`/api/categories/${categoryId}`);
      const result = await response.json();

      if (result.success && result.categories && result.categories.length > 0) {
        const category = result.categories[0];
        if (category.path) {
          // path格式如：000001-000002-000003-000004
          // depth=2的节点是path的第二段（索引1）
          const pathParts = category.path.split('-');
          if (pathParts.length >= 2) {
            // 书籍根节点的path是前两段
            const bookPath = pathParts.slice(0, 2).join('-');

            // 直接查询这个path对应的分类ID
            const bookResponse = await fetch(`/api/categories?path=${encodeURIComponent(bookPath)}`);
            const bookResult = await bookResponse.json();

            if (bookResult.success && bookResult.categories && bookResult.categories.length > 0) {
              return bookResult.categories[0].id;
            }
          }
        }
      }
    } catch (error) {
      console.error('查找书籍根节点失败:', error);
    }

    // 如果找不到，默认返回传入的categoryId
    return categoryId;
  };

  /**
   * 递归构建菜单项 - 处理树形结构
   */
  const buildMenuItemsFromTree = (nodes: TreeNode[]): MenuProps['items'] => {
    return nodes.map(node => {
      // 根据节点类型构建菜单项
      if (node.node_type === 'category') {
        // 分类节点 - 如果有子项，则创建子菜单
        const children = node.children && node.children.length > 0
          ? buildMenuItemsFromTree(node.children)
          : undefined;

        return {
          key: `category-${node.id}`,
          icon: <FolderOutlined />,
          label: (
            <span style={{ fontWeight: 500 }}>
              <span
                style={{ cursor: 'pointer' }}
                onClick={() => handleCategoryTextClick(node.id)}
              >
                {node.name}
              </span>
            </span>
          ),
          children: children, // 支持展开/折叠的子项
        };
      } else {
        // article节点 - 叶子节点
        return {
          key: `article-${node.id}`,
          icon: getArticleIcon(node.type || 'article'),
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
                {node.name}
              </span>
            </span>
          ),
        };
      }
    });
  };

  /**
   * 收集所有应该展开的 keys
   */
  const getAllCategoryKeys = (nodes: TreeNode[]): string[] => {
    return nodes
      .filter(node => node.node_type === 'category')
      .map(node => `category-${node.id}`);
  };

  /**
   * 获取根目录的 keys（禁止关闭的目录）
   */
  const getRootCategoryKeys = (nodes: TreeNode[]): string[] => {
    // 对于书籍目录，所有分类节点都可以关闭
    return [];
  };

  /**
   * 加载书籍分类树和文章
   */
  useEffect(() => {
    const loadData = async () => {
      console.log('BookCategorySidebar: 开始加载，bookCategoryId:', bookCategoryId);

      if (!bookCategoryId) {
        console.log('BookCategorySidebar: bookCategoryId 为空，跳过加载');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 找到书籍根节点（depth=2）
        const actualBookId = await findBookRootId(bookCategoryId);
        console.log('BookCategorySidebar: 找到书籍根节点:', actualBookId);
        setBookRootId(actualBookId);

        // 加载书籍根节点的完整树结构
        console.log('BookCategorySidebar: 调用API:', `/api/categories/${actualBookId}/tree-with-articles`);
        const response = await fetch(`/api/categories/${actualBookId}/tree-with-articles`);
        const result = await response.json();

        console.log('BookCategorySidebar: API响应:', result);

        if (result.success && result.data) {
          // API现在返回 { flat: TreeNode[], tree: TreeNode[] }
          const flatNodes = result.data.flat as TreeNode[];
          const treeNodes = result.data.tree as TreeNode[];

          setCategories(flatNodes); // 存储平铺的节点列表用于查找
          // 使用树形结构来构建菜单项，支持展开/折叠
          const items = buildMenuItemsFromTree(treeNodes);
          setMenuItems(items);

          // 默认展开所有目录
          const allKeys = getAllCategoryKeys(flatNodes);
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
    router.push(`/bookcase?category=${categoryId}`);
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
