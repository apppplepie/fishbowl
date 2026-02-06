'use client';
import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { message, Modal } from '@/app/components/ui';
import { useHeader } from '@/app/contexts/HeaderContext';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useResponsive } from '@/app/hooks/useResponsive';
import { UnifiedNavigatorButton, UnifiedNavigatorProps } from '@/app/components/sidebar/UnifiedNavigator';
import { useRouter } from 'next/navigation';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';

// Lazy load UnifiedNavigator to reduce initial bundle size
const UnifiedNavigatorLazy = dynamic(() => import('@/app/components/sidebar/UnifiedNavigator'), {
  ssr: false
});

interface ClientHeaderSetterProps {
  articleId: string;
  editMode?: 'view' | 'edit' | 'preview';
}

export default function ClientHeaderSetter({ articleId, editMode = 'view' }: ClientHeaderSetterProps) {
  const { setLeftContent } = useHeader();
  const { setConfig } = usePageShell();
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [shouldLoadNavigator, setShouldLoadNavigator] = useState(false);

  // 同步侧边栏状态到 PageShell，让 box1+box2 在电脑端被侧边栏挤压
  useEffect(() => {
    setConfig((prev: any) => ({
      ...prev,
      sidebarExpanded: !isMobile ? sidebarExpanded : false,
      sidebarWidth: 280,
    }));
    return () => setConfig((prev: any) => ({ ...prev, sidebarExpanded: false, sidebarWidth: 0 }));
  }, [setConfig, isMobile, sidebarExpanded]);

  // 配置消息提示位置，避免被 header 遮挡
  useEffect(() => {
    console.log('文章页面加载完成');
    message.config({
      top: 60, // header 45px + 15px 间距
      duration: 2,
      maxCount: 3,
    });
  }, []);

  // 监听编辑模式，防止意外离开页面导致数据丢失
  useEffect(() => {
    if (editMode !== 'edit') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '你还有未保存的更改，确定要离开吗？';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editMode]);

  // 设置滚动恢复
  useEffect(() => {
    if ('scrollRestoration' in history) {
      (history as any).scrollRestoration = 'auto';
    }
  }, []);

  // 处理文章点击 - 编辑模式下需要确认
  const handleArticleClick = useCallback((newArticleId: string) => {
    if (editMode === 'edit') {
      Modal.confirm({
        title: '确认离开当前文章？',
        icon: <ExclamationCircleOutlined />,
        content: '你还有未保存的更改，确定要放弃这些更改并跳转到其他文章吗？',
        okText: '确定离开',
        cancelText: '继续编辑',
        okType: 'danger',
        onOk() {
          router.push(`/article/${newArticleId}`);
        },
      });
    } else {
      router.push(`/article/${newArticleId}`);
    }
  }, [editMode, router]);

  const openCategoryDrawer = useCallback(() => {
    setShouldLoadNavigator(true);
    setDrawerVisible(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setShouldLoadNavigator(true);
    setSidebarExpanded((prev) => !prev);
  }, []);

  // 使用 useMemo 缓存 leftContent，避免每次渲染都创建新元素
  const leftContentElement = useMemo(
    () => (
      <UnifiedNavigatorButton
        onClick={openCategoryDrawer}
        expanded={sidebarExpanded}
        onToggle={toggleSidebar}
      />
    ),
    [openCategoryDrawer, sidebarExpanded, toggleSidebar]
  );

  // 设置 Header 的 leftContent
  useEffect(() => {
    setLeftContent(leftContentElement);

    return () => {
      setLeftContent(null);
    };
  }, [setLeftContent, leftContentElement]);

  return (
    <>
      {/* 统一的文章导航组件（自动适配移动端/桌面端） - 延迟加载 */}
      {shouldLoadNavigator && (
        <UnifiedNavigatorLazy
          treeConfig={{
            apiEndpoint: '/api/categories/tree-with-articles',
            emptyText: '暂无文章',
            forceOpenRootKeys: true,
            categoryNavigationPattern: '/archive?category={categoryId}',
            articleNavigationPattern: '/article/{articleId}',
            stylePrefix: 'article-index-sidebar',
            showArticleCount: true,
            dataFormat: 'tree-with-articles',
            defaultOpenMode: 'current-article-path',
          }}
          currentArticleId={articleId}
          onArticleClick={handleArticleClick}
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          expanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
        />
      )}
    </>
  );
}
