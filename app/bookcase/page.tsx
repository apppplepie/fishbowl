'use client';

import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { usePageShell } from '@/app/contexts/PageShellContext';
import BookcaseActionFloat from '@/app/components/float/BookcaseActionFloat';
import { Empty, LoadEnd, Input, Spin } from '@/app/components/ui';
import MasonryGrid from '@/app/components/layout/MasonryGrid';

// 卡片组件 - 首屏直接加载（启用 SSR）
import ArticleCard from '@/app/components/cards/ArticleCard';
import ImageCard from '@/app/components/cards/ImageCard';
import CodeCard from '@/app/components/cards/CodeCard';
import DiaryCard from '@/app/components/cards/DiaryCard';
import BookCard from '@/app/components/cards/BookCard';

// 目录/侧边栏 - 非关键路径，懒加载
const UnifiedNavigator = dynamic(() => import('@/app/components/sidebar/UnifiedNavigator'), { 
  ssr: false 
});

const UnifiedNavigatorButton = dynamic(
  () => import('@/app/components/sidebar/UnifiedNavigator').then(mod => ({ default: mod.UnifiedNavigatorButton })),
  { ssr: false }
) as React.ComponentType<{ onClick?: () => void; expanded?: boolean; onToggle?: () => void }>;

import { mockBookCards } from '@/app/utils/bookMocks';
import { cacheArticleList, getCachedArticleList, clearBookCache } from '@/app/utils/bookCache';
import '../styles/articles-filter.css';
import { useHeader } from '../contexts/HeaderContext';
import { apiGet } from '@/lib/apiClient';
import { useAccessFilter } from '@/app/hooks/useAccessFilter';
import { useAuth } from '@/app/hooks/useAuth';
import { getSpanForCard, getLayoutForCard } from '@/lib/masonry-server-utils';

// 预缓存所有书籍的文章列表
const preloadAllBookArticleLists = async () => {
  try {
    console.log('开始预缓存所有书籍的文章列表...');

    // 获取所有书籍分类（不包括根分类）
    const response = await apiGet('/api/categories/book-previews?parentId=cat_bookcase', { requiresAuth: true });
    const result = await response.json();

    if (!result.success || !result.books) {
      console.warn('获取书籍列表失败，无法预缓存');
      return;
    }

    const books = result.books;
    console.log(`发现 ${books.length} 本书籍，开始后台预缓存...`);

    // 限制并发数量，避免同时请求太多
    const BATCH_SIZE = 3;
    for (let i = 0; i < books.length; i += BATCH_SIZE) {
      const batch = books.slice(i, i + BATCH_SIZE);

      // 并行处理一批书籍
      const promises = batch.map(async (book: any) => {
        try {
          const categoryId = book.categoryId;

          // 检查是否已经缓存且未过期
          const existing = getCachedArticleList(categoryId);
          if (existing && existing.articleIds && existing.articleIds.length > 0) {
            console.log(`书籍 ${categoryId} 已缓存，跳过`);
            return;
          }

          // 获取该书籍的所有文章
          const params = new URLSearchParams({
            status: 'published',
            limit: '1000',
            offset: '0',
            categoryId: categoryId,
            orderByPath: 'true',
          });

          const articleResponse = await apiGet(`/api/articles/list?${params.toString()}`, { requiresAuth: false });
          const articleResult = await articleResponse.json();

          if (articleResponse.ok && articleResult.success && articleResult.articles) {
            // 后端已排序，直接使用
            const articles = articleResult.articles;
            const articleIds = articles.map((article: any) => article.id.toString());
            
            // 创建文章到分类的映射
            const articleCategoryMap = new Map<string, string>();
            articles.forEach((article: any) => {
              articleCategoryMap.set(article.id.toString(), article.categoryId || categoryId);
            });

            // 缓存
            cacheArticleList(categoryId, articleIds, articleCategoryMap);
            console.log(`预缓存完成：书籍 ${categoryId}，${articleIds.length} 篇文章`);
          }
        } catch (error) {
          console.error(`预缓存书籍失败:`, error);
        }
      });

      // 等待这一批完成
      await Promise.all(promises);

      // 小延迟避免请求过于频繁
      if (i + BATCH_SIZE < books.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('所有书籍文章列表预缓存完成！');
  } catch (error) {
    console.error('预缓存过程中出错:', error);
  }
};

// 注意：此函数仅在本文件内部使用，不需要导出
// Next.js App Router 的页面文件不应该有命名导出（除了 metadata、generateStaticParams 等特定配置）

/**
 * 书架页面
 * 显示cat_bookcase分类下的所有内容
 * 使用瀑布流布局展示各种类型的卡片
 * Box1: 标签筛选区
 * Box2: 瀑布流卡片展示区
 */
function BookcasePageContent() {
  const { isMobile } = useResponsive();
  const { setConfig } = usePageShell();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { filterMode } = useAccessFilter();
  const { user, isLoggedIn } = useAuth();
  
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const { setLeftContent } = useHeader();

  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 过滤条件状态
  const [allTags, setAllTags] = useState<string[]>([]); // 所有可用标签
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 选中的标签
  const [searchKeyword, setSearchKeyword] = useState(''); // 搜索关键词

  // 从 URL 获取状态 (Source of Truth)
  const categoryFromUrl = searchParams.get('category');
  const pathname = usePathname();

  // --- 瀑布流布局计算：用 ResizeObserver 在容器真实尺寸就绪时再测，避免从别的页面回来时测到 0 或错误时机 ---
  const contentContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(1400); // 默认偏大，避免先出现 3 列再闪成 4 列

  useLayoutEffect(() => {
    const el = contentContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const w = el.clientWidth;
      if (w > 0) setContainerWidth(w);
    };

    updateWidth(); // 先测一次
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columnCount = useMemo(() => {
    const w = containerWidth || 0;
    if (w >= 1200) return 4;
    if (w >= 800) return 3;
    return 2;
  }, [containerWidth]);
  const cappedColumns = Math.min(columnCount, 4);

  // 目录抽屉状态（移动端）
  const [drawerVisible, setDrawerVisible] = useState(false);

  // 侧边栏刷新key，用于强制重新渲染侧边栏
  const [sidebarKey, setSidebarKey] = useState(0);

  // 删除模式状态
  const [deleteMode, setDeleteMode] = useState(false);

  // 侧边栏展开状态（桌面端）
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // 默认关闭

  // 延迟加载导航组件
  const [shouldLoadNavigator, setShouldLoadNavigator] = useState(false);

  // --- 导航栏逻辑 (与 archive 一致) ---
  useEffect(() => {
    setLeftContent(
      <UnifiedNavigatorButton
        onClick={() => {
          setShouldLoadNavigator(true);
          setDrawerVisible(true);
        }}
        expanded={sidebarExpanded}
        onToggle={() => {
          setShouldLoadNavigator(true);
          setSidebarExpanded(p => !p);
        }}
      />
    );
    return () => setLeftContent(null);
  }, [setLeftContent, sidebarExpanded]);

  // 同步侧边栏状态到 PageShell，让 box1 也随侧边栏右移
  useEffect(() => {
    setConfig((prev: any) => ({
      ...prev,
      sidebarExpanded: !isMobile ? sidebarExpanded : false,
      sidebarWidth: 280,
    }));
    return () => setConfig((prev: any) => ({ ...prev, sidebarExpanded: false, sidebarWidth: 0 }));
  }, [setConfig, isMobile, sidebarExpanded]);

  const ITEMS_PER_PAGE = 15; // 每页加载15篇

  // 加载所有可用标签和预缓存书籍文章列表
  useEffect(() => {
    const abortController = new AbortController();
    let preloadTimer: NodeJS.Timeout | null = null;
    
    async function loadTags() {
      try {
        const response = await apiGet('/api/tags', { 
          requiresAuth: false,
          signal: abortController.signal 
        });
        
        // 检查是否返回了 HTML（错误页面）
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('API 返回了非 JSON 响应');
          return;
        }
        
        const result = await response.json();

        if (result.success) {
          setAllTags(result.tags.map((tag: any) => tag.name));
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('加载标签请求已取消');
          return;
        }
        console.error('加载标签失败:', error);
      }
    }

    loadTags();

    // 后台预缓存所有书籍的文章列表，提升用户体验
    // 使用 setTimeout 避免阻塞页面初次加载
    preloadTimer = setTimeout(() => {
      if (!abortController.signal.aborted) {
        preloadAllBookArticleLists();
      }
    }, 2000); // 2秒后开始预缓存，给页面加载让路
    
    return () => {
      abortController.abort();
      if (preloadTimer) {
        clearTimeout(preloadTimer);
      }
    };
  }, []);


  // --- 数据加载核心逻辑 (与 archive 一致：loadingRef 防重入) ---
  const loadBookcaseArticles = useCallback(async (currentOffset: number, append: boolean = false, categoryId?: string | null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!append) setLoading(true);

    try {

      let articles: any[] = [];

      // 使用传入的 categoryId 或当前的 categoryFromUrl
      const targetCategory = categoryId !== undefined ? categoryId : categoryFromUrl;

      // 根据是否有category参数决定加载逻辑
      if (!targetCategory || targetCategory === 'cat_bookcase') {
        // 书橱根目录：一次性获取所有书籍分类及其第一篇文章
        const response = await apiGet('/api/categories/book-previews?parentId=cat_bookcase', { 
          requiresAuth: true,
          signal: controller.signal
        });
        
        // 检查响应类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('API 返回了非 JSON 响应（可能是 HTML 错误页面）');
          throw new Error('API 返回了非 JSON 响应');
        }
        
        const result = await response.json();

        if (response.ok && result.success) {
          const books = result.books;
          console.log('书橱根目录 - 获取到的书籍数量:', books.length);

          // 应用分页
          const startIndex = currentOffset;
          const endIndex = startIndex + ITEMS_PER_PAGE;
          const paginatedBooks = books.slice(startIndex, endIndex);

          // 将书籍数据转换为卡片格式
          const bookCards = paginatedBooks.map((book: any, index: number) => {
            // 使用递增的ID确保唯一性
            const bookCardId = 10000 + currentOffset + index;

            if (book.firstArticle) {
              const mainArticle = book.firstArticle;
              return {
                id: bookCardId,
                type: 'book',
                title: book.categoryName,
                description: mainArticle.excerpt || '暂无简介',
                coverImage: mainArticle.coverImage?.url || '/default-book-cover.jpg',
                author: mainArticle.author || '未知作者',
                updatedAt: mainArticle.updatedAt || mainArticle.publishedAt || mainArticle.createdAt || new Date().toISOString(),
                mainArticleId: mainArticle.id.toString(),
                createdAt: mainArticle.publishedAt || mainArticle.createdAt || new Date().toISOString(),
                categoryId: book.categoryId, // 保存书籍的 categoryId，用于删除
              };
            }

            // 如果没有文章，返回基本的书籍信息
            return {
              id: bookCardId,
              type: 'book',
              title: book.categoryName,
              description: '暂无简介',
              coverImage: '/default-book-cover.jpg',
              author: '未知作者',
              updatedAt: new Date().toISOString(),
              mainArticleId: book.categoryId,
              createdAt: new Date().toISOString(),
              categoryId: book.categoryId, // 保存书籍的 categoryId，用于删除
            };
          });

          if (append) {
            setCards(prev => [...prev, ...bookCards]);
          } else {
            setCards(bookCards);
          }

          setHasMore(endIndex < books.length);
          setOffset(endIndex);
        }
      } else {
        // 具体分类目录：显示该目录及其所有子目录下的所有article
        console.log('加载分类目录:', targetCategory);

        // 直接调用API，让API自己处理递归获取所有子分类的文章
        const params = new URLSearchParams({
          status: 'published',
          limit: '1000', // 获取该分类及其所有子分类的所有文章
          offset: '0',
          categoryId: targetCategory,
          orderByPath: 'true', // 按path和order_index排序
        });

        const response = await apiGet(`/api/articles/list?${params.toString()}`, { 
          requiresAuth: false,
          signal: controller.signal
        });
        
        // 检查响应类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('API 返回了非 JSON 响应（可能是 HTML 错误页面）');
          throw new Error('API 返回了非 JSON 响应');
        }
        
        const result = await response.json();

        let allArticles: any[] = [];
        if (response.ok && result.success) {
          // 后端已排序，直接使用
          allArticles = result.articles;
          console.log('分类目录 - API返回文章数量:', allArticles.length);
        } else {
          console.error('获取分类文章失败:', result);
        }

        // 缓存有序的文章ID列表，用于文章切换功能
        const articleIds = allArticles.map(article => article.id.toString());
        cacheArticleList(targetCategory, articleIds);

        // 应用分页
        const startIndex = currentOffset;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedArticles = allArticles.slice(startIndex, endIndex);

        if (append) {
          setCards(prev => [...prev, ...paginatedArticles]);
        } else {
          setCards(paginatedArticles);
        }

        setHasMore(endIndex < allArticles.length);
        setOffset(endIndex);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('请求已取消');
        return;
      }
      console.error('加载文章失败:', error);
      if (!append) {
        // 使用 mock 数据
        setCards(prev => {
          const existingIds = new Set(prev.map(card => card.id));
          const newBooks = mockBookCards.filter(book => !existingIds.has(book.id));
          return [...prev, ...newBooks];
        });
        setHasMore(false);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // 章节管理成功后的刷新函数
  const handleChapterManageSuccess = useCallback(() => {
    console.log('章节管理成功，刷新页面和侧边栏');
    // 清除当前书籍的文章列表缓存，因为目录结构可能发生变化
    if (categoryFromUrl) {
      clearBookCache(categoryFromUrl);
    }
    // 刷新当前页面数据
    setOffset(0);
    setHasMore(true);
    loadBookcaseArticles(0, false, categoryFromUrl);
    // 刷新侧边栏（通过更新key强制重新渲染）
    setSidebarKey(prev => prev + 1);
  }, [categoryFromUrl, loadBookcaseArticles]);

  // --- 监听 URL category 变化 (主触发器，与 archive 一致) ---
  useEffect(() => {
    const timestampParam = searchParams.get('t');
    if (timestampParam) return; // 时间戳由下方 effect 处理

    setCards([]);
    setOffset(0);
    setHasMore(true);
    window.scrollTo({ top: 0, behavior: 'auto' });
    loadBookcaseArticles(0, false, categoryFromUrl);
  }, [categoryFromUrl, loadBookcaseArticles]);

  // 时间戳参数：强制刷新后移除
  useEffect(() => {
    const timestampParam = searchParams.get('t');
    if (!timestampParam) return;
    setCards([]);
    setOffset(0);
    setHasMore(true);
    loadBookcaseArticles(0, false, categoryFromUrl);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete('t');
    const newUrl = newSearchParams.toString() ? `${pathname}?${newSearchParams.toString()}` : pathname;
    router.replace(newUrl);
  }, [searchParams, pathname, router, categoryFromUrl, loadBookcaseArticles]);

  // 获取用户权限等级（未登录用户默认为2）
  const userMaxAccessLevel = useMemo(() => {
    if (!isLoggedIn || !user) return 2; // 未登录用户默认2级
    return user.max_access_level ?? 2;
  }, [isLoggedIn, user]);

  // 过滤文章
  const filteredCards = useMemo(() => {
    const filtered = cards.filter(article => {
      // 获取文章的权限字段（兼容新旧字段名）
      const articleVisibleLevel = article.visible_access_level ?? article.visibleAccessLevel ?? article.max_access_level ?? article.maxAccessLevel ?? 1;
      const articleFullLevel = article.full_access_level ?? article.fullAccessLevel ?? articleVisibleLevel;

      // 根据过滤模式进行过滤
      let matchAccessLevel = false;
      if (filterMode === 'study') {
        // 学习模式：只显示完全公开的文章
        matchAccessLevel = articleFullLevel === 1;
      } else if (filterMode === 'strict') {
        // 严格模式：用户权限 >= 文章完整阅读权限
        matchAccessLevel = userMaxAccessLevel >= articleFullLevel;
      } else if (filterMode === 'loose') {
        // 宽松模式：用户权限 >= 文章可见权限
        matchAccessLevel = userMaxAccessLevel >= articleVisibleLevel;
      }

      // 2. 标签过滤（如果选了标签，文章必须包含至少一个选中的标签）
      const matchTags = selectedTags.length === 0 ||
        article.tags?.some((tag: string) => selectedTags.includes(tag));

      // 3. 关键词过滤（搜索标题、作者、摘要）
      const keyword = searchKeyword.toLowerCase().trim();
      const matchSearch = !keyword ||
        article.title?.toLowerCase().includes(keyword) ||
        article.author?.toLowerCase().includes(keyword) ||
        article.excerpt?.toLowerCase().includes(keyword);

      // 三个条件都要满足
      return matchAccessLevel && matchTags && matchSearch;
    });

    return filtered;
  }, [cards, selectedTags, searchKeyword, filterMode, userMaxAccessLevel]);


  // --- 滚动加载 (Infinite Scroll，与 archive 一致：sentinelRef) ---
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || loadingRef.current || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingRef.current) {
        loadBookcaseArticles(offset, true, categoryFromUrl);
      }
    }, { rootMargin: '400px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, offset, categoryFromUrl, loadBookcaseArticles]);

  const handleCardClick = useCallback((card: any) => {
    if (card.type === 'book') {
      router.push(`/book/${card.mainArticleId}`);
    } else {
      router.push(`/book/${card.id}`);
    }
  }, [router]);

  // --- 卡片 span：统一由 lib-card-layout 的 getSpanForCard 计算（优先 precomputedSpan / layoutHint.spanOverride） ---
  const columnWidth = cappedColumns > 0 ? containerWidth / cappedColumns : undefined;
  const getSpan = useCallback(
    (article: any) => getSpanForCard(article, columnWidth),
    [columnWidth]
  );

  // 创建 box1Content
  const box1Content = useMemo(() => (
    <div style={{ padding: '16px 24px' }}>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '12px',
        alignItems: isMobile ? 'stretch' : 'flex-end',
        justifyContent: isMobile ? 'flex-start' : 'space-between',
      }}>
        <div style={{ width: isMobile ? '100%' : '320px' }}>
          <Input.Search
            className="search-input-transparent"
            placeholder="搜索标题、作者、摘要..."
            value={searchKeyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
            onSearch={(value: string) => setSearchKeyword(value)}
            size="large"
            enterButton={true}
            allowClear
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {(selectedTags.length > 0 || searchKeyword) && (
        <div style={{
          marginTop: '12px',
          fontSize: '13px',
          color: 'rgba(0, 0, 0, 0.9)',
        }}>
          {selectedTags.length > 0 && (
            <span>已选 <strong>{selectedTags.length}</strong> 个标签</span>
          )}
          {selectedTags.length > 0 && searchKeyword && <span> · </span>}
          {searchKeyword && (
            <span>搜索 "<strong>{searchKeyword}</strong>"</span>
          )}
        </div>
      )}
    </div>
  ), [isMobile, searchKeyword, selectedTags]);

  // --- Header 搜索区 (与 archive 一致) ---
  useEffect(() => {
    setConfig((prev: any) => ({ ...prev, box1Content }));
    return () => setConfig((prev: any) => ({ ...prev, box1Content: null }));
  }, [setConfig, box1Content]);

  // --- 卡片渲染逻辑：统一用 span + layout（文章卡用 ArticleCard） ---
  const renderCard = useCallback((article: any, index: number) => {
    const span = getSpan(article);
    const commonProps = {
      card: article,
      onClick: () => handleCardClick(article),
      priority: index < 6,
      masonry: true,
      span,
    };
    const layout = getLayoutForCard(article, columnWidth);
    switch (article.type) {
      case 'image':
        return <ImageCard {...commonProps} layout={layout} />;
      case 'drawing':
        return <ImageCard {...commonProps} layout={layout} card={{ ...article, description: article.excerpt + (article.imageCount ? ` 🎨 ${article.imageCount} 张` : '') }} />;
      case 'code':
        return <CodeCard {...commonProps} layout={layout} />;
      case 'diary':
        return <DiaryCard {...commonProps} layout={layout} />;
      case 'book':
        return (
          <BookCard
            {...commonProps}
            layout={layout}
            showDeleteIcon={deleteMode}
            onDeleteSuccess={() => {
              const bookCategoryId = (article as any).categoryId;
              if (bookCategoryId) clearBookCache(bookCategoryId);
              setOffset(0);
              setHasMore(true);
              loadBookcaseArticles(0, false, categoryFromUrl);
              setSidebarKey(prev => prev + 1);
              setDeleteMode(false);
            }}
          />
        );
      default:
        return <ArticleCard {...commonProps} layout={layout} />;
    }
  }, [handleCardClick, getSpan, columnWidth, deleteMode, categoryFromUrl, loadBookcaseArticles]);

  return (
    <>
      <div>
        <div ref={contentContainerRef} style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {loading && cards.length === 0 ? (
            <div style={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Spin tip=" " />
            </div>
          ) : (
            <div style={{ minHeight: '100vh' }}>
              <MasonryGrid
                key={`masonry-${cappedColumns}`}
                style={{ gridTemplateColumns: `repeat(${cappedColumns}, 1fr)` }}
              >
                {filteredCards.map((card, index) => (
                  <div key={card.id} className="masonry-item animate" style={{ gridRow: `span ${getSpan(card)}` }}>
                    {renderCard(card, index)}
                  </div>
                ))}
              </MasonryGrid>

              {hasMore && (
                <div ref={sentinelRef} style={{ padding: '20px', textAlign: 'center' }}>
                  <Spin size="middle" />
                </div>
              )}

              {!hasMore && cards.length > 0 && <LoadEnd />}
              {!loading && cards.length === 0 && <Empty description="暂无内容" />}
            </div>
          )}
        </div>
      </div>

      {/* 延迟加载导航组件，只有在用户打开时才加载 */}
      {shouldLoadNavigator && (
        <UnifiedNavigator
          treeConfig={{
            apiEndpoint: '/api/categories/{id}/tree-with-articles',
            startCategoryId: 'cat_bookcase',
            emptyText: '暂无书籍',
            forceOpenRootKeys: true,
            categoryNavigationPattern: '/bookcase?category={categoryId}',
            articleNavigationPattern: '/book/{articleId}',
            stylePrefix: 'book-category',
            showArticleCount: false,
            dataFormat: 'flat-tree',
            findBookRoot: false,
            defaultOpenMode: 'all',
          }}
          refreshKey={sidebarKey}
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          selectedCategoryId={categoryFromUrl}
          expanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
          onCategorySelect={(categoryId) => {
            if (categoryId) {
              router.push(`/bookcase?category=${categoryId}`);
            } else {
              router.push('/bookcase');
            }
          }}
          drawerPaddingTop={true}
        />
      )}

      <BookcaseActionFloat
        onChapterManageSuccess={handleChapterManageSuccess}
        deleteMode={deleteMode}
        onDeleteModeChange={(enabled) => {
          setDeleteMode(enabled);
        }}
      />


    </>
  );
}

export default function BookcasePage() {
  return (
    <Suspense fallback={<div style={{ height: '100vh' }}><Spin size="middle"/></div>}>
      <BookcasePageContent />
    </Suspense>
  );
}
