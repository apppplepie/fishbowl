'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import { usePageShell } from '@/app/contexts/PageShellContext';
import BookcaseActionFloat from '@/app/components/float/BookcaseActionFloat';
import { Empty, LoadEnd, Input, Spin } from '@/app/components/ui';
import MasonryGrid from '@/app/components/layout/MasonryGrid';

// 卡片组件 - 首屏直接加载（启用 SSR）
import CardRenderer from '@/app/components/cards/CardRenderer';
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
  const { currentFishbowlTheme } = useAppTheme();
  const { setConfig } = usePageShell();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { filterMode } = useAccessFilter();
  const { user, isLoggedIn } = useAuth();
  
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false); // 延迟显示的加载状态
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const { setLeftContent } = useHeader();
  
  const offsetRef = useRef(offset);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false); // 防止重复触发加载
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingDelayTimerRef = useRef<number | null>(null);

  // 过滤条件状态
  const [allTags, setAllTags] = useState<string[]>([]); // 所有可用标签
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 选中的标签
  const [searchKeyword, setSearchKeyword] = useState(''); // 搜索关键词

  // 从URL参数获取category
  const categoryFromUrl = searchParams.get('category');
  const pathname = usePathname();

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
  
  // 保存配置引用
  const prevConfigRef = useRef<any | null>(null);

  // 切换目录抽屉的函数（移动端）- 使用 useCallback 固定引用
  const openCategoryDrawer = useCallback(() => {
    setShouldLoadNavigator(true); // 首次打开时加载组件
    setDrawerVisible(true);
  }, []);

  // 切换侧边栏展开/收起（桌面端）- 使用 useCallback 固定引用
  const toggleSidebar = useCallback(() => {
    setShouldLoadNavigator(true); // 首次打开时加载组件
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

  // 同步 offset 到 ref
  useEffect(() => {
      offsetRef.current = offset;
  }, [offset]);

  const ITEMS_PER_PAGE = 15; // 每页加载15篇

  // 强制滚动到顶部
  useEffect(() => {
    // 禁用自动滚动恢复
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // 强制滚动到顶部
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // 重置侧边栏状态
    setSidebarExpanded(false);
    
    // 组件卸载时恢复默认行为
    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

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


  // 加载书架文章数据
  const loadBookcaseArticles = useCallback(async (currentOffset: number, append: boolean = false, categoryId?: string | null) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        // 延迟 500ms 显示"加载中"文字，避免闪烁
        if (loadingDelayTimerRef.current) {
          clearTimeout(loadingDelayTimerRef.current);
        }
        loadingDelayTimerRef.current = window.setTimeout(() => {
          setShowLoading(true);
        }, 500);
      }
      loadingRef.current = true;

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
      setLoading(false);
      setShowLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
      // 清除延迟定时器
      if (loadingDelayTimerRef.current) {
        clearTimeout(loadingDelayTimerRef.current);
        loadingDelayTimerRef.current = null;
      }
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

  // ✅ 组件卸载时清理资源，防止内存泄漏
  useEffect(() => {
    return () => {
      // 取消所有请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // 清除延迟定时器
      if (loadingDelayTimerRef.current) {
        clearTimeout(loadingDelayTimerRef.current);
      }
    };
  }, []);

  // 检查时间戳参数，强制刷新数据（用于从书籍编辑页跳转回来时刷新）
  useEffect(() => {
    const timestampParam = searchParams.get('t');
    
    if (timestampParam) {
      console.log('检测到时间戳参数，强制刷新书橱数据');
      // 强制刷新数据
      setOffset(0);
      setHasMore(true);
      loadBookcaseArticles(0, false, categoryFromUrl);
      // 移除 URL 中的时间戳参数，避免重复刷新
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('t');
      const newUrl = newSearchParams.toString() 
        ? `${pathname}?${newSearchParams.toString()}` 
        : pathname;
      router.replace(newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname, router]);

  // 初次加载和category变化时重新加载
  useEffect(() => {
    const timestampParam = searchParams.get('t');
    // 如果有时间戳参数，上面的 useEffect 会处理，这里跳过
    if (timestampParam) return;
    
    console.log('加载数据库书籍数据，category:', categoryFromUrl);
    setOffset(0);
    setHasMore(true);
    loadBookcaseArticles(0, false, categoryFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFromUrl]);

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

  const triggerLoadMore = useCallback(() => {
    if (!hasMore || loadingRef.current) return;
    loadingRef.current = true;
    loadBookcaseArticles(offsetRef.current, true, categoryFromUrl).finally(() => {
      loadingRef.current = false;
    });
  }, [hasMore, categoryFromUrl, loadBookcaseArticles]);

  // ✅ 使用 IntersectionObserver 代替 scroll 事件（使用 offsetRef 避免闭包问题）
  useEffect(() => {
      if (!hasMore) return;

      const element = loadMoreRef.current;
      if (!element) return;

      const observer = new IntersectionObserver(
          (entries) => {
              if (entries[0].isIntersecting) {
                  triggerLoadMore();
              }
          },
          {
              root: null,
              rootMargin: '400px', // 提前400px加载
              threshold: 0,
          }
      );

      observer.observe(element);

      return () => {
          observer.disconnect();
      };
  }, [hasMore, triggerLoadMore]);

  // ✅ 滚动兜底：偶发 IO 失效时也能继续加载
  useEffect(() => {
      if (!hasMore) return;

      let rafId: number | null = null;
      const thresholdPx = 600;

      const onScroll = () => {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          const viewportH = window.innerHeight;
          const docH = document.documentElement.scrollHeight;
          if (docH - (scrollTop + viewportH) < thresholdPx) {
            triggerLoadMore();
          }
        });
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      return () => {
          window.removeEventListener('scroll', onScroll);
          if (rafId !== null) cancelAnimationFrame(rafId);
      };
  }, [hasMore, triggerLoadMore]);

  // 点击卡片处理
  const handleCardClick = (card: any) => {
    if (card.type === 'text' || card.type === 'image' || card.type === 'code' || card.type === 'diary' || card.type === 'drawing') {
      router.push(`/book/${card.id}`);
    } else if (card.type === 'article') {
      router.push(`/book/${card.id}`);
    } else if (card.type === 'book') {
      router.push(`/book/${card.mainArticleId}`);
    }
  };

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

  // 设置页面配置
  useEffect(() => {
    setConfig((prev: any) => {
        prevConfigRef.current = prev;
        return {
          ...prev,
          box1Content,
          // 移除 box2Style，让内容区域自然显示
        };
    });

    return () => {
        setConfig((prev: any) => {
            if (prevConfigRef.current) {
                return { ...prevConfigRef.current, box1Content: null };
            }
            return { ...prev, box1Content: null };
        });
        prevConfigRef.current = null;
    };
  }, [setConfig, box1Content]);

  // 根据文章类型渲染对应的卡片
  const renderCard = useCallback((article: any, index: number) => {
    const handleClick = () => handleCardClick(article);
    const masonryClassName = 'masonry-item';

    switch (article.type) {
      case 'text':
        return <ArticleCard key={article.id} card={article} onClick={handleClick} className={masonryClassName} />;
      case 'image':
        return <ImageCard key={article.id} card={article} onClick={handleClick} className={masonryClassName} />;
      case 'drawing':
        return <ImageCard key={article.id} card={{
          ...article,
          description: article.excerpt + (article.imageCount ? ` 🎨 ${article.imageCount} 张` : '')
        }} onClick={handleClick} className={masonryClassName} />;
      case 'code':
        return <CodeCard key={article.id} card={article} onClick={handleClick} className={masonryClassName} />;
      case 'diary':
        return <DiaryCard key={article.id} card={article} onClick={handleClick} className={masonryClassName} />;
      case 'book':
        return (
          <BookCard 
            key={article.id} 
            card={article} 
            onClick={handleClick}
            showDeleteIcon={deleteMode}
            className={masonryClassName}
            onDeleteSuccess={() => {
              console.log('书籍删除成功，刷新页面和侧边栏');
              const bookCategoryId = (article as any).categoryId;
              if (bookCategoryId) {
                clearBookCache(bookCategoryId);
              }
              setOffset(0);
              setHasMore(true);
              loadBookcaseArticles(0, false, categoryFromUrl);
              setSidebarKey(prev => prev + 1);
              setDeleteMode(false);
            }}
          />
        );
      default:
        return <CardRenderer key={article.id} card={article} onClick={handleClick} className={masonryClassName} />;
    }
  }, [handleCardClick, deleteMode, categoryFromUrl, loadBookcaseArticles]);

  return (
    <>
      <div style={{
        transform: isMobile ? 'none' : (sidebarExpanded ? 'translateX(280px)' : 'translateX(0)'),
        transition: 'transform 0.3s ease',
        willChange: 'transform',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {showLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
              {/* 加载中... */}
            </div>
          ) : filteredCards.length === 0 ? (
            <Empty
              icon="📚"
              title="书架还是空的"
              description="试试调整筛选条件或添加一些书籍吧？"
            />
          ) : (
            <>
              <div style={{ minHeight: '400px' }}>
                <MasonryGrid minColumns={isMobile ? 1 : 2}>
                  {filteredCards.map((card, index) => renderCard(card, index))}
                </MasonryGrid>
              </div>

              {/* IntersectionObserver 哨兵元素 */}
              <div ref={loadMoreRef} style={{ height: 1 }} />

              {/* 加载更多提示 */}
              {loadingMore && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#999',
                }}>
                  <Spin size="small" />
                  <div style={{ marginTop: '12px', fontSize: '14px' }}>
                    加载更多...
                  </div>
                </div>
              )}

              {/* 没有更多数据提示 */}
              {!hasMore && filteredCards.length > 0 && (
                <LoadEnd />
              )}
            </>
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
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>加载中...</div>}>
      <BookcasePageContent />
    </Suspense>
  );
}
