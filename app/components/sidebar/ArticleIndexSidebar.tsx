'use client';

import React from 'react';
import GenericIndexTree, { GenericIndexTreeConfig } from './GenericIndexTree';

/**
 * 文章目录导航组件
 * 展示文章所属的目录结构，支持点击跳转
 */

interface ArticleTocNavProps {
  currentArticleId?: string;
  onArticleClick?: (articleId: string) => void;
  onCategoryClick?: () => void;
}

export default function ArticleTocNav({
  currentArticleId,
  onArticleClick,
  onCategoryClick
}: ArticleTocNavProps) {
  const config: GenericIndexTreeConfig = {
    apiEndpoint: '/api/categories/tree-with-articles',
    emptyText: '暂无文章',
    forceOpenRootKeys: true,
    categoryNavigationPattern: '/archive?category={categoryId}',
    articleNavigationPattern: '/article/{articleId}',
    stylePrefix: 'article-index-sidebar',
    showArticleCount: true,
    dataFormat: 'tree-with-articles'
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
