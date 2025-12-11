'use client';

import React from 'react';
import { useResponsive } from '@/app/hooks/useResponsive';
import GenericIndexTree, { GenericIndexTreeConfig } from './GenericIndexTree';
import GenericTreeDrawer, { TreeDrawerButton } from './GenericTreeDrawer';

/**
 * 书籍章节导航组件（统一移动端和桌面端）
 * - 移动端：显示为抽屉（Drawer），通过 Header 左侧按钮打开
 * - 桌面端：显示为固定侧边栏（Sidebar）
 */

interface BookChapterNavigatorProps {
  currentArticleId?: string;
  bookCategoryId?: string;
  onArticleClick?: (articleId: string) => void;
  onCategoryClick?: () => void;
  visible?: boolean; // 移动端使用，控制抽屉显示
  onClose?: () => void; // 移动端使用，关闭抽屉回调
}

export default function BookChapterNavigator({
  currentArticleId,
  bookCategoryId,
  onArticleClick,
  onCategoryClick,
  visible = false,
  onClose
}: BookChapterNavigatorProps) {
  const { isMobile } = useResponsive();

  const config: GenericIndexTreeConfig = {
    apiEndpoint: '/api/categories/{id}/tree-with-articles',
    startCategoryId: 'cat_bookcase', // 固定使用书架作为根目录
    emptyText: '暂无内容',
    forceOpenRootKeys: false,
    categoryNavigationPattern: '/bookcase?category={categoryId}',
    articleNavigationPattern: '/book/{articleId}',
    stylePrefix: isMobile ? 'chapter-index-drawer' : 'chapter-index-sidebar',
    showArticleCount: false,
    dataFormat: 'flat-tree',
    findBookRoot: false, // 不自动查找，直接使用指定的根目录
    defaultOpenMode: 'current-article-path' // 只展开当前文章路径
  };

  const handleArticleClick = (articleId: string) => {
    onArticleClick?.(articleId);
    if (isMobile && onClose) {
      onClose(); // 移动端点击后关闭抽屉
    }
  };

  const handleCategoryClick = () => {
    onCategoryClick?.();
    if (isMobile && onClose) {
      onClose(); // 移动端点击后关闭抽屉
    }
  };

  // 渲染树内容
  const renderTreeContent = () => (
    <GenericIndexTree
      config={config}
      currentArticleId={currentArticleId}
      onArticleClick={handleArticleClick}
      onCategoryClick={handleCategoryClick}
    />
  );

  if (isMobile) {
    // 移动端：返回抽屉
    return (
      <GenericTreeDrawer
        open={visible}
        onClose={onClose || (() => {})}
        size={280}
      >
        {renderTreeContent()}
      </GenericTreeDrawer>
    );
  }

  // 桌面端：返回固定侧边栏
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: '45px', // header 的高度
        bottom: 0,
        width: '280px',
        background: 'white',
        borderRight: '1px solid #e8e8e8',
        zIndex: 999,
        overflowY: 'auto',
      }}
    >
      {renderTreeContent()}
    </div>
  );
}

/**
 * 书籍章节抽屉按钮组件
 * 用于移动端在 Header 左侧显示展开按钮
 */
export function BookChapterDrawerButton({
  onClick
}: {
  onClick: () => void;
}) {
  return <TreeDrawerButton onClick={onClick} />;
}

