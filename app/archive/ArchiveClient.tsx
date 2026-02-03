'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { apiGet } from '@/lib/apiClient';
import { Empty, LoadEnd, Input, Spin } from '@/app/components/ui';
import { useHeader } from '../contexts/HeaderContext';
import { useAccessFilter } from '@/app/hooks/useAccessFilter';
import { useAuth } from '@/app/hooks/useAuth';
import { getCardSpan, getImageCardSpan, type CardType } from '@/lib/utils';

// 轻量级瀑布流组件
import MasonryGrid from '@/app/components/layout/MasonryGrid';

// 卡片组件 - 首屏直接加载（启用 SSR）
import ArticleCard from '@/app/components/cards/ArticleCard';
import ImageCard from '@/app/components/cards/ImageCard';
import CodeCard from '@/app/components/cards/CodeCard';
import DiaryCard from '@/app/components/cards/DiaryCard';

// 目录/侧边栏 - 非关键路径，懒加载
const UnifiedNavigator = dynamic(() => import('@/app/components/sidebar/UnifiedNavigator'), {
    ssr: false
});

const UnifiedNavigatorButton = dynamic(
    () => import('@/app/components/sidebar/UnifiedNavigator').then(mod => ({ default: mod.UnifiedNavigatorButton })),
    { ssr: false }
) as React.ComponentType<{ onClick?: () => void; expanded?: boolean; onToggle?: () => void }>;

// 操作悬浮按钮 - 非首屏关键交互，延迟加载
const ArchiveActionFloat = dynamic(() => import('@/app/components/float/ArchiveActionFloat'), {
    ssr: false
});

/** 按小块 append，利用 requestIdleCallback 或 requestAnimationFrame 回退，减少长帧 */
function appendInChunks(
    newItems: any[],
    appendFn: (items: any[]) => void,
    chunkSize = 20
) {
    let i = 0;
    const runner = () => {
        const end = Math.min(i + chunkSize, newItems.length);
        const slice = newItems.slice(i, end);
        appendFn(slice);
        i = end;
        if (i < newItems.length) {
            if (typeof (window as any).requestIdleCallback !== 'undefined') {
                (window as any).requestIdleCallback(runner, { timeout: 200 });
            } else {
                requestAnimationFrame(runner);
            }
        }
    };
    if (typeof (window as any).requestIdleCallback !== 'undefined') {
        (window as any).requestIdleCallback(runner, { timeout: 200 });
    } else {
        requestAnimationFrame(runner);
    }
}

interface ArchiveClientProps {
    initialArticles?: any[];
    initialHasMore?: boolean;
    initialOffset?: number; // 新增：服务端已渲染的数量
}

/**
 * 文章归档页面客户端组件
 * 只负责 7+ 条、搜索/筛选/分页的交互部分
 * 首屏 6 条由 Server Component 渲染，无需 hydration
 */
export default function ArchiveClient({
    initialArticles = [],
    initialHasMore = true,
    initialOffset = 0
}: ArchiveClientProps) {
    const { isMobile } = useResponsive();
    const { currentFishbowlTheme } = useAppTheme();
    const { setConfig } = usePageShell();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { filterMode } = useAccessFilter();
    const { user, isLoggedIn } = useAuth();

    // 使用服务端预取的数据初始化
    const [cards, setCards] = useState<any[]>(initialArticles);
    const [loading, setLoading] = useState(false); // 首屏已由 server 渲染，不需要 loading
    const [showLoading, setShowLoading] = useState(false); // 延迟显示加载中文字
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [offset, setOffset] = useState(initialOffset || initialArticles.length);
    const offsetRef = useRef(offset); // 用于 IntersectionObserver
    const loadingDelayTimerRef = useRef<number | null>(null); // 用于延迟显示加载中
    const { setLeftContent } = useHeader();

    // 过滤条件状态
    const [allTags, setAllTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [searchKeyword, setSearchKeyword] = useState('');

    // 目录抽屉状态（移动端）
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    const [isPending, startTransition] = useTransition();

    // 侧边栏展开状态（桌面端）
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const scrollerRef = useRef<HTMLDivElement | null>(null); // 整页滚动时保持 null，用 viewport
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const [masonryColumnWidth, setMasonryColumnWidth] = useState<number | null>(null);

    // 延迟加载导航组件，只有在用户打开时才加载
    const [shouldLoadNavigator, setShouldLoadNavigator] = useState(false);

    // 延迟挂载 ArchiveActionFloat，非首屏关键交互
    const [shouldLoadActionFloat, setShouldLoadActionFloat] = useState(false);

    // 进入页面时重置侧边栏状态
    useEffect(() => {
        setSidebarExpanded(false);
    }, []);
    const loadingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const prevConfigRef = useRef<any | null>(null);
    const prevInitialArticlesRef = useRef(initialArticles); // 用于追踪 initialArticles 变化

    const ITEMS_PER_PAGE = 15;

    // 切换目录抽屉的函数
    const openCategoryDrawer = useCallback(() => {
        setShouldLoadNavigator(true); // 首次打开时加载组件
        setDrawerVisible(true);
    }, []);

    const toggleSidebar = useCallback(() => {
        setShouldLoadNavigator(true); // 首次打开时加载组件
        setSidebarExpanded((prev) => !prev);
    }, []);

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

    useEffect(() => {
        setLeftContent(leftContentElement);
        return () => {
            setLeftContent(null);
        };
    }, [setLeftContent, leftContentElement]);

    // 从 URL 参数初始化分类筛选
    useEffect(() => {
        const categoryParam = searchParams.get('category');
        if (categoryParam) {
            setSelectedCategoryId(categoryParam);
        }
    }, [searchParams]);

    // 同步 offset 到 ref
    useEffect(() => {
        offsetRef.current = offset;
    }, [offset]);

    const loadArticles = useCallback(async (
        currentOffset: number,
        append: boolean = false,
        categoryId?: string | null,
        query?: { search?: string } // 新增：支持搜索参数
    ) => {
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

            const params = new URLSearchParams({
                status: 'published',
                limit: ITEMS_PER_PAGE.toString(),
                offset: currentOffset.toString(),
            });

            if (categoryId) {
                params.append('categoryId', categoryId);
            }

            // 添加搜索参数
            if (query?.search) {
                params.append('search', query.search);
            }

            const response = await apiGet(
                `/api/articles/list?${params.toString()}`,
                {
                    requiresAuth: false,
                    signal: controller.signal // 添加 signal
                }
            );

            const result = await response.json();

            if (response.ok && result.success) {
                const articles = result.articles || [];

                if (append) {
                    setCards(prev => {
                        const existingIds = new Set(prev.map(card => card.id));
                        const newArticles = articles.filter(
                            (article: any) => !existingIds.has(article.id)
                        );
                        if (newArticles.length === 0) return prev;
                        appendInChunks(newArticles, (batch) =>
                            setCards(p => [...p, ...batch])
                        );
                        return prev;
                    });
                    // append 时 appendInChunks 内部会分批 setCards，这里只更新 offset/hasMore
                } else {
                    setCards([]);
                    requestAnimationFrame(() => {
                        appendInChunks(articles, (batch) =>
                            setCards(prev => [...prev, ...batch])
                        );
                    });
                }

                setHasMore(articles.length === ITEMS_PER_PAGE);
                setOffset(currentOffset + articles.length);
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('请求已取消');
                return;
            }
            console.error('加载文章失败:', error);
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

    const triggerLoadMore = useCallback(() => {
        if (!hasMore || loadingRef.current) return;
        loadingRef.current = true;
        loadArticles(offsetRef.current, true, selectedCategoryId).finally(() => {
            loadingRef.current = false;
        });
    }, [hasMore, loadArticles, selectedCategoryId]);

    // 哨兵在 MasonryGrid 内、横跨整行；root 为 null 时用 viewport，有内部滚动容器时挂 scrollerRef
    // 哨兵观察逻辑优化
    useEffect(() => {
        const node = loadMoreRef.current;
        if (!node) return;

        // 如果当前已经没有更多，或者正在加载，暂时不观察（或者在回调里挡住）
        // 注意：不要在依赖项里写过多变量，否则 io 会频繁销毁重启
        const io = new IntersectionObserver(
            ([entry]) => {
                console.log('👀', entry.isIntersecting, entry.boundingClientRect.top);
                if (entry.isIntersecting) {
                    triggerLoadMore();
                }
            },
            {
                root: null,
                rootMargin: '0px 0px 600px 0px', // 👈 关键：下方提前 600px
                threshold: 0,
            }
        );

        io.observe(node);
        return () => io.disconnect();
    }, [hasMore, triggerLoadMore]); // 只需要依赖这两个

    // 已使用 IntersectionObserver，不再用 scroll 兜底（避免每帧回调）

    // 注释掉：服务端已经提供初始数据，不需要客户端再次加载
    // 移除此 useEffect 避免重复加载和 React Strict Mode 的双重调用问题

    // ✅ 同步 initialArticles 到 cards 状态（修复页面切换时的闪烁问题）
    useEffect(() => {
        // 只在 initialArticles 引用改变时才更新
        if (initialArticles !== prevInitialArticlesRef.current) {
            prevInitialArticlesRef.current = initialArticles;
            if (initialArticles.length > 0) {
                setCards(initialArticles);
                setOffset(initialArticles.length);
            }
        }
    }, [initialArticles]);

    // ✅ 发布后强制刷新一次（通过 ?refresh=1）
    useEffect(() => {
        const refreshFlag = searchParams.get('refresh');
        if (refreshFlag === '1') {
            setOffset(0);
            setHasMore(true);
            loadArticles(0, false, selectedCategoryId).finally(() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('refresh');
                const query = params.toString();
                router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
            });
        }
    }, [searchParams, pathname, router, loadArticles, selectedCategoryId]);

    // ✅ 进入归档页时从顶部开始（不再记录/恢复滚动位置）
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // ✅ 追踪筛选条件的变化，只在变化时滚动到顶部
    const prevFilterRef = useRef<{ categoryId: string | null; tagsCount: number; keyword: string }>({
        categoryId: null,
        tagsCount: 0,
        keyword: ''
    });

    useEffect(() => {
        const currentFilter = {
            categoryId: selectedCategoryId,
            tagsCount: selectedTags.length,
            keyword: searchKeyword
        };

        const prevFilter = prevFilterRef.current;

        // 只在筛选条件真正改变时才滚动到顶部（排除首次渲染）
        const hasChanged =
            prevFilter.categoryId !== currentFilter.categoryId ||
            prevFilter.tagsCount !== currentFilter.tagsCount ||
            prevFilter.keyword !== currentFilter.keyword;

        if (hasChanged && (prevFilter.categoryId !== null || prevFilter.tagsCount > 0 || prevFilter.keyword)) {
            // 延迟执行，确保 DOM 已更新
            requestAnimationFrame(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // 更新 ref
        prevFilterRef.current = currentFilter;
    }, [selectedCategoryId, selectedTags.length, searchKeyword]);

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

    // ✅ 延迟挂载 ArchiveActionFloat：非首屏关键交互，延迟 2 秒后加载
    useEffect(() => {
        const timer = setTimeout(() => {
            setShouldLoadActionFloat(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    // ✅ 防抖搜索 + startTransition：将大量渲染标为过渡，优先保证输入/交互流畅
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            startTransition(() => {
                if (searchKeyword.trim()) {
                    setOffset(0);
                    setHasMore(true);
                    loadArticles(0, false, selectedCategoryId, { search: searchKeyword });
                } else {
                    setOffset(0);
                    setHasMore(true);
                    loadArticles(0, false, selectedCategoryId);
                }
            });
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [searchKeyword, selectedCategoryId, loadArticles]);

    // 获取用户权限等级（未登录用户默认为2）
    const userMaxAccessLevel = useMemo(() => {
        if (!isLoggedIn || !user) return 2; // 未登录用户默认2级
        return user.max_access_level ?? 2;
    }, [isLoggedIn, user]);

    // 过滤文章（权限过滤 + 标签筛选，搜索由服务端处理）
    const filteredCards = useMemo(() => {
        return cards.filter(article => {
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

            // 标签过滤
            const matchTags = selectedTags.length === 0 ||
                article.tags?.some((tag: string) => selectedTags.includes(tag));

            return matchAccessLevel && matchTags;
        });
    }, [cards, selectedTags, filterMode, userMaxAccessLevel]);


    // 点击卡片处理
    const handleCardClick = useCallback((card: any) => {
        if (card.type === 'text' || card.type === 'image' || card.type === 'code' ||
            card.type === 'diary' || card.type === 'drawing' || card.type === 'article') {
            router.push(`/article/${card.id}`);
        }
    }, [router]);

    // ✅ 添加 hover 预取逻辑，提升导航速度
    // 使用 Set 记录正在预取的 ID，避免重复请求
    const prefetchingRef = useRef<Set<string>>(new Set());

    const handleCardHover = useCallback((card: any) => {
        if (card.type === 'text' || card.type === 'image' || card.type === 'code' ||
            card.type === 'diary' || card.type === 'drawing' || card.type === 'article') {
            const articleId = card.id;
            if (prefetchingRef.current.has(articleId)) return;
            prefetchingRef.current.add(articleId);
            router.prefetch(`/article/${articleId}`);
            apiGet(`/api/articles/${articleId}`, { requiresAuth: false })
                .then(() => {
                    // 预取成功，数据已经在 HTTP 缓存中
                })
                .catch(() => {
                    // 预取失败，忽略错误（不影响用户体验）
                })
                .finally(() => {
                    // 延迟移除标记，避免短时间内重复预取
                    setTimeout(() => {
                        prefetchingRef.current.delete(articleId);
                    }, 5000);
                });
        }
    }, [router]);

    // ✅ 修复 handleCategorySelect - 立即加载数据
    const handleCategorySelect = useCallback((categoryId: string | null) => {
        setSelectedCategoryId(categoryId);
        setOffset(0);
        setHasMore(true);
        setSelectedTags([]);
        setSearchKeyword('');

        // 立即加载新分类的第一页
        loadArticles(0, false, categoryId);
    }, [loadArticles]);

    // 渲染卡片：语义化 masonry（masonry + span/dynamic），卡片内部负责 class/style
    const renderCard = useCallback((article: any, index: number, span?: number) => {
        const handleClick = () => handleCardClick(article);
        const handleHover = () => handleCardHover(article);
        const isPriority = index < 6;
        const articleId = article.id;

        let cardType: CardType | null = null;
        if (article.type === 'code' || article.codePreview) {
            cardType = 'CODE_CARD';
        } else if (article.type === 'text' || article.type === 'article' || article.content) {
            cardType = 'TEXT_CARD';
        } else if (article.type === 'diary' || article.excerpt) {
            cardType = 'DIARY_CARD';
        } else if (article.type === 'book') {
            cardType = 'BOOK_CARD';
        }

        const spanOrDynamic = cardType ? getCardSpan(cardType) : 'dynamic';
        const masonrySpan = spanOrDynamic === 'dynamic' ? undefined : spanOrDynamic;

        switch (article.type) {
            case 'text':
                return (
                    <ArticleCard
                        key={articleId}
                        card={article}
                        onClick={handleClick}
                        onMouseEnter={handleHover}
                        priority={isPriority}
                        masonry
                        span={span ?? masonrySpan ?? 18}
                    />
                );
            case 'image':
                return (
                    <ImageCard
                        key={articleId}
                        card={article}
                        onClick={handleClick}
                        onMouseEnter={handleHover}
                        priority={isPriority}
                        masonry
                        span={span ?? getImageCardSpan(article, masonryColumnWidth ?? undefined)}
                    />
                );
            case 'drawing':
                return (
                    <ImageCard
                        key={articleId}
                        card={{
                            ...article,
                            description: article.excerpt + (article.imageCount ? ` 🎨 ${article.imageCount} 张` : '')
                        }}
                        onClick={handleClick}
                        onMouseEnter={handleHover}
                        priority={isPriority}
                        masonry
                        span={span ?? getImageCardSpan(article, masonryColumnWidth ?? undefined)}
                    />
                );
            case 'code':
                return (
                    <CodeCard
                        key={articleId}
                        card={article}
                        onClick={handleClick}
                        onMouseEnter={handleHover}
                        priority={isPriority}
                        masonry
                        span={span ?? masonrySpan}
                    />
                );
            case 'diary':
                return (
                    <DiaryCard
                        key={articleId}
                        card={article}
                        onClick={handleClick}
                        onMouseEnter={handleHover}
                        priority={isPriority}
                        masonry
                        span={span ?? masonrySpan}
                    />
                );
            default:
                return (
                    <ArticleCard
                        key={articleId}
                        card={article}
                        onClick={handleClick}
                        onMouseEnter={handleHover}
                        priority={isPriority}
                        masonry
                        span={span ?? masonrySpan ?? 18}
                    />
                );
        }
    }, [handleCardClick, handleCardHover, masonryColumnWidth]);

    const getMasonrySpan = useCallback((article: any) => {
        if (article.type === 'image' || article.type === 'drawing') {
            if (masonryColumnWidth && masonryColumnWidth > 0) {
                return getImageCardSpan(article, masonryColumnWidth);
            }
            return article.precomputedSpan ?? getImageCardSpan(article);
        }

        return article.precomputedSpan ?? undefined;
    }, [masonryColumnWidth]);

    // Box1 内容
    // 第 318-360 行，修改 box1Content
    const box1Content = useMemo(() => (
        <div style={{ padding: '16px 24px' }}>
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '12px',
                alignItems: isMobile ? 'stretch' : 'flex-end',
                justifyContent: isMobile ? 'flex-start' : 'space-between',
            }}>
                <div style={{ width: isMobile ? '100%' : '320px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    {isPending && (
                        <Spin size="small" style={{ flexShrink: 0 }} />
                    )}
                </div>
            </div>

            {/* 只在有筛选条件时才显示统计信息，避免数据加载时的闪烁 */}
            {(selectedTags.length > 0 || searchKeyword || selectedCategoryId) && (
                <div style={{
                    marginTop: '12px',
                    fontSize: '13px',
                    color: 'rgba(0, 0, 0, 0.9)',
                }}>
                    {selectedCategoryId && (selectedTags.length > 0 || searchKeyword) && <span> · </span>}
                    {selectedTags.length > 0 && (
                        <span>已选 <strong>{selectedTags.length}</strong> 个标签</span>
                    )}
                    {selectedTags.length > 0 && searchKeyword && <span> · </span>}
                    {searchKeyword && (
                        <span>搜索 "<strong>{searchKeyword}</strong>"</span>
                    )}
                    {/* 移除这行，避免初始加载时的闪烁 */}
                    {/* <span> · 找到 <strong>{filteredCards.length}</strong> 篇文章</span> */}
                </div>
            )}
        </div>
    ), [isMobile, searchKeyword, selectedTags, selectedCategoryId]); // ✅ 移除 filteredCards.length

    useEffect(() => {
        // 安全地保存前一个配置，并合并新值（不覆盖其它字段）
        setConfig((prev: any) => {
            prevConfigRef.current = prev;
            return {
                ...prev,
                box1Content,
                // 移除 box2Style，让内容区域自然显示，无内容时保持空白
            };
        });

        return () => {
            // 清理：优先尝试恢复之前的完整配置（如果有）
            setConfig((prev: any) => {
                if (prevConfigRef.current) {
                    // 恢复之前的配置，但把 box1Content 设为 null（或按需要恢复原值）
                    return { ...prevConfigRef.current, box1Content: null };
                }
                // 否则做最小改动：只清掉 box1Content（合并而非覆盖）
                return { ...prev, box1Content: null };
            });
            prevConfigRef.current = null;
        };
    }, [setConfig, box1Content, isMobile]);

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
                            title="未找到匹配的文章"
                            description="试试调整筛选条件或搜索其他关键词？"
                        />
                    ) : (
                        <>
                            <div style={{ minHeight: '400px', position: 'relative' }}>
                                <MasonryGrid
                                    minColumns={2}
                                    onLayoutChange={(info) => setMasonryColumnWidth(info.columnWidth)}
                                >
                                    {filteredCards.map((card, index) => {
                                        const span = getMasonrySpan(card);
                                        return (
                                        <div
                                            key={card.id}
                                            className="masonry-item"
                                            style={span != null ? { gridRow: `span ${span}` } : undefined}
                                        >
                                            {renderCard(card, index, span)}
                                        </div>
                                        );
                                    })}

                                    {/* ✅ 哨兵 = 最后一个 grid item */}
                                    <div
                                        ref={loadMoreRef}
                                        className="masonry-sentinel"
                                    />
                                </MasonryGrid>
                                {/* <div
                                    ref={loadMoreRef}
                                    style={{
                                        height: '200px',
                                        width: '100%',
                                        background: 'red' // 甚至可以先给个 'red' 看看它在哪
                                    }}
                                /> */}
                            </div>

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
                        apiEndpoint: '/api/categories/tree-with-articles',
                        emptyText: '暂无目录',
                        forceOpenRootKeys: true,
                        categoryNavigationPattern: '/archive?category={categoryId}',
                        articleNavigationPattern: '/article/{articleId}',
                        stylePrefix: 'archive-category',
                        showArticleCount: true,
                        dataFormat: 'tree-with-articles',
                        defaultOpenMode: 'all',
                    }}
                    visible={drawerVisible}
                    onClose={() => setDrawerVisible(false)}
                    onCategorySelect={handleCategorySelect}
                    selectedCategoryId={selectedCategoryId}
                    expanded={sidebarExpanded}
                    onExpandedChange={setSidebarExpanded}
                />
            )}

            {/* 延迟挂载 ArchiveActionFloat：非首屏关键交互 */}
            {shouldLoadActionFloat && (
                <ArchiveActionFloat
                    onDiarySuccess={() => {
                        setOffset(0);
                        setHasMore(true);
                        loadArticles(0, false, selectedCategoryId);
                    }}
                />
            )}

        </>
    );
}
