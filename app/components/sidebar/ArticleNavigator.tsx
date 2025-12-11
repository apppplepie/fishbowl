'use client';

import React, { useState } from 'react';
import { Button } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import { useResponsive } from '@/app/hooks/useResponsive';
import GenericIndexTree, { GenericIndexTreeConfig } from './GenericIndexTree';
import GenericTreeDrawer from './GenericTreeDrawer';

/**
 * 文章目录导航组件（统一移动端和桌面端）
 * - 移动端：显示为抽屉（Drawer），通过 Header 左侧按钮打开
 * - 桌面端：显示为固定侧边栏（Sidebar）
 */

interface ArticleNavigatorProps {
  currentArticleId?: string;
  onArticleClick?: (articleId: string) => void;
  onCategoryClick?: () => void;
}

export default function ArticleNavigator({
  currentArticleId,
  onArticleClick,
  onCategoryClick
}: ArticleNavigatorProps) {
  const { isMobile } = useResponsive();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const config: GenericIndexTreeConfig = {
    apiEndpoint: '/api/categories/tree-with-articles',
    emptyText: '暂无文章',
    forceOpenRootKeys: true,
    categoryNavigationPattern: '/archive?category={categoryId}',
    articleNavigationPattern: '/article/{articleId}',
    stylePrefix: isMobile ? 'article-index-drawer' : 'article-index-sidebar',
    showArticleCount: true,
    dataFormat: 'tree-with-articles',
    defaultOpenMode: 'current-article-path' // 只展开当前文章路径
  };

  const handleArticleClick = (articleId: string) => {
    onArticleClick?.(articleId);
    if (isMobile) {
      setDrawerOpen(false); // 移动端点击后关闭抽屉
    }
  };

  const handleCategoryClick = () => {
    onCategoryClick?.();
    if (isMobile) {
      setDrawerOpen(false); // 移动端点击后关闭抽屉
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
    // 移动端：返回按钮 + 抽屉
    return (
      <>
        {/* Header 左侧按钮 */}
        <Button
          type="text"
          icon={<UnorderedListOutlined style={{ fontSize: '20px', color: 'white' }} />}
          onClick={() => setDrawerOpen(true)}
          style={{ border: 'none' }}
        />

        {/* 抽屉 */}
        <GenericTreeDrawer 
          open={drawerOpen} 
          onClose={() => setDrawerOpen(false)} 
          size={280}
        >
          {renderTreeContent()}
        </GenericTreeDrawer>
      </>
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

