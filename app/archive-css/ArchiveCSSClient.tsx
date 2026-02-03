'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import { usePageShell } from '@/app/contexts/PageShellContext';
import ArchiveActionFloat from '@/app/components/float/ArchiveActionFloat';
import { apiGet } from '@/lib/apiClient';
import { Empty, LoadEnd, Input, Spin } from '@/app/components/ui';
import { useHeader } from '../contexts/HeaderContext';
import { getCardSpan, getImageCardSpan, type CardType } from '@/lib/utils';

// ✨ 使用 CSS Grid Masonry 版本
import MasonryGridCSS from '@/app/components/layout/MasonryGridCSS';

// 卡片组件
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

interface ArchiveCSSClientProps {
    initialArticles?: any[];
    initialHasMore?: boolean;
    initialOffset?: number;
}

/**
 * 文章归档页面客户端组件 - CSS Grid Masonry 版本
 * 使用浏览器原生 masonry 布局，零 JavaScript 测量
 */
export default function ArchiveCSSClient({
    initialArticles = [],
    initialHasMore = true,
    initialOffset = 0
}: ArchiveCSSClientProps) {
    const { isMobile } = useResponsive();
    const { currentFishbowlTheme } = useAppTheme();
    const { setConfig } = usePageShell();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [cards, setCards] = useState<any[]>(initialArticles);
    const [loading, setLoading] = useState(false);
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

    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [masonryColumnWidth, setMasonryColumnWidth] = useState<number | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setSidebarExpanded(false);
    }, []);
    
    const loadingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const prevConfigRef = useRef<any | null>(null);
    const prevInitialArticlesRef = useRef(initialArticles);

    const ITEMS_PER_PAGE = 15;

    const openCategoryDrawer = useCallback(() => {
        setDrawerVisible(true);
    }, []);

    const toggleSidebar = useCallback(() => {
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

        try {
            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
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

            if (query?.search) {
                params.append('search', query.search);
            }

            const response = await apiGet(
                `/api/articles/list?${params.toString()}`,
                {
                    requiresAuth: true,
                    signal: controller.signal
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
                        return [...prev, ...newArticles];
                    });
                } else {
                    setCards(articles);
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
            if (loadingDelayTimerRef.current) {
                clearTimeout(loadingDelayTimerRef.current);
                loadingDelayTimerRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        if (!hasMore) return;

        const element = loadMoreRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loadingRef.current) {
                    loadingRef.current = true;
                    loadArticles(offsetRef.current, true, selectedCategoryId).finally(() => {
                        loadingRef.current = false;
                    });
                }
            },
            {
                root: null,
                rootMargin: '400px',
                threshold: 0,
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [hasMore, selectedCategoryId, loadArticles]);

    useEffect(() => {
        if (initialArticles !== prevInitialArticlesRef.current) {
            prevInitialArticlesRef.current = initialArticles;
            if (initialArticles.length > 0) {
                setCards(initialArticles);
                setOffset(initialArticles.length);
            }
        }
    }, [initialArticles]);

    useEffect(() => {
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        return () => {
            if ('scrollRestoration' in history) {
                history.scrollRestoration = 'auto';
            }
        };
    }, []);

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
        const timeoutId = setTimeout(() => {
            if (searchKeyword.trim()) {
                setOffset(0);
                setHasMore(true);
                loadArticles(0, false, selectedCategoryId, { search: searchKeyword });
            } else if (searchKeyword === '') {
                setOffset(0);
                setHasMore(true);
                loadArticles(0, false, selectedCategoryId);
            }
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [searchKeyword, selectedCategoryId]);

    const filteredCards = useMemo(() => {
        return cards.filter(article => {
            const matchTags = selectedTags.length === 0 ||
                article.tags?.some((tag: string) => selectedTags.includes(tag));

            return matchTags;
        });
    }, [cards, selectedTags]);

    const handleCardClick = useCallback((card: any) => {
        if (card.type === 'text' || card.type === 'image' || card.type === 'code' ||
            card.type === 'diary' || card.type === 'drawing' || card.type === 'article') {
            router.push(`/article/${card.id}`);
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

    const renderCard = useCallback((article: any, index: number) => {
        const handleClick = () => handleCardClick(article);
        const isPriority = index < 6;

        let cardType: CardType | null = null;
        if (article.type === 'code' || article.codePreview) cardType = 'CODE_CARD';
        else if (article.type === 'text' || article.type === 'article' || article.content) cardType = 'TEXT_CARD';
        else if (article.type === 'diary' || article.excerpt) cardType = 'DIARY_CARD';
        else if (article.type === 'book') cardType = 'BOOK_CARD';

        const spanOrDynamic = cardType ? getCardSpan(cardType) : 'dynamic';
        const masonrySpan = spanOrDynamic === 'dynamic' ? undefined : spanOrDynamic;

        switch (article.type) {
            case 'text':
                return <ArticleCard key={article.id} card={article} onClick={handleClick} priority={isPriority} masonry span={masonrySpan ?? 18} />;
            case 'image':
                return <ImageCard key={article.id} card={article} onClick={handleClick} priority={isPriority} masonry span={getImageCardSpan(article, masonryColumnWidth ?? undefined)} />;
            case 'drawing':
                return (
                    <ImageCard
                        key={article.id}
                        card={{ ...article, description: article.excerpt + (article.imageCount ? ` 🎨 ${article.imageCount} 张` : '') }}
                        onClick={handleClick}
                        priority={isPriority}
                        masonry
                        span={getImageCardSpan(article, masonryColumnWidth ?? undefined)}
                    />
                );
            case 'code':
                return <CodeCard key={article.id} card={article} onClick={handleClick} priority={isPriority} masonry span={masonrySpan} />;
            case 'diary':
                return <DiaryCard key={article.id} card={article} onClick={handleClick} priority={isPriority} masonry span={masonrySpan} />;
            default:
                return <ArticleCard key={article.id} card={article} onClick={handleClick} priority={isPriority} masonry span={masonrySpan ?? 18} />;
        }
    }, [handleCardClick, masonryColumnWidth]);

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

            {/* 版本标识 */}
            <div style={{
                marginTop: '12px',
                fontSize: '13px',
                color: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}>
                <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                }}>
                    CSS MASONRY
                </span>
                <span>浏览器原生布局 · 零 JavaScript</span>
            </div>

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
                </div>
            )}
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
                            <div style={{ minHeight: '400px' }}>
                                {/* ✨ 使用 CSS Grid Masonry */}
                                <MasonryGridCSS
                                    minColumns={2}
                                    onLayoutChange={(info) => setMasonryColumnWidth(info.columnWidth)}
                                >
                                    {filteredCards.map((card, index) => renderCard(card, index))}
                                </MasonryGridCSS>
                            </div>

                            <div ref={loadMoreRef} style={{ height: 1 }} />

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

            <UnifiedNavigator
                treeConfig={{
                    apiEndpoint: '/api/categories/tree-with-articles',
                    emptyText: '暂无目录',
                    forceOpenRootKeys: true,
                    categoryNavigationPattern: '/archive-css?category={categoryId}',
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

            <ArchiveActionFloat
                onDiarySuccess={() => {
                    setOffset(0);
                    setHasMore(true);
                    loadArticles(0, false, selectedCategoryId);
                }}
            />

        </>
    );
}

