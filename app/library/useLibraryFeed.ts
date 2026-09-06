'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LibraryView } from './types';
import { feedKey, patchFeed, readFeed, writeFeed } from './feedCache';

interface FeedState {
  key: string;
  cards: any[];
  offset: number;
  hasMore: boolean;
  searchedOnServer: boolean;
  loading: boolean;
  /** 首屏数据已就位（缓存复原或请求完成），用于跳过重复的首屏请求 */
  ready: boolean;
  /** 本次进入该 key 时是由缓存复原的 */
  fromCache: boolean;
  /** 缓存里记下的滚动位置 */
  cachedScrollTop: number;
}

function initState(view: LibraryView, categoryId: string | null, keyword: string): FeedState {
  const key = feedKey(view.key, categoryId, keyword);
  const cached = readFeed(key);
  if (cached) {
    return {
      key,
      cards: cached.cards,
      offset: cached.offset,
      hasMore: cached.hasMore,
      searchedOnServer: cached.searchedOnServer,
      loading: false,
      ready: true,
      fromCache: true,
      cachedScrollTop: cached.scrollTop,
    };
  }
  return {
    key,
    cards: [],
    offset: 0,
    hasMore: true,
    searchedOnServer: true,
    loading: true,
    ready: false,
    fromCache: false,
    cachedScrollTop: 0,
  };
}

function mergeCards(prev: any[], incoming: any[]): any[] {
  const seen = new Set(prev.map((c) => c.id));
  return [...prev, ...incoming.filter((c) => !seen.has(c.id))];
}

/**
 * 书房列表的数据引擎：分页、无限滚动、请求取消、内存缓存。
 * 视角/分类/关键词构成 key，key 一变就整体换一份状态；命中缓存则直接复原，不发请求。
 */
export function useLibraryFeed(view: LibraryView, categoryId: string | null, keyword: string) {
  const key = feedKey(view.key, categoryId, keyword);

  const [state, setState] = useState<FeedState>(() => initState(view, categoryId, keyword));

  // key 变了就在渲染期直接换掉，避免先闪一帧上一个列表
  let current = state;
  if (state.key !== key) {
    current = initState(view, categoryId, keyword);
    setState(current);
  }

  const stateRef = useRef(current);
  stateRef.current = current;

  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (append: boolean) => {
      // 追加请求要防重入；重新加载（换分类、换关键词、刷新）则总是取消上一次
      if (append && loadingRef.current) return;

      const base = stateRef.current;
      if (append && !base.hasMore) return;

      const requestId = ++requestIdRef.current;
      loadingRef.current = true;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!append) setState((s) => (s.key === base.key ? { ...s, loading: true } : s));

      try {
        const page = await view.fetchPage({
          offset: append ? base.offset : 0,
          limit: view.pageSize,
          categoryId,
          keyword,
          signal: controller.signal,
        });

        const latest = stateRef.current;
        if (latest.key !== base.key || requestIdRef.current !== requestId) return;

        const cards = append ? mergeCards(latest.cards, page.cards) : page.cards;
        writeFeed(base.key, {
          cards,
          offset: page.nextOffset,
          hasMore: page.hasMore,
          searchedOnServer: page.searchedOnServer,
          scrollTop: readFeed(base.key)?.scrollTop ?? 0,
        });
        setState((s) =>
          s.key === base.key
            ? {
                ...s,
                cards,
                offset: page.nextOffset,
                hasMore: page.hasMore,
                searchedOnServer: page.searchedOnServer,
                loading: false,
                ready: true,
              }
            : s
        );
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('[library] 加载失败:', err);
        setState((s) => (s.key === base.key ? { ...s, loading: false, ready: true, hasMore: false } : s));
      } finally {
        if (requestIdRef.current === requestId) loadingRef.current = false;
      }
    },
    [view, categoryId, keyword]
  );

  // 首屏：没有缓存才请求
  useEffect(() => {
    if (stateRef.current.key !== key) return;
    if (stateRef.current.ready) return;
    load(false);
  }, [key, current.ready, load]);

  // 离开当前 key 时记下滚动位置，回来时好复原。
  // 必须是 layout effect：React 先跑完所有 cleanup 再跑 setup，
  // 这样才能保证「记录旧位置」发生在外层「滚到新位置」之前。
  useLayoutEffect(() => {
    const savedKey = key;
    return () => {
      patchFeed(savedKey, { scrollTop: window.scrollY });
    };
  }, [key]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // 依赖里必须带上 offset：IntersectionObserver 只在「相交状态发生跃迁」时回调，
  // 而追加一页后 sentinel 往往仍停在视口内（页面还不够高），状态没变就不会再触发。
  // 每加载一页就重建 observer，新的 observe() 必定投递一次初始回调，
  // 于是会继续加载，直到 sentinel 被内容顶出视口或 hasMore 为 false。
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !current.hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) load(true);
      },
      { rootMargin: '400px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [current.hasMore, current.key, current.offset, load]);

  const reload = useCallback(() => load(false), [load]);

  return {
    cards: current.cards,
    loading: current.loading,
    hasMore: current.hasMore,
    searchedOnServer: current.searchedOnServer,
    /** 缓存复原时的滚动位置；本次是新请求则为 null */
    restoredScrollTop: current.fromCache ? current.cachedScrollTop : null,
    sentinelRef,
    reload,
  };
}
