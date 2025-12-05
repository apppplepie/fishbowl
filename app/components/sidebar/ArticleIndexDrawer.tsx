'use client';

import React from 'react';
import { Drawer } from 'antd';
import ArticleTocNav from './ArticleIndexSidebar';

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

  return (
    <>
      <Drawer
        title={null}
        placement="left"
        onClose={onClose}
        open={open}
        size={280}
        styles={{
          body: {
            padding: 0,
          },
          header: { display: 'none' },
        }}
      >
        <ArticleTocNav
          currentArticleId={currentArticleId}
          onArticleClick={handleArticleClick}
          onCategoryClick={handleCategoryClick}
        />
      </Drawer>

      {/* 自定义样式 */}
      <style>{`
        /* 去掉drawer默认间距 */
        .ant-drawer-body {
          padding: 0 !important;
        }
      `}</style>
    </>
  );
}

