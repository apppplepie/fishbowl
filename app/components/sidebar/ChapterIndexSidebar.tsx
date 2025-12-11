'use client';

import React from 'react';
import GenericIndexTree, { GenericIndexTreeConfig } from './GenericIndexTree';

/**
 * 书籍目录导航组件
 * 展示书籍所属的目录结构，支持点击跳转
 */

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
  const config: GenericIndexTreeConfig = {
    apiEndpoint: '/api/categories/{id}/tree-with-articles',
    startCategoryId: bookCategoryId,
    emptyText: '暂无内容',
    forceOpenRootKeys: false,
    categoryNavigationPattern: '/bookcase?category={categoryId}',
    articleNavigationPattern: '/book/{articleId}',
    stylePrefix: 'chapter-index-sidebar',
    showArticleCount: false,
    dataFormat: 'flat-tree',
    findBookRoot: true,
    defaultOpenMode: 'current-article-path' // 只展开当前文章路径
  };

  return (
    <GenericIndexTree
      config={config}
      currentArticleId={currentArticleId}
      onArticleClick={onArticleClick}
      onCategoryClick={onCategoryClick}
    />
  );
}
