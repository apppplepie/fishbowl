'use client';

import React from 'react';
import GenericCategoryTree, { GenericCategoryTreeConfig } from './GenericCategoryTree';
import GenericTreeDrawer, { TreeDrawerButton } from './GenericTreeDrawer';

/**
 * 文章目录导航抽屉组件
 * 只显示目录结构，支持点击目录筛选文章
 */

interface ArticleCategoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  onCategorySelect?: (categoryId: string | null) => void;
  selectedCategoryId?: string | null;
}

export default function ArticleCategoryDrawer({
  visible,
  onClose,
  onCategorySelect,
  selectedCategoryId
}: ArticleCategoryDrawerProps) {
  const handleCategorySelect = (categoryId: string | null) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
    onClose(); // 点击后关闭抽屉
  };

  const config: GenericCategoryTreeConfig = {
    apiEndpoint: '/api/categories/tree',
    emptyText: '暂无目录',
    forceOpenRootKeys: true, // 抽屉中允许全部展开
    navigationPattern: '/archive?category={categoryId}',
    stylePrefix: 'archive-category-drawer'
  };

  return (
    <GenericTreeDrawer open={visible} onClose={onClose} size={320}>
      <GenericCategoryTree
        config={config}
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={handleCategorySelect}
      />
    </GenericTreeDrawer>
  );
}

/**
 * 目录抽屉按钮组件
 * 用于在页面左上角显示展开按钮
 */
export function CategoryDrawerButton({
  onClick
}: {
  onClick: () => void;
}) {
  return <TreeDrawerButton onClick={onClick} />;
}
