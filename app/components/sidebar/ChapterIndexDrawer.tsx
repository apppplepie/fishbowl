'use client';

import React from 'react';
import { Drawer } from 'antd';
import BookCategorySidebar from './ChapterIndexSidebar';

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

  return (
    <Drawer
      title="书籍目录"
      placement="left"
      onClose={onClose}
      open={open}
      size={280}
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      <BookCategorySidebar
        currentArticleId={currentArticleId}
        bookCategoryId={bookCategoryId}
        onArticleClick={handleArticleClick}
        onCategoryClick={handleCategoryClick}
      />
    </Drawer>
  );
}
