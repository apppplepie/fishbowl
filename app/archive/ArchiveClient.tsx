'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import { usePageShell } from '@/app/contexts/PageShellContext';
import ArchiveActionFloat from '@/app/components/float/ArchiveActionFloat';
import { apiGet } from '@/lib/apiClient';
import { Empty, LoadEnd, Input } from '@/app/components/ui';
import { useHeader } from '../contexts/HeaderContext';

// 轻量级瀑布流组件
import MasonryGrid from '@/app/components/layout/MasonryGrid';

// 卡片组件 - 首屏直接加载（启用 SSR）
import ArticleCard from '@/app/components/cards/ArticleCard';
import ImageCard from '@/app/components/cards/ImageCard';
import CodeCard from '@/app/components/cards/CodeCard';
import DiaryCard from '@/app/components/cards/DiaryCard';
import CardRenderer from '@/app/components/cards/CardRenderer';

// 目录/侧边栏 - 非关键路径，懒加载
const UnifiedNavigator = dynamic(() => import('@/app/components/sidebar/UnifiedNavigator'), {
    ssr: false
});

const UnifiedNavigatorButton = dynamic(
    () => import('@/app/components/sidebar/UnifiedNavigator').then(mod => ({ default: mod.UnifiedNavigatorButton })),
    { ssr: false }
) as React.ComponentType<{ onClick?: () => void; expanded?: boolean; onToggle?: () => void }>;

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

  // 侧边栏展开状态（桌面端）
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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
                    requiresAuth: true,
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
            // 清除延迟定时器
            if (loadingDelayTimerRef.current) {
                clearTimeout(loadingDelayTimerRef.current);
                loadingDelayTimerRef.current = null;
            }
        }
    }, []);

    // ✅ 使用 IntersectionObserver 代替 scroll 事件（使用 offsetRef 避免闭包问题）
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
                rootMargin: '400px', // 提前400px加载
                threshold: 0,
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [hasMore, selectedCategoryId, loadArticles]);

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

    // ✅ 强制滚动到顶部，阻止浏览器恢复滚动位置
    useEffect(() => {
        // 禁用自动滚动恢复
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        
        // 强制滚动到顶部
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        // 组件卸载时恢复默认行为
        return () => {
            if ('scrollRestoration' in history) {
                history.scrollRestoration = 'auto';
            }
        };
    }, []);

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

    // ✅ 防抖搜索 - 350ms 延迟
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchKeyword.trim()) {
                // 有搜索关键词时，重新加载
                setOffset(0);
                setHasMore(true);
                loadArticles(0, false, selectedCategoryId, { search: searchKeyword });
            } else if (searchKeyword === '') {
                // 清空搜索时，重新加载（仅当关键词从非空变为空时）
                setOffset(0);
                setHasMore(true);
                loadArticles(0, false, selectedCategoryId);
            }
        }, 350);

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchKeyword, selectedCategoryId]); // 移除 loadArticles 依赖，避免不必要的重新创建

    // 过滤文章（仅用于客户端标签筛选，搜索由服务端处理）
    const filteredCards = useMemo(() => {
        return cards.filter(article => {
            const matchTags = selectedTags.length === 0 ||
                article.tags?.some((tag: string) => selectedTags.includes(tag));

            return matchTags;
        });
    }, [cards, selectedTags]);

    // 点击卡片处理
    const handleCardClick = useCallback((card: any) => {
        if (card.type === 'text' || card.type === 'image' || card.type === 'code' ||
            card.type === 'diary' || card.type === 'drawing' || card.type === 'article') {
            router.push(`/article/${card.id}`);
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

    // ✅ 渲染卡片（添加 priority 属性）
    const renderCard = useCallback((article: any, index: number) => {
        const handleClick = () => handleCardClick(article);
        const isPriority = index < 6; // 首屏前6个优先加载

        switch (article.type) {
            case 'text':
                return <ArticleCard key={article.id} card={article} onClick={handleClick} priority={isPriority} />;
            case 'image':
                return <ImageCard key={article.id} card={article} onClick={handleClick} priority={isPriority} />;
            case 'drawing':
                return <ImageCard
                    key={article.id}
                    card={{
                        ...article,
                        description: article.excerpt + (article.imageCount ? ` 🎨 ${article.imageCount} 张` : '')
                    }}
                    onClick={handleClick}
                    priority={isPriority}
                />;
            case 'code':
                return <CodeCard key={article.id} card={article} onClick={handleClick} priority={isPriority} />;
            case 'diary':
                return <DiaryCard key={article.id} card={article} onClick={handleClick} priority={isPriority} />;
            default:
                return <CardRenderer key={article.id} card={article} onClick={handleClick} />;
        }
    }, [handleCardClick]);

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
                            <div style={{ minHeight: '400px' }}>
                                <MasonryGrid minColumns={2}>
                                    {filteredCards.map((card, index) => (
                                        <div key={card.id}>
                                            {renderCard(card, index)}
                                        </div>
                                    ))}
                                </MasonryGrid>
                            </div>

                            {/* ✅ IntersectionObserver 哨兵元素 */}
                            <div ref={loadMoreRef} style={{ height: 1 }} />

                            {loadingMore && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px 0',
                                    color: '#999',
                                }}>
                                    <div style={{
                                        display: 'inline-block',
                                        width: '24px',
                                        height: '24px',
                                        border: '3px solid #f0f0f0',
                                        borderTopColor: '#1890ff',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                    }} />
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

            <ArchiveActionFloat
                onDiarySuccess={() => {
                    setOffset(0);
                    setHasMore(true);
                    loadArticles(0, false, selectedCategoryId);
                }}
            />

            <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </>
    );
}

