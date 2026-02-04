'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, useTransition, Suspense } from 'react';
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

import MasonryGrid from '@/app/components/layout/MasonryGrid';
import ArticleCard from '@/app/components/cards/ArticleCard';
import ImageCard from '@/app/components/cards/ImageCard';
import CodeCard from '@/app/components/cards/CodeCard';
import DiaryCard from '@/app/components/cards/DiaryCard';

import '../styles/articles-filter.css';

const UnifiedNavigator = dynamic(() => import('@/app/components/sidebar/UnifiedNavigator'), {
    ssr: false
});

const UnifiedNavigatorButton = dynamic(
    () => import('@/app/components/sidebar/UnifiedNavigator').then(mod => ({ default: mod.UnifiedNavigatorButton })),
    { ssr: false }
) as React.ComponentType<{ onClick?: () => void; expanded?: boolean; onToggle?: () => void }>;

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

interface ArchivePageProps {
    initialArticles?: any[];
    initialHasMore?: boolean;
    initialOffset?: number;
}

/**
 * 文章归档页面内容 - 使用 useSearchParams，需在 Suspense 内渲染
 */
function ArchivePageContent(props?: ArchivePageProps) {
    const {
        initialArticles = [],
        initialHasMore = true,
        initialOffset = 0
    } = props ?? {};

    const { isMobile } = useResponsive();
    const { currentFishbowlTheme } = useAppTheme();
    const { setConfig } = usePageShell();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { filterMode } = useAccessFilter();
    const { user, isLoggedIn } = useAuth();

    const [cards, setCards] = useState<any[]>(initialArticles);
    const [loading, setLoading] = useState(true);
    const [hasFetched, setHasFetched] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [offset, setOffset] = useState(initialOffset || initialArticles.length);
    const offsetRef = useRef(offset);
    const loadingDelayTimerRef = useRef<number | null>(null);
    const { setLeftContent } = useHeader();

    const [allTags, setAllTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [searchKeyword, setSearchKeyword] = useState('');

    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    const [isPending, startTransition] = useTransition();

    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    const [shouldLoadNavigator, setShouldLoadNavigator] = useState(false);
    const [shouldLoadActionFloat, setShouldLoadActionFloat] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setSidebarExpanded(false);
    }, []);
    const loadingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const prevConfigRef = useRef<any | null>(null);
    const prevInitialArticlesRef = useRef(initialArticles);

    const ITEMS_PER_PAGE = 15;

    const openCategoryDrawer = useCallback(() => {
        setShouldLoadNavigator(true);
        setDrawerVisible(true);
    }, []);

    const toggleSidebar = useCallback(() => {
        setShouldLoadNavigator(true);
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

    useEffect(() => {
        const categoryParam = searchParams.get('category');
        if (categoryParam) {
            setSelectedCategoryId(categoryParam);
        }
    }, [searchParams]);

    useEffect(() => {
        offsetRef.current = offset;
    }, [offset]);

    const loadArticles = useCallback(async (
        currentOffset: number,
        append: boolean = false,
        categoryId?: string | null,
        query?: { search?: string }
    ) => {
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
                setLoading(true);
                setHasFetched(false);

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
            if (!aborted) {
                setLoading(false);
                setShowLoading(false);
                setLoadingMore(false);
                setHasFetched(true);
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
            return;
        }
        loadingRef.current = true;
        setLoadingMore(true);
        loadArticles(offsetRef.current, true, selectedCategoryId).finally(() => {
            loadingRef.current = false;
            setLoadingMore(false);
        });
    }, [hasMore, selectedCategoryId, loadArticles]);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 500);
        return () => clearTimeout(timer);
    }, []);

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

    const hasInitialLoadRef = useRef(false);
    useEffect(() => {
        if (initialArticles.length > 0 || hasInitialLoadRef.current) return;
        hasInitialLoadRef.current = true;
        const categoryParam = searchParams.get('category') ?? null;
        loadArticles(0, false, categoryParam);
    }, [initialArticles.length, searchParams, loadArticles]);

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

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

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

        const hasChanged =
            prevFilter.categoryId !== currentFilter.categoryId ||
            prevFilter.tagsCount !== currentFilter.tagsCount ||
            prevFilter.keyword !== currentFilter.keyword;

        if (hasChanged && (prevFilter.categoryId !== null || prevFilter.tagsCount > 0 || prevFilter.keyword)) {
            requestAnimationFrame(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        prevFilterRef.current = currentFilter;
    }, [selectedCategoryId, selectedTags.length, searchKeyword]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (loadingDelayTimerRef.current) {
                clearTimeout(loadingDelayTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShouldLoadActionFloat(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

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

    const userMaxAccessLevel = useMemo(() => {
        if (!isLoggedIn || !user) return 2;
        return user.max_access_level ?? 2;
    }, [isLoggedIn, user]);

    const filteredCards = useMemo(() => {
        return cards.filter(article => {
            const articleVisibleLevel = article.visible_access_level ?? article.visibleAccessLevel ?? article.max_access_level ?? article.maxAccessLevel ?? 1;
            const articleFullLevel = article.full_access_level ?? article.fullAccessLevel ?? articleVisibleLevel;

            let matchAccessLevel = false;
            if (filterMode === 'study') {
                matchAccessLevel = articleFullLevel === 1;
            } else if (filterMode === 'strict') {
                matchAccessLevel = userMaxAccessLevel >= articleFullLevel;
            } else if (filterMode === 'loose') {
                matchAccessLevel = userMaxAccessLevel >= articleVisibleLevel;
            }

            const matchTags = selectedTags.length === 0 ||
                article.tags?.some((tag: string) => selectedTags.includes(tag));

            return matchAccessLevel && matchTags;
        });
    }, [cards, selectedTags, filterMode, userMaxAccessLevel]);

    const handleCardClick = useCallback((card: any) => {
        if (card.type === 'text' || card.type === 'image' || card.type === 'code' ||
            card.type === 'diary' || card.type === 'drawing' || card.type === 'article') {
            router.push(`/article/${card.id}`);
        }
    }, [router]);

    const prefetchingRef = useRef<Set<string>>(new Set());

    const handleCardHover = useCallback((card: any) => {
        if (card.type === 'text' || card.type === 'image' || card.type === 'code' ||
            card.type === 'diary' || card.type === 'drawing' || card.type === 'article') {
            const articleId = card.id;
            if (prefetchingRef.current.has(articleId)) return;
            prefetchingRef.current.add(articleId);
            router.prefetch(`/article/${articleId}`);
            apiGet(`/api/articles/${articleId}`, { requiresAuth: false })
                .then(() => {})
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        prefetchingRef.current.delete(articleId);
                    }, 5000);
                });
        }
    }, [router]);

    const handleCategorySelect = useCallback((categoryId: string | null) => {
        setSelectedCategoryId(categoryId);
        setOffset(0);
        setHasMore(true);
        setSelectedTags([]);
        setSearchKeyword('');

        loadArticles(0, false, categoryId);
    }, [loadArticles]);

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
        </div>
    ), [isMobile, searchKeyword, selectedTags, selectedCategoryId]);

    useEffect(() => {
        setConfig((prev: any) => {
            prevConfigRef.current = prev;
            return {
                ...prev,
                box1Content,
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
    }, [setConfig, box1Content, isMobile]);

    return (
        <>
            <div style={{
                transform: isMobile ? 'none' : (sidebarExpanded ? 'translateX(280px)' : 'translateX(0)'),
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform',
            }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

                    {loading && cards.length === 0 ? (
                        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Spin tip="正在开启档案库..." />
                        </div>
                    ) : (hasFetched && filteredCards.length === 0) ? (
                        <Empty
                            title="未找到匹配的文章"
                            description="试试调整筛选条件或搜索其他关键词？"
                        />
                    ) : (
                        <>
                            <div style={{ minHeight: '400px' }}>
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

/**
 * 文章归档页面 - 客户端组件，数据由客户端拉取
 * useSearchParams 需在 Suspense 内使用，避免静态导出时报错
 */
export default function ArchivePage(props?: ArchivePageProps) {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Spin />
            </div>
        }>
            <ArchivePageContent {...(props ?? {})} />
        </Suspense>
    );
}
