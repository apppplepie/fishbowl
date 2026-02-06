'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Drawer, Button } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import { useResponsive } from '@/app/hooks/useResponsive';
import GenericTree, { GenericIndexTreeConfig } from './GenericTree';

/**
 * 统一导航组件（整合所有 Navigator 功能）
 * - 自动适配移动端（抽屉）和桌面端（侧边栏）
 * - 通过配置支持所有导航场景（归档、书橱、文章、书籍章节）
 */

export interface UnifiedNavigatorProps {
  // ===== 树配置 =====
  treeConfig: GenericIndexTreeConfig;
  
  // ===== 显示控制 =====
  visible?: boolean;           // 移动端抽屉是否显示
  expanded?: boolean;          // 桌面端侧边栏是否展开
  
  // ===== 回调函数 =====
  onClose?: () => void;                              // 移动端关闭抽屉
  onExpandedChange?: (expanded: boolean) => void;    // 桌面端展开状态变化
  onCategorySelect?: (categoryId: string | null) => void;  // 分类选择回调
  onArticleClick?: (articleId: string) => void;      // 文章点击回调
  
  // ===== 其他 =====
  currentArticleId?: string;       // 当前文章ID（用于高亮）
  selectedCategoryId?: string | null;  // 当前选中的分类ID
  refreshKey?: number;             // 强制刷新key
  drawerPaddingTop?: boolean;      // 抽屉是否需要顶部padding（书橱页面需要）
  drawerSize?: number;             // 抽屉宽度（默认280）
}

function UnifiedNavigator({
  treeConfig,
  visible = false,
  expanded = false,
  onClose,
  onExpandedChange,
  onCategorySelect,
  onArticleClick,
  currentArticleId,
  selectedCategoryId,
  refreshKey,
  drawerPaddingTop = false,
  drawerSize = 280,
}: UnifiedNavigatorProps) {
  const { isMobile } = useResponsive();
  const [isExpanded, setIsExpanded] = useState(expanded);

  // 同步外部传入的 expanded 状态
  useEffect(() => {
    setIsExpanded(expanded);
  }, [expanded]);

  // 处理分类点击
  const handleCategoryClick = () => {
    // 分类点击会通过 navigationPattern 自动处理跳转
    // 移动端需要关闭抽屉
    if (isMobile && onClose) {
      onClose();
    }
    // 如果有回调，也触发
    if (onCategorySelect && selectedCategoryId !== undefined) {
      onCategorySelect(selectedCategoryId);
    }
  };

  // 处理文章点击
  const handleArticleClick = (articleId: string) => {
    // 移动端点击后关闭抽屉
    if (isMobile && onClose) {
      onClose();
    }
    // 触发回调
    if (onArticleClick) {
      onArticleClick(articleId);
    }
    // 注意：如果没有回调，不在这里处理路由跳转
    // 让 GenericTree 使用 articleNavigationPattern 进行路由跳转
  };

  // 渲染树内容
  const renderTreeContent = () => (
    <GenericTree
      config={treeConfig}
      currentArticleId={currentArticleId}
      // 只在有 onArticleClick 回调时传递 handleArticleClick
      // 如果没有回调，传递 undefined，让 GenericTree 使用 articleNavigationPattern
      onArticleClick={onArticleClick ? handleArticleClick : undefined}
      onCategoryClick={handleCategoryClick}
    />
  );

  // 移动端：返回抽屉
  if (isMobile) {
    return (
      <Drawer
        title={null}
        placement="left"
        onClose={onClose || (() => {})}
        open={visible}
        size={drawerSize}
        styles={{
          body: { padding: 0 },
          header: { display: 'none' },
        }}
      >
        <div style={drawerPaddingTop ? { paddingTop: '45px' } : undefined}>
          {renderTreeContent()}
        </div>

        {/* 去掉drawer默认间距 */}
        <style>{`
          .ant-drawer-body {
            padding: 0 !important;
          }
        `}</style>
      </Drawer>
    );
  }

  // 桌面端：固定侧边栏用 Portal 挂到 body，zIndex 高于波浪，不被波浪遮住
  const desktopSidebar = (
    <div
      key={refreshKey}
      style={{
        position: 'fixed',
        left: 0,
        top: '45px', // header 的高度
        bottom: 0,
        width: isExpanded ? '280px' : '0',
        background: 'white',
        borderRight: isExpanded ? '1px solid #e8e8e8' : 'none',
        zIndex: 1500,
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
  return typeof document !== 'undefined'
    ? createPortal(desktopSidebar, document.body)
    : desktopSidebar;
}

/**
 * 统一导航按钮组件
 * - 移动端：显示为抽屉打开按钮
 * - 桌面端：显示为侧边栏展开/收起按钮
 */
export function UnifiedNavigatorButton({
  onClick,
  expanded,
  onToggle
}: {
  onClick?: () => void;      // 移动端使用，打开抽屉
  expanded?: boolean;        // 桌面端使用，侧边栏是否展开
  onToggle?: () => void;     // 桌面端使用，切换展开/收起
}) {
  const { isMobile } = useResponsive();
  
  // 移动端：返回抽屉按钮
  if (isMobile) {
    return (
      <Button
        type="text"
        icon={<UnorderedListOutlined style={{ fontSize: '20px', color: 'white' }} />}
        onClick={onClick || (() => {})}
        style={{ border: 'none' }}
      />
    );
  }
  
  // 桌面端：返回展开/收起按钮
  return (
    <Button
      type="text"
      icon={<UnorderedListOutlined style={{ fontSize: '20px', color: 'white' }} />}
      onClick={onToggle || (() => {})}
      style={{ border: 'none' }}
    />
  );
}

export default React.memo(UnifiedNavigator);
