'use client';

import React from 'react';
import GenericCategoryTree, { GenericCategoryTreeConfig } from './GenericCategoryTree';

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
  const config: GenericCategoryTreeConfig = {
    apiEndpoint: '/api/categories?type=children&parentId=cat_bookcase',
    rootNodeId: 'cat_bookcase',
    rootNodeName: '书橱',
    emptyText: '暂无书籍',
    loadChildrenForTopLevel: true, // 为每个书籍加载其子分类
    forceOpenRootKeys: true,
    navigationPattern: '/bookcase?category={categoryId}',
    stylePrefix: 'book-category-sidebar'
  };

  return (
    <GenericCategoryTree
      config={config}
      selectedCategoryId={selectedCategoryId}
      onCategorySelect={onCategorySelect}
    />
  );
}
