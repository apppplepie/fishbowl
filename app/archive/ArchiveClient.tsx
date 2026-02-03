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
    const [loading, setLoading] = useState(true); // 默认为 true
    const [hasFetched, setHasFetched] = useState(false); // 真正完成过的标记
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

    // 延迟加载导航组件，只有在用户打开时才加载
    const [shouldLoadNavigator, setShouldLoadNavigator] = useState(false);

    // 延迟挂载 ArchiveActionFloat，非首屏关键交互
    const [shouldLoadActionFloat, setShouldLoadActionFloat] = useState(false);

    // 页面稳定后再允许哨兵 observe，避免一挂载就触发
    const [isMounted, setIsMounted] = useState(false);

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
        query?: { search?: string }
    ) => {
        // 1. 立即中断上一个请求
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    
        const controller = new AbortController();
        abortControllerRef.current = controller;
        let aborted = false;
    
        try {
            if (append) {
                setLoadingMore(true);
            } else {
                // 如果不是追加，说明是重置列表，此时开启全屏 loading 逻辑
                setLoading(true);
                setHasFetched(false); // 重置此标记，防止旧数据的 Empty 状态闪现
                
                if (loadingDelayTimerRef.current) clearTimeout(loadingDelayTimerRef.current);
                loadingDelayTimerRef.current = window.setTimeout(() => {
                    setShowLoading(true);
                }, 500);
            }
    
            const params = new URLSearchParams({
                status: 'published',
                limit: ITEMS_PER_PAGE.toString(),
                offset: currentOffset.toString(),
            });
    
            if (categoryId) params.append('categoryId', categoryId);
            if (query?.search) params.append('search', query.search);
    
            const response = await apiGet(`/api/articles/list?${params.toString()}`, {
                requiresAuth: false,
                signal: controller.signal 
            });
    
            const result = await response.json();
    
            if (response.ok && result.success) {
                const articles = result.articles || [];

                if (append) {
                    setCards(prev => {
                        const existingIds = new Set(prev.map((card: any) => card.id));
                        const newArticles = articles.filter((a: any) => !existingIds.has(a.id));
                        return newArticles.length === 0 ? prev : [...prev, ...newArticles];
                    });
                    const nextOffset = currentOffset + articles.length;
                    setOffset(nextOffset);
                    offsetRef.current = nextOffset;
                } else {
                    setCards(articles);
                    setOffset(articles.length);
                    offsetRef.current = articles.length;
                }
                setHasMore(articles.length === ITEMS_PER_PAGE);
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                aborted = true;
                return;
            }
            console.error('加载文章失败:', error);
        } finally {
            // 关键：只有当前请求没被 Abort 时，才关闭 loading 状态
            if (!aborted) {
                setLoading(false);
                setShowLoading(false);
                setLoadingMore(false);
                setHasFetched(true); // 只有成功/失败了且没被中断，才算“完成过”
                loadingRef.current = false;
                if (loadingDelayTimerRef.current) {
                    clearTimeout(loadingDelayTimerRef.current);
                    loadingDelayTimerRef.current = null;
                }
            }
        }
    }, []);

    const triggerLoadMore = useCallback(() => {
        if (!hasMore || loadingRef.current) return;
        if (offsetRef.current === 0) {
            console.log('拦截：第一页还没稳，哨兵别急');
            return;
        }
        loadingRef.current = true;
        setLoadingMore(true);
        loadArticles(offsetRef.current, true, selectedCategoryId).finally(() => {
            loadingRef.current = false;
            setLoadingMore(false);
        });
    }, [hasMore, selectedCategoryId, loadArticles]);

    // 页面挂载后延迟 500ms 再允许哨兵工作，给 Masonry 完成初次排版的时间
    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 500);
        return () => clearTimeout(timer);
    }, []);

    // 哨兵：仅在 isMounted 且“有更多”时 observe
    useEffect(() => {
        const node = loadMoreRef.current;
        if (!node || !hasMore || !isMounted) return;

        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !loadingRef.current && hasMore) {
                    triggerLoadMore();
                }
            },
            {
                root: null,
                rootMargin: '100px',
                threshold: 0.1,
            }
        );

        io.observe(node);
        return () => io.disconnect();
    }, [hasMore, triggerLoadMore, isMounted]);

    // ✅ 无 SSR 时：首屏由客户端拉取（仅执行一次）
    const hasInitialLoadRef = useRef(false);
    useEffect(() => {
        if (initialArticles.length > 0 || hasInitialLoadRef.current) return;
        hasInitialLoadRef.current = true;
        const categoryParam = searchParams.get('category') ?? null;
        loadArticles(0, false, categoryParam);
    }, [initialArticles.length, searchParams, loadArticles]);

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

    // 根据卡片类型计算 gridRow span（无 precomputedSpan 时客户端用）
    const getSpanForCard = useCallback((article: any): number => {
        if (article.precomputedSpan != null) return article.precomputedSpan;
        if (article.type === 'image' || article.type === 'drawing') return getImageCardSpan(article);
        let cardType: CardType | null = null;
        if (article.type === 'code' || article.codePreview) cardType = 'CODE_CARD';
        else if (article.type === 'text' || article.type === 'article' || article.content) cardType = 'TEXT_CARD';
        else if (article.type === 'diary' || article.excerpt) cardType = 'DIARY_CARD';
        else if (article.type === 'book') cardType = 'BOOK_CARD';
        const spanOrDynamic = cardType ? getCardSpan(cardType) : 18;
        return typeof spanOrDynamic === 'number' ? spanOrDynamic : 18;
    }, []);

    // 渲染卡片：语义化 masonry（masonry + span/dynamic），卡片内部负责 class/style
    const renderCard = useCallback((article: any, index: number) => {
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
        const masonryDynamic = spanOrDynamic === 'dynamic';

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
                        span={article.precomputedSpan ?? masonrySpan ?? 18}
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
                        span={article.precomputedSpan ?? getImageCardSpan(article)}
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
                        span={article.precomputedSpan ?? getImageCardSpan(article)}
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
                        span={article.precomputedSpan ?? masonrySpan}
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
                        span={article.precomputedSpan ?? masonrySpan}
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
                        span={article.precomputedSpan ?? masonrySpan ?? 18}
                    />
                );
        }
    }, [handleCardClick, handleCardHover]);

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
            {/* {(selectedTags.length > 0 || searchKeyword || selectedCategoryId) && (
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

                </div>
            )} */}
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
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
                
                {/* 1. 初始加载状态：还没拿到第一波数据且正在 loading */}
                {loading && cards.length === 0 ? (
                    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spin tip="正在开启档案库..." />
                    </div>
                ) : (hasFetched && filteredCards.length === 0) ? (
                    /* 2. 确认请求完成且真的没数据 */
                    <Empty
                        title="未找到匹配的文章"
                        description="试试调整筛选条件或搜索其他关键词？"
                    />
                ) : (
                    /* 3. 正常内容区 */
                    <>
                        <div style={{ minHeight: '400px' }}>
                            {/* 瀑布流只放卡片 */}
                            <MasonryGrid minColumns={2}>
                                {filteredCards.map((card, index) => (
                                    <div
                                        key={card.id}
                                        className="masonry-item"
                                        style={{ gridRow: `span ${getSpanForCard(card)}` }}
                                    >
                                        {renderCard(card, index)}
                                    </div>
                                ))}
                            </MasonryGrid>
                            
{/* 只有 isMounted 为 true 才绑定 ref，哨兵在页面稳定后再 observe */}
{hasFetched && cards.length > 0 && (
    <div
        ref={isMounted ? loadMoreRef : null}
        style={{
            height: '50px',
            margin: '20px 0',
            visibility: 'hidden',
            backgroundColor: 'black',
        }}
    />
)}
                        </div>

                        {/* 加载更多 UI */}
                        {loadingMore && (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <Spin size="small" />
                                <div style={{ marginTop: '8px', fontSize: '14px', color: '#999' }}> </div>
                            </div>
                        )}

                        {!hasMore && filteredCards.length > 0 && <LoadEnd />}
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

