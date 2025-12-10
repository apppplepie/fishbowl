'use client';

import React from 'react';
import GenericCategoryTree, { GenericCategoryTreeConfig } from './GenericCategoryTree';
import GenericTreeDrawer, { TreeDrawerButton } from './GenericTreeDrawer';

/**
 * 书籍目录导航抽屉组件
 * 只显示书橱相关的书籍目录结构，支持点击书籍筛选
 */

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
  const handleCategorySelect = (categoryId: string | null) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
    onClose(); // 点击后关闭抽屉
  };

  const config: GenericCategoryTreeConfig = {
    apiEndpoint: '/api/categories?type=children&parentId=cat_bookcase',
    rootNodeId: 'cat_bookcase',
    rootNodeName: '书橱',
    emptyText: '暂无书籍',
    loadChildrenForTopLevel: true,
    forceOpenRootKeys: true,
    navigationPattern: '/bookcase?category={categoryId}',
    stylePrefix: 'book-category-drawer'
  };

  return (
    <GenericTreeDrawer open={visible} onClose={onClose} size={320}>
      <div style={{ paddingTop: '45px' }}>
        <GenericCategoryTree
          config={config}
          selectedCategoryId={selectedCategoryId}
          onCategorySelect={handleCategorySelect}
        />
      </div>
    </GenericTreeDrawer>
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
  return <TreeDrawerButton onClick={onClick} />;
}
