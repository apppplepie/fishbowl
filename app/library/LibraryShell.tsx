'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Empty, LoadEnd, Spin } from '@/app/components/ui';
import { useHeader } from '@/app/contexts/HeaderContext';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useAccessFilter } from '@/app/hooks/useAccessFilter';
import { useAuth } from '@/app/hooks/useAuth';
import { useResponsive } from '@/app/hooks/useResponsive';
import { GUEST_ACCESS_LEVEL, matchesAccessFilter } from '@/lib/accessFilter';
import { getColumnCountFromContainerWidth } from '@/lib/masonry-server-utils';
import { feedKey, invalidateFeed } from './feedCache';
import LibraryBox1 from './LibraryBox1';
import { useLibraryFeed } from './useLibraryFeed';
import { LIBRARY_VIEWS, resolveViewKey } from './views';
import type { LibraryViewKey } from './types';

import '@/app/styles/articles-filter.css';

const UnifiedNavigator = dynamic(() => import('@/app/components/sidebar/UnifiedNavigator'), { ssr: false });
const UnifiedNavigatorButton = dynamic(
  () => import('@/app/components/sidebar/UnifiedNavigator').then((mod) => ({ default: mod.UnifiedNavigatorButton })),
  { ssr: false }
) as React.ComponentType<{ onClick?: () => void; expanded?: boolean; onToggle?: () => void }>;

const SIDEBAR_WIDTH = 280;
/** 进入列表时停在整页 15vh 处 */
const ENTER_SCROLL_VH = 15;

interface Filters {
  view: LibraryViewKey;
  keyword: string;
  tags: string[];
}

const EMPTY_TAGS: string[] = [];

export default function LibraryShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile } = useResponsive();
  const { setConfig } = usePageShell();
  const { setLeftContent, setActiveNavKey } = useHeader();
  const { filterMode } = useAccessFilter();
  const { user, isLoggedIn } = useAuth();

  // --- URL 是唯一真相：视角 + 分类 ---
  const viewKey = resolveViewKey(searchParams.get('view'));
  const view = LIBRARY_VIEWS[viewKey];
  const categoryId = view.tree ? searchParams.get('category') : null;

  // header 导航里的「文章 / 书籍 / 画作」共用 /library，高亮得由我们自己报
  useEffect(() => {
    setActiveNavKey(`/library?view=${viewKey}`);
    return () => setActiveNavKey(null);
  }, [setActiveNavKey, viewKey]);

  // --- 筛选条件：换视角时清空 ---
  const [filters, setFilters] = useState<Filters>({ view: viewKey, keyword: '', tags: EMPTY_TAGS });
  let activeFilters = filters;
  if (filters.view !== viewKey) {
    activeFilters = { view: viewKey, keyword: '', tags: EMPTY_TAGS };
    setFilters(activeFilters);
  }

  const handleKeywordCommit = useCallback((keyword: string) => {
    setFilters((prev) => (prev.keyword === keyword ? prev : { ...prev, keyword }));
  }, []);
  const handleTagsChange = useCallback((tags: string[]) => {
    setFilters((prev) => ({ ...prev, tags }));
  }, []);

  // --- 数据 ---
  const feed = useLibraryFeed(view, categoryId, activeFilters.keyword);
  const currentKey = feedKey(viewKey, categoryId, activeFilters.keyword);

  const reload = useCallback(() => {
    invalidateFeed(viewKey);
    feed.reload();
  }, [viewKey, feed]);

  // 从发布页带 ?refresh=1 回来：列表缓存已经过时，丢掉重拉，并把这个参数从地址里抹掉
  const refreshFlag = searchParams.get('refresh');
  useEffect(() => {
    if (!refreshFlag) return;
    invalidateFeed(viewKey);
    feed.reload();
    const next = new URLSearchParams(searchParams.toString());
    next.delete('refresh');
    router.replace(`/library?${next.toString()}`, { scroll: false });
    // 只认这一次刷新信号，reload / searchParams 的引用变化不该再触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshFlag, viewKey]);

  // --- 容器宽度 / 列数 ---
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(1400);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      if (width > 0) setContainerWidth(width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columns = useMemo(
    () => Math.min(getColumnCountFromContainerWidth(containerWidth), 4),
    [containerWidth]
  );
  const columnWidth = columns > 0 ? containerWidth / columns : containerWidth;

  // --- 侧边栏 ---
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [treeKey, setTreeKey] = useState(0);
  const refreshTree = useCallback(() => setTreeKey((k) => k + 1), []);

  const hasTree = Boolean(view.tree);

  useEffect(() => {
    if (!hasTree) {
      setLeftContent(null);
      return;
    }
    setLeftContent(
      <UnifiedNavigatorButton
        onClick={() => setDrawerVisible(true)}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((prev) => !prev)}
      />
    );
    return () => setLeftContent(null);
  }, [setLeftContent, hasTree, sidebarExpanded]);

  // 没有目录的视角（画）不该留着上一个视角的侧边栏偏移
  useEffect(() => {
    if (!hasTree) setSidebarExpanded(false);
  }, [hasTree]);

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      sidebarExpanded: hasTree && !isMobile ? sidebarExpanded : false,
      sidebarWidth: hasTree ? SIDEBAR_WIDTH : 0,
    }));
    return () => setConfig((prev) => ({ ...prev, sidebarExpanded: false, sidebarWidth: 0 }));
  }, [setConfig, hasTree, isMobile, sidebarExpanded]);

  // --- box1：元素引用要稳定，打字才不会把整棵树带着重渲染 ---
  const box1Content = useMemo(
    () => (
      <LibraryBox1
        key={viewKey}
        isMobile={isMobile}
        showFilters={view.filters}
        onKeywordCommit={handleKeywordCommit}
        onTagsChange={handleTagsChange}
      />
    ),
    [viewKey, isMobile, view.filters, handleKeywordCommit, handleTagsChange]
  );

  useEffect(() => {
    setConfig((prev) => ({ ...prev, box1Content }));
    return () => setConfig((prev) => ({ ...prev, box1Content: null }));
  }, [setConfig, box1Content]);

  // --- 进入/切换时的滚动位置：有缓存就复原，没有就停在 15vh ---
  useLayoutEffect(() => {
    const top =
      feed.restoredScrollTop != null
        ? feed.restoredScrollTop
        : Math.round(window.innerHeight * (ENTER_SCROLL_VH / 100));
    window.scrollTo({ top, behavior: 'auto' });
    // restoredScrollTop 只在 key 变化时有意义，不进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  // --- 前端过滤：权限 + 标签 +（后端没搜时）关键词 ---
  const userLevel = useMemo(
    () => (isLoggedIn && user ? user.max_access_level ?? GUEST_ACCESS_LEVEL : GUEST_ACCESS_LEVEL),
    [isLoggedIn, user]
  );

  const visibleCards = useMemo(() => {
    const keyword = feed.searchedOnServer ? '' : activeFilters.keyword.toLowerCase();
    return feed.cards.filter((card) => {
      if (!matchesAccessFilter(card, filterMode, userLevel)) return false;
      if (activeFilters.tags.length > 0) {
        if (!card.tags?.some((tag: string) => activeFilters.tags.includes(tag))) return false;
      }
      if (keyword) {
        const hit =
          card.title?.toLowerCase().includes(keyword) ||
          card.author?.toLowerCase().includes(keyword) ||
          card.excerpt?.toLowerCase().includes(keyword) ||
          card.description?.toLowerCase().includes(keyword);
        if (!hit) return false;
      }
      return true;
    });
  }, [feed.cards, feed.searchedOnServer, activeFilters.keyword, activeFilters.tags, filterMode, userLevel]);

  const Cards = view.Cards;
  const Float = view.Float;
  // 删除模式：卡片上的删除按钮还在，但右下角只留一个加号之后暂时没有开关入口
  const [deleteMode, setDeleteMode] = useState(false);
  useEffect(() => setDeleteMode(false), [viewKey, categoryId]);

  const contentStyle: React.CSSProperties = hasTree
    ? { maxWidth: 1400, margin: '0 auto' }
    : { width: '100%', minWidth: 0, padding: '0 8px', boxSizing: 'border-box' };

  return (
    <>
      <div ref={contentRef} style={contentStyle}>
        {feed.loading && feed.cards.length === 0 ? (
          <div style={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin tip=" " />
          </div>
        ) : (
          <div style={{ minHeight: '100vh' }}>
            <Cards
              cards={visibleCards}
              containerWidth={containerWidth}
              columns={columns}
              columnWidth={columnWidth}
              categoryId={categoryId}
              deleteMode={deleteMode}
              reload={reload}
            />

            {feed.hasMore && (
              <div ref={feed.sentinelRef} style={{ padding: '20px', textAlign: 'center' }}>
                <Spin size="middle" />
              </div>
            )}
            {!feed.hasMore && visibleCards.length > 0 && <LoadEnd />}
            {!feed.loading && visibleCards.length === 0 && <Empty description="暂无内容" />}
          </div>
        )}
      </div>

      {view.tree && (
        // 目录树内部会缓存已加载的数据，换视角/要求刷新时必须整块重建
        <UnifiedNavigator
          key={`${viewKey}-${treeKey}`}
          treeConfig={view.tree}
          refreshKey={treeKey}
          visible={drawerVisible}
          expanded={sidebarExpanded}
          onClose={() => setDrawerVisible(false)}
          onExpandedChange={setSidebarExpanded}
          selectedCategoryId={categoryId}
          onCategorySelect={(id) => {
            router.push(
              id ? `/library?view=${viewKey}&category=${id}` : `/library?view=${viewKey}`,
              { scroll: false }
            );
            if (isMobile) setDrawerVisible(false);
          }}
          drawerPaddingTop={false}
        />
      )}

      {Float && (
        <Float
          categoryId={categoryId}
          deleteMode={deleteMode}
          setDeleteMode={setDeleteMode}
          reload={reload}
          refreshTree={refreshTree}
        />
      )}
    </>
  );
}
