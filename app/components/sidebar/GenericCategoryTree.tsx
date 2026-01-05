'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Spin, Empty } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useRouter } from 'next/navigation';
import { apiGetJson } from '@/lib/apiClient';
import { addChapterNumbers, formatNodeLabel } from '@/app/utils/chapterNumbering';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  depth?: number;
  path?: string;
  children?: Category[];
}

export interface GenericCategoryTreeConfig {
  /**
   * API接口路径
   * 例如: '/api/categories/tree' 或 '/api/categories?type=children&parentId=xxx'
   */
  apiEndpoint: string;

  /**
   * 根节点ID（可选）
   * 如果提供，会在顶部创建一个根节点（如"书橱"）
   */
  rootNodeId?: string;

  /**
   * 根节点显示名称
   */
  rootNodeName?: string;

  /**
   * 空状态提示文字
   */
  emptyText?: string;

  /**
   * 是否需要加载根节点的子分类
   * 如果为true，会为每个一级分类加载其子分类
   */
  loadChildrenForTopLevel?: boolean;

  /**
   * 禁止关闭的根节点keys
   * 例如: ['category-cat_bookcase']
   */
  forceOpenRootKeys?: boolean;

  /**
   * 点击分类后的跳转路径模板
   * 使用 {categoryId} 作为占位符
   * 例如: '/bookcase?category={categoryId}'
   */
  navigationPattern?: string;

  /**
   * CSS类名前缀，用于样式隔离
   */
  stylePrefix?: string;

  /**
   * 是否显示章节编号（如第1卷、第2章等）
   * 默认值为 true，适用于书籍导航；归档导航应该设为 false
   */
  showChapterLabels?: boolean;
}

interface GenericCategoryTreeProps {
  config: GenericCategoryTreeConfig;
  selectedCategoryId?: string | null;
  onCategorySelect?: (categoryId: string | null) => void;
}

/**
 * 通用分类树组件
 * 用于显示纯分类树结构（不包含文章）
 */
export default function GenericCategoryTree({
  config,
  selectedCategoryId,
  onCategorySelect
}: GenericCategoryTreeProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuProps['items']>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  
  const {
    apiEndpoint,
    rootNodeId,
    rootNodeName = '根目录',
    emptyText = '暂无目录',
    loadChildrenForTopLevel = false,
    forceOpenRootKeys = false,
    navigationPattern,
    stylePrefix = 'generic-category-tree',
    showChapterLabels = true
  } = config;

  /**
   * 递归构建菜单项（用于子分类）
   */
  const buildMenuItemsRecursive = (categories: Category[]): MenuProps['items'] => {
    // 按照 order_index 排序
    const sortedCategories = [...categories].sort((a, b) => a.order_index - b.order_index);

    return sortedCategories.map(category => {
      const children: MenuProps['items'] = [];

      // 添加子分类（递归构建）
      if (category.children && category.children.length > 0) {
        const subCategories = buildMenuItemsRecursive(category.children);
        children.push(...(subCategories || []));
      }

      // 格式化分类标签（添加章节号）
      const formattedLabel = formatNodeLabel(category as any, {
        showChapterLabel: showChapterLabels,
        showArticleNumber: false,
      });

      return {
        key: `category-${category.id}`,
        icon: <FolderOutlined />,
        label: (
          <span
            style={{ fontWeight: 500, cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              handleCategoryClick(category.id);
            }}
          >
            {formattedLabel}
          </span>
        ),
        children: children.length > 0 ? children : undefined,
      };
    });
  };

  /**
   * 构建菜单项（只显示目录）
   */
  const buildMenuItems = (categories: Category[]): MenuProps['items'] => {
    // 添加章节编号（在构建菜单之前）
    const numberedCategories = addChapterNumbers(categories);
    
    // 如果有根节点配置，创建根节点
    if (rootNodeId && rootNodeName) {
      const rootNode = {
        key: `category-${rootNodeId}`,
        icon: <FolderOutlined />,
        label: (
          <span
            style={{ fontWeight: 500, cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              handleCategoryClick(rootNodeId);
            }}
          >
            {rootNodeName}
          </span>
        ),
        children: buildMenuItemsRecursive(numberedCategories),
      };

      return [rootNode];
    }

    // 否则直接返回分类列表
    return buildMenuItemsRecursive(numberedCategories);
  };

  /**
   * 收集所有应该展开的 keys
   */
  const getAllCategoryKeys = (categories: Category[]): string[] => {
    const keys: string[] = [];
    if (rootNodeId) {
      keys.push(`category-${rootNodeId}`);
    }
    
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
   * 获取根目录的 keys（禁止关闭的目录）
   */
  const getRootCategoryKeys = (categories: Category[]): string[] => {
    if (!forceOpenRootKeys) {
      return [];
    }

    const keys: string[] = [];
    
    // 如果有根节点，添加根节点key
    if (rootNodeId) {
      keys.push(`category-${rootNodeId}`);
    } else {
      // 否则添加所有顶级分类的key
      categories
        .filter(cat => cat.parent_id === null)
        .forEach(cat => keys.push(`category-${cat.id}`));
    }
    
    return keys;
  };

  /**
   * 处理分类点击
   */
  const handleCategoryClick = (categoryId: string) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    } else if (navigationPattern) {
      // 如果有导航模式，执行跳转
      const path = navigationPattern.replace('{categoryId}', categoryId);
      router.push(path);
    }
  };

  /**
   * 加载分类树
   */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await apiGetJson<{ success: boolean; data?: Category[]; categories?: Category[] }>(apiEndpoint);

        if (result.success) {
          let categoriesData = result.data || result.categories || [];

          // 如果配置了rootNodeId，且API返回的是包含根节点的树，提取根节点的children
          if (rootNodeId && categoriesData.length === 1 && categoriesData[0].id === rootNodeId) {
            categoriesData = categoriesData[0].children || [];
          }

          // 如果需要为顶级分类加载子分类（递归加载所有层级）
          if (loadChildrenForTopLevel) {
            // 递归加载函数：为分类及其所有子孙分类加载子分类
            const loadChildrenRecursive = async (category: Category): Promise<Category> => {
              try {
                const childrenResult = await apiGetJson<{
                  success: boolean;
                  categories?: Category[];
                }>(`/api/categories?type=children&parentId=${category.id}`);
                
                if (childrenResult.success && childrenResult.categories && childrenResult.categories.length > 0) {
                  // 递归为每个子分类也加载其子分类
                  const childrenWithGrandchildren = await Promise.all(
                    childrenResult.categories.map((child: Category) => loadChildrenRecursive(child))
                  );
                  
                  return {
                    ...category,
                    children: childrenWithGrandchildren
                  };
                } else {
                  return {
                    ...category,
                    children: []
                  };
                }
              } catch (error) {
                console.error(`加载分类 ${category.id} 的子分类失败:`, error);
                return { ...category, children: [] };
              }
            };

            // 为所有顶级分类递归加载子分类
            categoriesData = await Promise.all(
              categoriesData.map((category: Category) => loadChildrenRecursive(category))
            );
          }

          setCategories(categoriesData);
          const items = buildMenuItems(categoriesData);
          setMenuItems(items);

          // 默认展开行为
          if (forceOpenRootKeys) {
            const rootKeys = getRootCategoryKeys(categoriesData);
            setOpenKeys(rootKeys);
          } else {
            // 展开所有
            const allKeys = getAllCategoryKeys(categoriesData);
            setOpenKeys(allKeys);
          }
        }
      } catch (error) {
        console.error('加载目录失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [apiEndpoint]);

  /**
   * 处理菜单点击
   */
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    // 只处理目录项的点击
    if (e.key.startsWith('category-')) {
      const categoryId = e.key.replace('category-', '');
      handleCategoryClick(categoryId);
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
          <Spin />
          <div style={{ marginTop: '8px', color: '#999' }}>加载中...</div>
        </div>
      ) : menuItems && menuItems.length > 0 ? (
        <Menu
          mode="inline"
          selectedKeys={selectedCategoryId ? [`category-${selectedCategoryId}`] : []}
          openKeys={openKeys}
          onOpenChange={(keys) => {
            if (forceOpenRootKeys) {
              // 获取根目录的 keys，这些不能被关闭
              const rootKeys = getRootCategoryKeys(categories);
              // 确保根目录始终在展开列表中
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
        .${stylePrefix}-container .ant-menu-submenu-title .anticon-folder,
        .${stylePrefix}-container .ant-menu-item .anticon-folder {
          color: #666;
        }

        /* 激活状态的图标 */
        .${stylePrefix}-container .ant-menu-item-selected .anticon-folder {
          color: white !important;
        }
      `}</style>
    </div>
  );
}

