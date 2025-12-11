'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Spin, Empty } from 'antd';
import {
  FileTextOutlined,
  FolderOutlined,
  CodeOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useRouter } from 'next/navigation';

interface TreeNode {
  id: string;
  name: string;
  parent_id: string | null;
  path?: string;
  depth?: number;
  order_index: number;
  node_type: 'category' | 'article';
  type?: string; // article type
  publish_date?: string; // for articles
  children?: TreeNode[];
}

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

export interface GenericIndexTreeConfig {
  /**
   * API接口路径
   * 例如: '/api/categories/tree-with-articles' 或 '/api/categories/{id}/tree-with-articles'
   */
  apiEndpoint: string;
  
  /**
   * 起始分类ID（可选）
   * 用于从特定分类开始加载树
   */
  startCategoryId?: string;
  
  /**
   * 空状态提示文字
   */
  emptyText?: string;
  
  /**
   * 禁止关闭的根节点
   */
  forceOpenRootKeys?: boolean;
  
  /**
   * 点击分类后的跳转路径模板
   * 使用 {categoryId} 作为占位符
   * 例如: '/articles?category={categoryId}'
   */
  categoryNavigationPattern?: string;
  
  /**
   * 点击文章后的跳转路径模板
   * 使用 {articleId} 作为占位符
   * 例如: '/article/{articleId}'
   */
  articleNavigationPattern?: string;
  
  /**
   * CSS类名前缀，用于样式隔离
   */
  stylePrefix?: string;
  
  /**
   * 是否显示文章数量统计
   */
  showArticleCount?: boolean;
  
  /**
   * API返回的数据格式
   * 'tree-with-articles': 传统格式 { data: Category[] }
   * 'flat-tree': 新格式 { data: { flat: TreeNode[], tree: TreeNode[] } }
   */
  dataFormat?: 'tree-with-articles' | 'flat-tree';
  
  /**
   * 是否需要查找书籍根节点（用于章节索引）
   */
  findBookRoot?: boolean;
  
  /**
   * 默认展开行为
   * 'all': 展开所有分类（默认）
   * 'current-article-path': 只展开当前文章的路径（其他折叠）
   * 'none': 全部折叠
   */
  defaultOpenMode?: 'all' | 'current-article-path' | 'none';
}

interface GenericIndexTreeProps {
  config: GenericIndexTreeConfig;
  currentArticleId?: string;
  onArticleClick?: (articleId: string) => void;
  onCategoryClick?: () => void;
}

/**
 * 通用索引树组件
 * 用于显示分类+文章的混合树结构
 */
export default function GenericIndexTree({
  config,
  currentArticleId,
  onArticleClick,
  onCategoryClick
}: GenericIndexTreeProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuProps['items']>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  
  const {
    apiEndpoint,
    startCategoryId,
    emptyText = '暂无内容',
    forceOpenRootKeys = false,
    categoryNavigationPattern,
    articleNavigationPattern,
    stylePrefix = 'generic-index-tree',
    showArticleCount = true,
    dataFormat = 'tree-with-articles',
    findBookRoot = false,
    defaultOpenMode = 'current-article-path' // 默认只展开当前文章路径
  } = config;

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
   * 找到书籍根节点（depth=2的祖先节点）- 用于章节索引
   * 书籍在 cat_bookcase 下，depth=2，path有3段
   */
  const findBookRootId = async (categoryId: string): Promise<string> => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`);
      const result = await response.json();

      if (result.success && result.categories && result.categories.length > 0) {
        const category = result.categories[0];
        if (category.path) {
          const pathParts = category.path.split('-');
          // 书籍在depth=2，path有3段（例如：000000-000004-000001）
          // 需要取前3段来获取书籍根节点
          if (pathParts.length >= 3) {
            const bookPath = pathParts.slice(0, 3).join('-');
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
    return categoryId;
  };

  /**
   * 构建菜单项（tree-with-articles格式）
   */
  const buildMenuItemsFromCategories = (categories: Category[]): MenuProps['items'] => {
    return categories.map(category => {
      const children: MenuProps['items'] = [];

      // 添加子分类
      if (category.children && category.children.length > 0) {
        const subCategories = buildMenuItemsFromCategories(category.children);
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
              onClick={(e) => {
                e.stopPropagation();
                handleCategoryTextClick(category.id);
              }}
            >
              {category.name}
            </span>
            {showArticleCount && category.articles && category.articles.length > 0 && (
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
   * 构建菜单项（flat-tree格式）
   */
  const buildMenuItemsFromTree = (nodes: TreeNode[]): MenuProps['items'] => {
    return nodes.map(node => {
      if (node.node_type === 'category') {
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategoryTextClick(node.id);
                }}
              >
                {node.name}
              </span>
            </span>
          ),
          children: children,
        };
      } else {
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
  const getAllCategoryKeys = (data: any[]): string[] => {
    const keys: string[] = [];
    
    if (dataFormat === 'flat-tree') {
      // flat-tree格式：只收集category类型的节点
      data.forEach(node => {
        if (node.node_type === 'category') {
          keys.push(`category-${node.id}`);
        }
      });
    } else {
      // tree-with-articles格式：递归收集
      const collect = (cats: Category[]) => {
        cats.forEach(cat => {
          keys.push(`category-${cat.id}`);
          if (cat.children) {
            collect(cat.children);
          }
        });
      };
      collect(data);
    }
    
    return keys;
  };

  /**
   * 获取根目录的 keys（禁止关闭的目录）
   */
  const getRootCategoryKeys = (data: any[]): string[] => {
    if (!forceOpenRootKeys) {
      return [];
    }

    if (dataFormat === 'flat-tree') {
      return [];
    } else {
      return data
        .filter(cat => cat.parent_id === null)
        .map(cat => `category-${cat.id}`);
    }
  };

  /**
   * 查找文章的所有祖先分类keys（用于只展开当前文章的路径）
   */
  const findArticleAncestorKeys = (data: any[], articleId: string): string[] => {
    const ancestorKeys: string[] = [];

    if (dataFormat === 'flat-tree') {
      // flat-tree格式：通过parent_id向上追溯
      // 1. 先找到文章节点
      const articleNode = data.find(node => node.node_type === 'article' && node.id === articleId);
      if (!articleNode) return ancestorKeys;

      // 2. 从文章的父分类开始向上追溯
      let currentParentId = articleNode.parent_id;
      while (currentParentId) {
        const parentNode = data.find(node => node.node_type === 'category' && node.id === currentParentId);
        if (!parentNode) break;
        
        ancestorKeys.push(`category-${parentNode.id}`);
        currentParentId = parentNode.parent_id;
      }
    } else {
      // tree-with-articles格式：递归查找
      const findArticleInTree = (categories: Category[], path: string[] = []): boolean => {
        for (const category of categories) {
          const currentPath = [...path, `category-${category.id}`];
          
          // 检查这个分类下的文章
          if (category.articles?.some(article => article.id === articleId)) {
            ancestorKeys.push(...currentPath);
            return true;
          }
          
          // 递归检查子分类
          if (category.children && category.children.length > 0) {
            if (findArticleInTree(category.children, currentPath)) {
              return true;
            }
          }
        }
        return false;
      };

      findArticleInTree(data);
    }

    return ancestorKeys;
  };

  /**
   * 处理目录文字点击
   */
  const handleCategoryTextClick = (categoryId: string) => {
    if (onCategoryClick) {
      onCategoryClick(); // 先调用回调（关闭抽屉等）
    }
    
    if (categoryNavigationPattern) {
      const path = categoryNavigationPattern.replace('{categoryId}', categoryId);
      router.push(path);
    }
  };

  /**
   * 加载分类树和文章
   */
  useEffect(() => {
    const loadData = async () => {
      if (findBookRoot && !startCategoryId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 如果需要查找书籍根节点
        let actualCategoryId = startCategoryId;
        if (findBookRoot && startCategoryId) {
          actualCategoryId = await findBookRootId(startCategoryId);
        }

        // 构建API路径
        let apiUrl = apiEndpoint;
        if (actualCategoryId) {
          apiUrl = apiUrl.replace('{id}', actualCategoryId);
        }

        const response = await fetch(apiUrl);
        const result = await response.json();

        if (result.success && result.data) {
          let items: MenuProps['items'];
          let dataToStore: any[];

          if (dataFormat === 'flat-tree') {
            // 新格式：{ data: { flat: TreeNode[], tree: TreeNode[] } }
            const flatNodes = result.data.flat as TreeNode[];
            const treeNodes = result.data.tree as TreeNode[];
            dataToStore = flatNodes;
            items = buildMenuItemsFromTree(treeNodes);
          } else {
            // 传统格式：{ data: Category[] }
            dataToStore = result.data;
            items = buildMenuItemsFromCategories(result.data);
          }

          setCategories(dataToStore);
          setMenuItems(items);

          // 默认展开行为
          let initialOpenKeys: string[] = [];
          
          if (defaultOpenMode === 'current-article-path' && currentArticleId) {
            // 只展开当前文章的路径
            initialOpenKeys = findArticleAncestorKeys(dataToStore, currentArticleId);
          } else if (defaultOpenMode === 'all') {
            // 展开所有分类
            initialOpenKeys = getAllCategoryKeys(dataToStore);
          } else if (defaultOpenMode === 'none') {
            // 全部折叠
            initialOpenKeys = [];
          } else if (forceOpenRootKeys) {
            // 向后兼容：如果配置了强制展开根节点
            initialOpenKeys = getRootCategoryKeys(dataToStore);
          } else {
            // 默认行为：如果有当前文章就展开文章路径，否则根据 defaultOpenMode
            if (currentArticleId) {
              initialOpenKeys = findArticleAncestorKeys(dataToStore, currentArticleId);
            } else if (defaultOpenMode === 'current-article-path') {
              // 没有当前文章时，全部折叠
              initialOpenKeys = [];
            }
          }

          setOpenKeys(initialOpenKeys);
        }
      } catch (error) {
        console.error('加载目录失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [apiEndpoint, startCategoryId]);

  /**
   * 当 currentArticleId 变化时，展开该文章的路径
   */
  useEffect(() => {
    if (currentArticleId && categories.length > 0) {
      const articlePath = findArticleAncestorKeys(categories, currentArticleId);
      if (articlePath.length > 0) {
        // 保留原有已展开的节点，同时添加新文章的路径
        setOpenKeys(prevKeys => {
          const newKeys = new Set([...prevKeys, ...articlePath]);
          return Array.from(newKeys);
        });
      }
    }
  }, [currentArticleId, categories]);

  /**
   * 处理菜单点击
   */
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    // 只处理文章项的点击
    if (e.key.startsWith('article-')) {
      const articleId = e.key.replace('article-', '');
      
      if (onArticleClick) {
        onArticleClick(articleId);
      } else if (articleNavigationPattern) {
        const path = articleNavigationPattern.replace('{articleId}', articleId);
        router.push(path);
      }
    }
  };

  return (
    <div
      className={`${stylePrefix}-container`}
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
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
            if (forceOpenRootKeys) {
              const rootKeys = getRootCategoryKeys(categories);
              const newKeys = [...new Set([...keys, ...rootKeys])];
              setOpenKeys(newKeys);
            } else {
              setOpenKeys(keys);
            }
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
          description={emptyText}
          style={{ padding: '40px 0' }}
        />
      )}

      {/* 自定义样式 */}
      <style>{`
        /* 滚动条美化 */
        .${stylePrefix}-container::-webkit-scrollbar {
          width: 6px;
        }
        .${stylePrefix}-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .${stylePrefix}-container::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        .${stylePrefix}-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }

        /* 菜单项样式优化 */
        .${stylePrefix}-container .ant-menu-item,
        .${stylePrefix}-container .ant-menu-submenu-title {
          margin: 2px 8px;
          width: calc(100% - 16px);
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        /* 选中态 */
        .${stylePrefix}-container .ant-menu-item-selected {
          background: linear-gradient(90deg, #000 0%, #333 100%) !important;
          color: white !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .${stylePrefix}-container .ant-menu-item-selected .ant-menu-item-icon,
        .${stylePrefix}-container .ant-menu-item-selected .anticon {
          color: white !important;
        }

        /* 悬停态 */
        .${stylePrefix}-container .ant-menu-item:hover:not(.ant-menu-item-selected),
        .${stylePrefix}-container .ant-menu-submenu-title:hover {
          background: #f5f5f5 !important;
          color: #1a1a1a !important;
        }

        /* 子菜单展开图标 */
        .${stylePrefix}-container .ant-menu-submenu-arrow {
          color: #666 !important;
        }

        /* 去掉默认边框 */
        .${stylePrefix}-container .ant-menu-inline {
          border-right: none !important;
        }

        /* 文件夹图标颜色 */
        .${stylePrefix}-container .ant-menu-submenu-title .anticon-folder {
          color: #666;
        }

        /* 文档图标颜色 */
        .${stylePrefix}-container .ant-menu-item .anticon-file-text {
          color: #999;
        }

        /* 激活状态的图标 */
        .${stylePrefix}-container .ant-menu-item-selected .anticon-file-text,
        .${stylePrefix}-container .ant-menu-item-selected .anticon-folder {
          color: white !important;
        }
      `}</style>
    </div>
  );
}

