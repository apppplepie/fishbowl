'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Menu, Spin, Empty, Button } from 'antd';
import { UnorderedListOutlined, FolderOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

/**
 * 书籍目录导航抽屉组件
 * 只显示书橱相关的书籍目录结构，支持点击书籍筛选
 */

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  children?: Category[];
}

interface BookCategoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  onCategorySelect?: (categoryId: string | null) => void;
  selectedCategoryId?: string | null;
}

export default function BookCategoryDrawer({
  visible,
  onClose,
  onCategorySelect,
  selectedCategoryId
}: BookCategoryDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuProps['items']>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  /**
   * 构建菜单项（只显示目录）
   */
  const buildMenuItems = (categories: Category[]): MenuProps['items'] => {
    // 按照 order_index 排序
    const sortedCategories = categories.sort((a, b) => a.order_index - b.order_index);

    return sortedCategories.map(category => {
      const children: MenuProps['items'] = [];

      // 添加子分类（递归构建）
      if (category.children && category.children.length > 0) {
        const subCategories = buildMenuItems(category.children);
        children.push(...(subCategories || []));
      }

      return {
        key: `category-${category.id}`,
        icon: <FolderOutlined />,
        label: (
          <span
            style={{ fontWeight: 500, cursor: 'pointer' }}
            onClick={() => handleCategoryTextClick(category.id)}
          >
            {category.name}
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

    if (visible) {
      loadData();
    }
  }, [visible]);

  /**
   * 处理目录文字点击
   */
  const handleCategoryTextClick = (categoryId: string) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
    // 点击后关闭抽屉
    onClose();
  };

  return (
    <>
      <Drawer
        title="书籍目录"
        placement="left"
        open={visible}
        onClose={onClose}
        size={320}
        styles={{
          body: { padding: 0 },
          header: {
            padding: '20px',
            borderBottom: '2px solid #f0f0f0',
            background: '#fafafa',
          },
        }}
      >
        <div
          className="book-category-drawer-container"
          style={{
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
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
                selectedKeys={selectedCategoryId ? [`category-${selectedCategoryId}`] : []}
                openKeys={openKeys}
                onOpenChange={(keys) => setOpenKeys(keys)}
                style={{
                  borderInlineEnd: 'none',
                  background: 'transparent',
                  fontSize: '14px',
                }}
                items={menuItems}
              />
            ) : (
              <Empty
                description="暂无书籍"
                style={{ padding: '40px 0' }}
              />
            )}
          </div>
        </div>

        {/* 自定义样式 */}
        <style>{`
          /* 滚动条美化 */
          .book-category-drawer-container::-webkit-scrollbar {
            width: 6px;
          }
          .book-category-drawer-container::-webkit-scrollbar-track {
            background: transparent;
          }
          .book-category-drawer-container::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 3px;
          }
          .book-category-drawer-container::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.2);
          }

          /* 菜单项样式优化 */
          .book-category-drawer-container .ant-menu-item,
          .book-category-drawer-container .ant-menu-submenu-title {
            margin: 2px 8px;
            width: calc(100% - 16px);
            border-radius: 6px;
            transition: all 0.2s ease;
          }

          /* 选中态 */
          .book-category-drawer-container .ant-menu-item-selected {
            background: linear-gradient(90deg, #000 0%, #333 100%) !important;
            color: white !important;
            font-weight: 600 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          }

          .book-category-drawer-container .ant-menu-item-selected .ant-menu-item-icon,
          .book-category-drawer-container .ant-menu-item-selected .anticon {
            color: white !important;
          }

          /* 悬停态 */
          .book-category-drawer-container .ant-menu-item:hover:not(.ant-menu-item-selected),
          .book-category-drawer-container .ant-menu-submenu-title:hover {
            background: #f5f5f5 !important;
            color: #1a1a1a !important;
          }

          /* 子菜单展开图标 */
          .book-category-drawer-container .ant-menu-submenu-arrow {
            color: #666 !important;
          }

          /* 去掉默认边框 */
          .book-category-drawer-container .ant-menu-inline {
            border-right: none !important;
          }

          /* 文件夹图标颜色 */
          .book-category-drawer-container .ant-menu-submenu-title .anticon-folder,
          .book-category-drawer-container .ant-menu-item .anticon-folder {
            color: #666;
          }

          /* 激活状态的图标 */
          .book-category-drawer-container .ant-menu-item-selected .anticon-folder {
            color: white !important;
          }
        `}</style>
      </Drawer>
    </>
  );
}

/**
 * 书籍目录抽屉按钮组件
 * 用于在页面左上角显示展开按钮
 */
export function BookCategoryDrawerButton({
  onClick
}: {
  onClick: () => void;
}) {
  return (
    <Button
      type="text"
      icon={<UnorderedListOutlined style={{ fontSize: '20px', color: 'white' }} />}
      onClick={onClick}
      style={{ border: 'none' }}
    />
  );
}
