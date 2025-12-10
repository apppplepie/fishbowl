'use client';

import React from 'react';
import GenericIndexTree, { GenericIndexTreeConfig } from './GenericIndexTree';
import GenericTreeDrawer from './GenericTreeDrawer';

interface BookTocDrawerProps {
  open: boolean;
  onClose: () => void;
  currentArticleId?: string;
  bookCategoryId?: string;
  onArticleClick?: (articleId: string) => void;
}

/**
 * 书籍目录抽屉组件
 * 用于移动端显示书籍目录导航
 */
export default function BookTocDrawer({
  open,
  onClose,
  currentArticleId,
  bookCategoryId,
  onArticleClick,
}: BookTocDrawerProps) {
  const handleArticleClick = (articleId: string) => {
    onArticleClick?.(articleId);
    onClose(); // 点击文章后关闭抽屉
  };

  const handleCategoryClick = () => {
    onClose(); // 点击目录跳转后关闭抽屉
  };

  const config: GenericIndexTreeConfig = {
    apiEndpoint: '/api/categories/{id}/tree-with-articles',
    startCategoryId: bookCategoryId,
    emptyText: '暂无内容',
    forceOpenRootKeys: false,
    categoryNavigationPattern: '/bookcase?category={categoryId}',
    articleNavigationPattern: '/book/{articleId}',
    stylePrefix: 'chapter-index-drawer',
    showArticleCount: false,
    dataFormat: 'flat-tree',
    findBookRoot: true
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
