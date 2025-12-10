'use client';

import React from 'react';
import GenericCategoryTree, { GenericCategoryTreeConfig } from './GenericCategoryTree';

interface ArticleCategorySidebarProps {
  selectedCategoryId?: string | null;
  onCategorySelect?: (categoryId: string | null) => void;
}

/**
 * 文章分类侧边栏组件
 * 固定侧边栏显示目录结构
 */
export default function ArticleCategorySidebar({
  selectedCategoryId,
  onCategorySelect
}: ArticleCategorySidebarProps) {
  const config: GenericCategoryTreeConfig = {
    apiEndpoint: '/api/categories/tree',
    emptyText: '暂无目录',
    forceOpenRootKeys: true,
    navigationPattern: '/archive?category={categoryId}',
    stylePrefix: 'archive-category-sidebar'
  };

  return (
    <GenericCategoryTree
      config={config}
      selectedCategoryId={selectedCategoryId}
      onCategorySelect={onCategorySelect}
    />
  );
}
