'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Spin, Empty } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  children?: Category[];
}

interface BookCategorySidebarProps {
  selectedCategoryId?: string | null;
  onCategorySelect?: (categoryId: string | null) => void;
}

/**
 * 书籍分类侧边栏组件
 * 固定侧边栏显示书橱目录结构，根目录为书橱
 */
export default function BookCategorySidebar({
  selectedCategoryId,
  onCategorySelect
}: BookCategorySidebarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuProps['items']>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  /**
   * 递归构建菜单项（用于子分类）
   */
  const buildMenuItemsRecursive = (categories: Category[]): MenuProps['items'] => {
    return categories.map(category => {
      const children: MenuProps['items'] = [];

      // 添加子分类（递归构建）
      if (category.children && category.children.length > 0) {
        const subCategories = buildMenuItemsRecursive(category.children);
        children.push(...(subCategories || []));
      }

      return {
        key: `category-${category.id}`,
        icon: <FolderOutlined />,
        label: (
          <span style={{ fontWeight: 500 }}>
            {category.name}
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
    // 创建书橱根节点
    const bookcaseRoot = {
      key: 'category-cat_bookcase',
      icon: <FolderOutlined />,
      label: (
        <span style={{ fontWeight: 500 }}>
          书橱
        </span>
      ),
      children: buildMenuItemsRecursive(categories),
    };

    return [bookcaseRoot];
  };

  /**
   * 收集所有应该展开的 keys
   */
  const getAllCategoryKeys = (categories: Category[]): string[] => {
    const keys: string[] = ['category-cat_bookcase']; // 书橱根节点
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
    // 书橱根节点不能被关闭
    return ['category-cat_bookcase'];
  };


  /**
   * 加载书橱分类树
   */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 获取书橱的子分类（书籍）
        const response = await fetch('/api/categories?type=children&parentId=cat_bookcase');
        const result = await response.json();

        if (result.success) {
          // 为每个书籍分类获取其子分类
          const categoriesWithChildren = await Promise.all(
            result.categories.map(async (category: Category) => {
              try {
                const childrenRes = await fetch(`/api/categories?type=children&parentId=${category.id}`);
                const childrenResult = await childrenRes.json();
                return {
                  ...category,
                  children: childrenResult.success ? childrenResult.categories : []
                };
              } catch (error) {
                console.error(`加载分类 ${category.id} 的子分类失败:`, error);
                return { ...category, children: [] };
              }
            })
          );

          setCategories(categoriesWithChildren);
          const items = buildMenuItems(categoriesWithChildren);
          setMenuItems(items);

          // 默认展开所有目录（书橱目录固定展开）
          const allKeys = getAllCategoryKeys(categoriesWithChildren);
          setOpenKeys(allKeys);
        }
      } catch (error) {
        console.error('加载书橱目录失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /**
   * 处理菜单选择（点击文字部分）
   */
  const handleMenuSelect: MenuProps['onSelect'] = (e) => {
    // 只处理目录项的选择
    if (e.key.startsWith('category-')) {
      const categoryId = e.key.replace('category-', '');

      if (onCategorySelect) {
        onCategorySelect(categoryId);
      } else {
        // 如果没有提供回调函数，跳转到书架页面
        if (categoryId === 'cat_bookcase') {
          // 点击书橱根节点，跳转到书架首页
          router.push('/bookcase');
        } else {
          // 点击书籍分类，筛选该分类
          router.push(`/bookcase?category=${categoryId}`);
        }
      }
    }
  };

  return (
    <div
      className="book-category-sidebar-container"
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
          onSelect={handleMenuSelect}
        />
      ) : (
        <Empty
          description="暂无书籍"
          style={{ padding: '40px 0' }}
        />
      )}

      {/* 自定义样式 */}
      <style>{`
        /* 滚动条美化 */
        .book-category-sidebar-container::-webkit-scrollbar {
          width: 6px;
        }
        .book-category-sidebar-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .book-category-sidebar-container::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        .book-category-sidebar-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }

        /* 菜单项样式优化 */
        .book-category-sidebar-container .ant-menu-item,
        .book-category-sidebar-container .ant-menu-submenu-title {
          margin: 2px 8px;
          width: calc(100% - 16px);
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        /* 选中态 */
        .book-category-sidebar-container .ant-menu-item-selected {
          background: linear-gradient(90deg, #000 0%, #333 100%) !important;
          color: white !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .book-category-sidebar-container .ant-menu-item-selected .ant-menu-item-icon,
        .book-category-sidebar-container .ant-menu-item-selected .anticon {
          color: white !important;
        }

        /* 悬停态 */
        .book-category-sidebar-container .ant-menu-item:hover:not(.ant-menu-item-selected),
        .book-category-sidebar-container .ant-menu-submenu-title:hover {
          background: #f5f5f5 !important;
          color: #1a1a1a !important;
        }

        /* 子菜单展开图标 */
        .book-category-sidebar-container .ant-menu-submenu-arrow {
          color: #666 !important;
        }

        /* 去掉默认边框 */
        .book-category-sidebar-container .ant-menu-inline {
          border-right: none !important;
        }

        /* 文件夹图标颜色 */
        .book-category-sidebar-container .ant-menu-submenu-title .anticon-folder,
        .book-category-sidebar-container .ant-menu-item .anticon-folder {
          color: #666;
        }

        /* 激活状态的图标 */
        .book-category-sidebar-container .ant-menu-item-selected .anticon-folder {
          color: white !important;
        }
      `}</style>
    </div>
  );
}
