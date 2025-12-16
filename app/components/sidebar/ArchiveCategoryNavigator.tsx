'use client';

import React, { useState } from 'react';
import { useResponsive } from '@/app/hooks/useResponsive';
import GenericCategoryTree, { GenericCategoryTreeConfig } from './GenericCategoryTree';
import GenericTreeDrawer, { TreeDrawerButton } from './GenericTreeDrawer';

/**
 * 文章归档分类导航组件（统一移动端和桌面端）
 * - 移动端：显示为抽屉（Drawer），通过 Header 左侧按钮打开
 * - 桌面端：显示为固定侧边栏（Sidebar）
 * - 用于归档页面，只显示文章分类结构
 */

interface ArchiveCategoryNavigatorProps {
  visible?: boolean; // 移动端使用，控制抽屉显示
  onClose?: () => void; // 移动端使用，关闭抽屉回调
  onCategorySelect?: (categoryId: string | null) => void;
  selectedCategoryId?: string | null;
}

export default function ArchiveCategoryNavigator({
  visible = false,
  onClose,
  onCategorySelect,
  selectedCategoryId
}: ArchiveCategoryNavigatorProps) {
  const { isMobile } = useResponsive();

  const config: GenericCategoryTreeConfig = {
    apiEndpoint: '/api/categories/tree',
    emptyText: '暂无目录',
    forceOpenRootKeys: true, // 抽屉中允许全部展开
    navigationPattern: '/archive?category={categoryId}',
    stylePrefix: 'archive-category',
    showChapterLabels: false // 归档目录不显示章节编号
  };

  const handleCategorySelect = (categoryId: string | null) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
    if (isMobile && onClose) {
      onClose(); // 移动端点击后关闭抽屉
    }
  };

  // 渲染树内容
  const renderTreeContent = () => (
    <GenericCategoryTree
      config={config}
      selectedCategoryId={selectedCategoryId}
      onCategorySelect={handleCategorySelect}
    />
  );

  if (isMobile) {
    // 移动端：返回抽屉
    return (
      <GenericTreeDrawer
        open={visible}
        onClose={onClose || (() => {})}
        size={320}
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
 * 归档分类抽屉按钮组件
 * 用于移动端在 Header 左侧显示展开按钮
 */
export function ArchiveCategoryDrawerButton({
  onClick
}: {
  onClick: () => void;
}) {
  return <TreeDrawerButton onClick={onClick} />;
}

