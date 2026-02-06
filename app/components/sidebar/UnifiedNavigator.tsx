'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { List } from 'lucide-react';
import { useResponsive } from '@/app/hooks/useResponsive';
import GenericTree, { GenericIndexTreeConfig } from './GenericTree';
import './sidebar.css';

/**
 * 统一导航组件（整合所有 Navigator 功能）
 * - 自动适配移动端（抽屉）和桌面端（侧边栏）
 * - 无 antd 依赖，使用自定义抽屉 + 原生按钮
 */

export interface UnifiedNavigatorProps {
  treeConfig: GenericIndexTreeConfig;
  visible?: boolean;
  expanded?: boolean;
  onClose?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  onCategorySelect?: (categoryId: string | null) => void;
  onArticleClick?: (articleId: string) => void;
  currentArticleId?: string;
  selectedCategoryId?: string | null;
  refreshKey?: number;
  drawerPaddingTop?: boolean;
  drawerSize?: number;
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

  useEffect(() => {
    setIsExpanded(expanded);
  }, [expanded]);

  /* 手机端抽屉打开时锁定 body 滚动，避免抽屉内滚动带动背后页面 */
  useEffect(() => {
    if (!isMobile) return;
    if (visible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMobile, visible]);

  const handleCategoryClick = () => {
    if (isMobile && onClose) onClose();
    if (onCategorySelect && selectedCategoryId !== undefined) {
      onCategorySelect(selectedCategoryId);
    }
  };

  const handleArticleClick = (articleId: string) => {
    if (isMobile && onClose) onClose();
    if (onArticleClick) onArticleClick(articleId);
  };

  const renderTreeContent = () => (
    <GenericTree
      config={treeConfig}
      currentArticleId={currentArticleId}
      onArticleClick={onArticleClick ? handleArticleClick : undefined}
      onCategoryClick={handleCategoryClick}
    />
  );

  if (isMobile) {
    const mobileDrawer = (
      <>
        {visible && (
          <div
            className="sidebar-backdrop"
            role="button"
            tabIndex={0}
            aria-label="关闭"
            onClick={onClose || (() => {})}
            onKeyDown={(e) => e.key === 'Escape' && (onClose || (() => {}))()}
          />
        )}
        <div
          className={`sidebar-drawer ${visible ? 'sidebar-drawer-open' : ''}`}
          style={{ width: drawerSize }}
        >
          <div className={`unified-navigator-drawer-wrap${drawerPaddingTop ? ' has-padding-top' : ''}`}>
            {renderTreeContent()}
          </div>
        </div>
      </>
    );
    return typeof document !== 'undefined'
      ? createPortal(mobileDrawer, document.body)
      : mobileDrawer;
  }

  const desktopSidebar = (
    <div
      key={refreshKey}
      className={`unified-navigator-sidebar${isExpanded ? ' is-expanded' : ''}`}
    >
      {isExpanded && (
        <div className="unified-navigator-sidebar-inner">
          {renderTreeContent()}
        </div>
      )}
    </div>
  );
  return typeof document !== 'undefined'
    ? createPortal(desktopSidebar, document.body)
    : desktopSidebar;
}

export function UnifiedNavigatorButton({
  onClick,
  onToggle,
}: {
  onClick?: () => void;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const { isMobile } = useResponsive();

  return (
    <button
      type="button"
      className="unified-navigator-btn"
      aria-label={isMobile ? '打开菜单' : '切换侧边栏'}
      onClick={isMobile ? (onClick || (() => {})) : (onToggle || (() => {}))}
    >
      <List size={20} />
    </button>
  );
}

export default React.memo(UnifiedNavigator);
