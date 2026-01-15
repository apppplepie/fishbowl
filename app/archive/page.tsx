'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Masonry, Input, Tag, Select, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import PageLayout from '@/app/components/PageLayout';
import ArchiveActionFloat from '@/app/components/float/ArchiveActionFloat';
import { apiGet } from '@/lib/apiClient';
import { Empty, LoadEnd } from '@/app/components/ui';

// 重型组件懒加载 - 减少首屏 JS 体积
// 卡片组件懒加载（非首屏内容）
const CardRenderer = dynamic(() => import('@/app/components/cards/CardRenderer'), { 
  ssr: false 
});

const ArticleCard = dynamic(() => import('@/app/components/cards/ArticleCard'), { 
  ssr: false 
});

const ImageCard = dynamic(() => import('@/app/components/cards/ImageCard'), { 
  ssr: false 
});

const CodeCard = dynamic(() => import('@/app/components/cards/CodeCard'), { 
  ssr: false 
});

const DiaryCard = dynamic(() => import('@/app/components/cards/DiaryCard'), { 
  ssr: false 
});

// 目录/侧边栏懒加载
const UnifiedNavigator = dynamic(() => import('@/app/components/sidebar/UnifiedNavigator'), { 
  ssr: false 
});

const UnifiedNavigatorButton = dynamic(
  () => import('@/app/components/sidebar/UnifiedNavigator').then(mod => ({ default: mod.UnifiedNavigatorButton })),
  { ssr: false }
) as React.ComponentType<{ onClick?: () => void; expanded?: boolean; onToggle?: () => void }>;
import { mockCards } from '@/app/data/mockCards';
import GalleryPage from '@/app/gallery/page';
import type { Card } from '@/app/types/card';
import '../styles/articles-filter.css';
import { useHeader } from '../contexts/HeaderContext';

// 根据屏幕宽度计算列数
const calculateColumns = (width: number) => {
  if (width >= 1400) return 4;
  if (width >= 1200) return 3;
  if (width >= 768) return 2;
  return 2;
};

/**
 * 文章归档页面
 * 使用瀑布流布局展示各种类型的卡片
 * Box1: 标签筛选区
 * Box2: 瀑布流卡片展示区
 */
function ArticlesPageContent() {
  const { isMobile } = useResponsive();
  const { currentFishbowlTheme } = useAppTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [columns, setColumns] = useState<number>(3);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const { setLeftContent } = useHeader();
  // 过滤条件状态
  const [allTags, setAllTags] = useState<string[]>([]); // 所有可用标签
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 选中的标签
  const [searchKeyword, setSearchKeyword] = useState(''); // 搜索关键词

  // 目录抽屉状态（移动端）
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // 侧边栏展开状态（桌面端）
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // 默认关闭

  // 切换目录抽屉的函数（移动端）- 使用 useCallback 固定引用
  const openCategoryDrawer = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  // 切换侧边栏展开/收起（桌面端）- 使用 useCallback 固定引用
  const toggleSidebar = useCallback(() => {
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

  // 从 URL 参数初始化分类筛选
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategoryId(categoryParam);
    }
  }, [searchParams]);

  // 监听页面导航变化，强制刷新数据（解决HTTPS环境下跳转回来不刷新的问题）
  useEffect(() => {
    // 当页面变为活跃状态时（从其他页面跳转回来），强制重新加载数据
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 页面变为可见，检查是否需要刷新数据
        const lastRefresh = sessionStorage.getItem('archiveLastRefresh');
        const now = Date.now();
        const REFRESH_INTERVAL = 30000; // 30秒内不重复刷新

        if (!lastRefresh || now - parseInt(lastRefresh) > REFRESH_INTERVAL) {
          console.log('检测到页面激活，刷新归档数据');
          loadArticles(0, false, selectedCategoryId);
          sessionStorage.setItem('archiveLastRefresh', now.toString());
        }
      }
    };

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 监听页面焦点变化（额外保险）
    window.addEventListener('focus', () => {
      const lastRefresh = sessionStorage.getItem('archiveLastRefresh');
      const now = Date.now();
      const REFRESH_INTERVAL = 30000;

      if (!lastRefresh || now - parseInt(lastRefresh) > REFRESH_INTERVAL) {
        console.log('检测到页面获得焦点，刷新归档数据');
        loadArticles(0, false, selectedCategoryId);
        sessionStorage.setItem('archiveLastRefresh', now.toString());
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [selectedCategoryId]);

  const ITEMS_PER_PAGE = 15; // 每页加载15篇

  // 加载所有可用标签
  useEffect(() => {
    async function loadTags() {
      try {
        const response = await apiGet('/api/tags', { requiresAuth: false });
        const result = await response.json();
        
        if (result.success) {
          setAllTags(result.tags.map((tag: any) => tag.name));
        }
      } catch (error) {
        console.error('加载标签失败:', error);
      }
    }
    
    loadTags();
  }, []);

  // 加载文章数据（支持分批加载）
  const loadArticles = async (currentOffset: number, append: boolean = false, categoryId?: string | null) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // 构建查询参数
      const params = new URLSearchParams({
        status: 'published',
        limit: ITEMS_PER_PAGE.toString(),
        offset: currentOffset.toString(),
      });

      if (categoryId) {
        params.append('categoryId', categoryId);
      }

      // 使用优化的列表 API，一次查询返回所有预览数据
      const response = await apiGet(`/api/articles/list?${params.toString()}`, { requiresAuth: true });
      const result = await response.json();
      
      if (response.ok && result.success) {
        // API 已经返回了所有需要的预览数据，无需额外处理
        const articles = result.articles;
        
        if (append) {
          // 追加模式：添加到现有列表，并去重
          setCards(prev => {
            const existingIds = new Set(prev.map(card => card.id));
            const newArticles = articles.filter(
              (article: any) => !existingIds.has(article.id)
            );
            return [...prev, ...newArticles];
          });
        } else {
          // 初始加载模式：替换列表
          setCards(articles);
        }

        // 判断是否还有更多数据
        setHasMore(result.articles.length === ITEMS_PER_PAGE);
        setOffset(currentOffset + result.articles.length);
      } else {
        // API 失败
        if (!append) {
          console.log('API 失败，使用 mock 数据');
          setCards(mockCards);
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('加载文章失败:', error);
      if (!append) {
        // 网络错误，使用 mock 数据
        setCards(mockCards);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 初次加载 - 检查是否有保存的状态
  useEffect(() => {
    const savedState = sessionStorage.getItem('archiveState');
    
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // 检查分类是否匹配（如果不匹配，清除保存的状态并重新加载）
        if (state.selectedCategoryId === selectedCategoryId) {
          // 恢复保存的状态
          setCards(state.cards || []);
          setOffset(state.offset || 0);
          setHasMore(state.hasMore !== undefined ? state.hasMore : true);
          setLoading(false);
          // 滚动位置会在下面的 useEffect 中恢复
          return;
        } else {
          // 分类不匹配，清除保存的状态
          sessionStorage.removeItem('archiveState');
        }
      } catch (error) {
        console.error('恢复归档状态失败:', error);
        sessionStorage.removeItem('archiveState');
      }
    }
    
    // 没有保存的状态或分类不匹配，正常加载
    loadArticles(0, false, selectedCategoryId);
  }, [selectedCategoryId]);

  // 过滤文章
  const filteredCards = useMemo(() => {
    return cards.filter(article => {
      // 1. 标签过滤（如果选了标签，文章必须包含至少一个选中的标签）
      const matchTags = selectedTags.length === 0 || 
        article.tags?.some((tag: string) => selectedTags.includes(tag));
      
      // 2. 关键词过滤（搜索标题、作者、摘要）
      const keyword = searchKeyword.toLowerCase().trim();
      const matchSearch = !keyword || 
        article.title?.toLowerCase().includes(keyword) ||
        article.author?.toLowerCase().includes(keyword) ||
        article.excerpt?.toLowerCase().includes(keyword);
      
      // 两个条件都要满足
      return matchTags && matchSearch;
    });
  }, [cards, selectedTags, searchKeyword]);

  // 恢复滚动位置（在 filteredCards 定义之后）
  useEffect(() => {
    const savedState = sessionStorage.getItem('archiveState');
    if (savedState && !loading && filteredCards.length > 0) {
      try {
        const state = JSON.parse(savedState);
        if (state.scrollPosition !== undefined) {
          // 等待内容渲染完成后再恢复滚动位置
          const timer = setTimeout(() => {
            window.scrollTo(0, state.scrollPosition);
            // 恢复后清除保存的状态
            sessionStorage.removeItem('archiveState');
          }, 200);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('恢复滚动位置失败:', error);
        sessionStorage.removeItem('archiveState');
      }
    }
  }, [loading, filteredCards.length]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setColumns(calculateColumns(window.innerWidth));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 监听滚动，实现无限加载
  useEffect(() => {
    const handleScroll = () => {
      // 如果正在加载或没有更多数据，不触发
      if (loading || loadingMore || !hasMore) return;

      // 计算是否滚动到底部
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;

      // 距离底部 300px 时开始加载
      if (scrollHeight - scrollTop - clientHeight < 300) {
        loadArticles(offset, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [offset, loading, loadingMore, hasMore]);

  // 处理分类选择
  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setOffset(0);
    setHasMore(true);
    // 重置标签和搜索筛选
    setSelectedTags([]);
    setSearchKeyword('');
    // 清除保存的状态（因为分类变了）
    sessionStorage.removeItem('archiveState');
  };

  // 点击卡片处理
  const handleCardClick = (card: any) => {
    console.log('点击了卡片:', card);
    // 保存完整状态：滚动位置、cards、offset、hasMore、selectedCategoryId
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const archiveState = {
      scrollPosition: scrollTop,
      cards: cards,
      offset: offset,
      hasMore: hasMore,
      selectedCategoryId: selectedCategoryId,
    };
    sessionStorage.setItem('archiveState', JSON.stringify(archiveState));
    
    // 数据库文章直接跳转
    if (card.type === 'text' || card.type === 'image' || card.type === 'code' || card.type === 'diary' || card.type === 'drawing') {
      router.push(`/article/${card.id}`);
    } else if (card.type === 'article') {
      // mock 数据兼容
      router.push(`/article/${card.id}`);
    }
    // 其他类型的卡片可以弹出模态框或其他操作
  };

  // 控制 box2 整体渐显动画
  const [showBox2, setShowBox2] = useState(false);

  // 当加载完成且有内容时，触发 box2 渐显动画（先停顿0.5秒）
  useEffect(() => {
    if (!loading && filteredCards.length > 0) {
      // 先停顿0.5秒，然后触发渐显动画
      const timer = setTimeout(() => {
        setShowBox2(true);
      }, 500); // 0.5秒延迟
      
      return () => clearTimeout(timer);
    } else {
      setShowBox2(false);
    }
  }, [loading, filteredCards.length]);

  // 根据文章类型渲染对应的卡片
  const renderCard = (article: any, index: number) => {
    const handleClick = () => handleCardClick(article);

    let cardComponent: React.ReactNode;
    switch (article.type) {
      case 'text':
        cardComponent = <ArticleCard key={article.id} card={article} onClick={handleClick} />;
        break;
      case 'image':
        cardComponent = <ImageCard key={article.id} card={article} onClick={handleClick} />;
        break;
      case 'drawing':
        // 绘画类型使用 ImageCard 显示，但添加特殊标识
        cardComponent = <ImageCard key={article.id} card={{
          ...article,
          description: article.excerpt + (article.imageCount ? ` 🎨 ${article.imageCount} 张` : '')
        }} onClick={handleClick} />;
        break;
      case 'code':
        cardComponent = <CodeCard key={article.id} card={article} onClick={handleClick} />;
        break;
      case 'diary':
        cardComponent = <DiaryCard key={article.id} card={article} onClick={handleClick} />;
        break;
      default:
        // 兼容 mock 数据的其他类型
        cardComponent = <CardRenderer key={article.id} card={article} onClick={handleClick} />;
        break;
    }

    return (
      <div className="book-content-block">
        {cardComponent}
      </div>
    );
  };

  return (
    <>
      
      <div style={{ marginLeft: isMobile ? 0 : (sidebarExpanded ? '280px' : '0'), transition: 'margin-left 0.3s ease' }}>
        <PageLayout
          theme={currentFishbowlTheme}
          box1Content={
          <div style={{ padding: '16px 24px' }}>
            {/* 桌面端：左右布局，移动端：上下布局 */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '12px',
              alignItems: isMobile ? 'stretch' : 'flex-end',
              justifyContent: isMobile ? 'flex-start' : 'space-between',
            }}>
              {/* 左侧：标签搜索筛选 */}
              {/* <div style={{ flex: 1 }}>
                <Select
                  mode="tags"
                  value={selectedTags}
                  onChange={setSelectedTags}
                  placeholder="搜索或输入标签，空格/回车添加"
                  style={{ width: '100%' }}
                  size="large"
                  className="tag-select-transparent"
                  maxTagCount="responsive"
                  tokenSeparators={[' ']} // 空格自动分隔
                  tagRender={(props) => {
                    const { label, value } = props;
                    const colors = ['magenta', 'red', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'];
                    const tagIndex = allTags.indexOf(value as string);
                    const color = tagIndex >= 0 
                      ? colors[tagIndex % colors.length]
                      : 'default'; // 临时标签用默认颜色
                    
                    return (
                      <Tag
                        color={color}
                        closable={false}
                        style={{ marginRight: 3 }}
                      >
                        {label}
                      </Tag>
                    );
                  }}
                  options={allTags.map(tag => ({ label: tag, value: tag }))}
                />
              </div> */}

              {/* 右侧：关键词搜索 */}
              <div style={{ width: isMobile ? '100%' : '320px' }}>
                <Input.Search
                  className="search-input-transparent"
                  placeholder="搜索标题、作者、摘要..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onSearch={(value) => setSearchKeyword(value)}
                  size="large"
                  enterButton={<SearchOutlined />}
                  allowClear
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* 筛选结果提示 */}
            {(selectedTags.length > 0 || searchKeyword || selectedCategoryId) && (
              <div style={{
                marginTop: '12px',
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}>
                {selectedCategoryId && (selectedTags.length > 0 || searchKeyword) && <span> · </span>}
                {selectedTags.length > 0 && (
                  <span>已选 <strong>{selectedTags.length}</strong> 个标签</span>
                )}
                {selectedTags.length > 0 && searchKeyword && <span> · </span>}
                {searchKeyword && (
                  <span>搜索 "<strong>{searchKeyword}</strong>"</span>
                )}
                <span> · 找到 <strong>{filteredCards.length}</strong> 篇文章</span>
              </div>
            )}
          </div>
        }
        box2Style={{ padding: isMobile ? '40px 12px' : '40px 24px' }}
      >
        {/* 瀑布流容器 - 整体渐显动画 */}
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto',
          width: '100%',
          opacity: showBox2 ? 1 : 0,
          transform: showBox2 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 1s ease-out, transform 1s ease-out',
          willChange: 'opacity, transform', // GPU 加速
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
              {/* 加载中... */}
            </div>
          ) : filteredCards.length === 0 ? (
            <Empty
              icon="🔍"
              title="未找到匹配的文章"
              description="试试调整筛选条件或搜索其他关键词？"
            />
          ) : (
            <>
              <div style={{ minHeight: '400px' }}>
                <Masonry
                  columns={columns}
                  gutter={8}
                  items={filteredCards.map((card) => ({
                    key: `card-${card.id}`,
                    data: card,
                  }))}
                  itemRender={({ data }) => {
                    // 通过 filteredCards 查找索引
                    const index = filteredCards.findIndex(card => card.id === data.id);
                    return renderCard(data, index >= 0 ? index : 0);
                  }}
                />
              </div>

              {/* 加载更多提示 */}
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

              {/* 没有更多数据提示 */}
              {!hasMore && filteredCards.length > 0 && (
                <LoadEnd />
              )}
            </>
          )}
        </div>
        </PageLayout>
      </div>

      {/* 统一的归档分类导航组件（自动适配移动端/桌面端） */}
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

      {/* 归档页面操作悬浮按钮组 */}
      <ArchiveActionFloat
        onDiarySuccess={() => {
          // 重新加载文章列表（成功消息已在组件内部显示）
          setOffset(0);
          setHasMore(true);
          loadArticles(0, false, selectedCategoryId);
        }}
      />

      {/* 添加旋转动画样式 */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default function ArticlesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ArticlesPageContent />
    </Suspense>
  );
}
