'use client';

import React from 'react';
import GenericIndexTree, { GenericIndexTreeConfig } from './GenericIndexTree';
import GenericTreeDrawer from './GenericTreeDrawer';

interface ArticleTocDrawerProps {
  open: boolean;
  onClose: () => void;
  currentArticleId?: string;
  onArticleClick?: (articleId: string) => void;
}

/**
 * 文章目录抽屉组件
 * 用于移动端显示文章目录导航
 */
export default function ArticleTocDrawer({
  open,
  onClose,
  currentArticleId,
  onArticleClick,
}: ArticleTocDrawerProps) {
  const handleArticleClick = (articleId: string) => {
    onArticleClick?.(articleId);
    onClose(); // 点击文章后关闭抽屉
  };

  const handleCategoryClick = () => {
    onClose(); // 点击目录跳转后关闭抽屉
  };

  const config: GenericIndexTreeConfig = {
    apiEndpoint: '/api/categories/tree-with-articles',
    emptyText: '暂无文章',
    forceOpenRootKeys: true,
    categoryNavigationPattern: '/archive?category={categoryId}',
    articleNavigationPattern: '/article/{articleId}',
    stylePrefix: 'article-index-drawer',
    showArticleCount: true,
    dataFormat: 'tree-with-articles',
    defaultOpenMode: 'current-article-path' // 只展开当前文章路径
  };

  return (
    <GenericTreeDrawer open={open} onClose={onClose} size={280}>
      <GenericIndexTree
        config={config}
        currentArticleId={currentArticleId}
        onArticleClick={handleArticleClick}
        onCategoryClick={handleCategoryClick}
      />
    </GenericTreeDrawer>
  );
}
