'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/app/hooks/useResponsive';
import GenericIndexTree, { GenericIndexTreeConfig } from './GenericIndexTree';
import GenericTreeDrawer, { TreeDrawerButton } from './GenericTreeDrawer';

/**
 * 书籍章节导航组件（统一移动端和桌面端）
 * - 移动端：显示为抽屉（Drawer），通过 Header 左侧按钮打开
 * - 桌面端：显示为固定侧边栏（Sidebar），可通过按钮展开/收起
 */

interface BookChapterNavigatorProps {
  currentArticleId?: string;
  bookCategoryId?: string;
  onArticleClick?: (articleId: string) => void;
  onCategoryClick?: () => void;
  visible?: boolean; // 移动端使用，控制抽屉显示
  onClose?: () => void; // 移动端使用，关闭抽屉回调
  expanded?: boolean; // 桌面端使用，控制侧边栏展开/收起
  onExpandedChange?: (expanded: boolean) => void; // 桌面端使用，展开状态变化回调
}

export default function BookChapterNavigator({
  currentArticleId,
  bookCategoryId,
  onArticleClick,
  onCategoryClick,
  visible = false,
  onClose,
  expanded = true, // 默认展开
  onExpandedChange
}: BookChapterNavigatorProps) {
  const { isMobile } = useResponsive();
  const [isExpanded, setIsExpanded] = useState(expanded);

  // 同步外部传入的 expanded 状态
  useEffect(() => {
    setIsExpanded(expanded);
  }, [expanded]);

  // 切换展开/收起状态
  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandedChange?.(newExpanded);
  };

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

  // 桌面端：返回固定侧边栏（支持展开/收起）
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: '45px', // header 的高度
        bottom: 0,
        width: isExpanded ? '280px' : '0',
        background: 'white',
        borderRight: isExpanded ? '1px solid #e8e8e8' : 'none',
        zIndex: 999,
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 0.3s ease, border-right 0.3s ease',
      }}
    >
      {isExpanded && (
        <div style={{ width: '280px', height: '100%' }}>
          {renderTreeContent()}
        </div>
      )}
    </div>
  );
}

/**
 * 书籍章节按钮组件
 * - 移动端：显示为抽屉打开按钮
 * - 桌面端：显示为侧边栏展开/收起按钮
 */
export function BookChapterDrawerButton({
  onClick,
  expanded,
  onToggle
}: {
  onClick?: () => void; // 移动端使用，打开抽屉
  expanded?: boolean; // 桌面端使用，侧边栏是否展开
  onToggle?: () => void; // 桌面端使用，切换展开/收起
}) {
  const { isMobile } = useResponsive();
  
  // 移动端：返回抽屉按钮
  if (isMobile) {
    return <TreeDrawerButton onClick={onClick || (() => {})} />;
  }
  
  // 桌面端：返回展开/收起按钮
  return (
    <TreeDrawerButton 
      onClick={onToggle || (() => {})} 
    />
  );
}

