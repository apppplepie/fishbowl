'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Masonry, Input, Tag, Select, message, Drawer, Button } from 'antd';
import { SearchOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/app/components/Header';
import PageLayout from '@/app/components/PageLayout';
import CardRenderer from '@/app/components/cards/CardRenderer';
import ArticleCard from '@/app/components/cards/ArticleCard';
import ImageCard from '@/app/components/cards/ImageCard';
import CodeCard from '@/app/components/cards/CodeCard';
import DiaryCard from '@/app/components/cards/DiaryCard';
import BookCard from '@/app/components/cards/BookCard';
import BookCategoryNavigator, { BookCategoryDrawerButton } from '@/app/components/sidebar/BookCategoryNavigator';
import BookcaseActionFloat from '@/app/components/float/BookcaseActionFloat';
import { mockCards } from '@/app/data/mockCards';
import type { Card } from '@/app/types/card';
import { extractBooksFromArticles } from '@/app/utils/bookUtils';
import { apiGet } from '@/lib/apiClient';
import { mockBookCards } from '@/app/utils/bookMocks';
import { cacheArticleList, getCachedArticleList, getArticleCategory, clearBookCache } from '@/app/utils/bookCache';
import { sortArticlesDFS, type CategoryNode, type ArticleNode } from '@/app/utils/bookDFS';
import '../styles/articles-filter.css';

// 根据屏幕宽度计算列数
const calculateColumns = (width: number) => {
  if (width >= 1400) return 4;
  if (width >= 1200) return 3;
  if (width >= 768) return 2;
  return 1;
};

// 获取完整的分类树结构
const loadCategoryTree = async (): Promise<any[]> => {
  try {
    const response = await apiGet('/api/categories/tree', { requiresAuth: false });
    const result = await response.json();

    if (result.success && result.data) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('获取分类树失败:', error);
    return [];
  }
};

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
            const articles = articleResult.articles;

            // 去重
            const uniqueArticles = articles.filter((article: any, index: number, self: any[]) =>
              index === self.findIndex(a => a.id === article.id)
            );

            // 排序文章
            const categoryTree = await loadCategoryTree();
            const categoryMap = new Map<string, CategoryNode>();
            const buildCategoryMap = (categories: any[]) => {
              categories.forEach(category => {
                categoryMap.set(category.id, category);
                if (category.children) {
                  buildCategoryMap(category.children);
                }
              });
            };
            buildCategoryMap(categoryTree);

            // 按 categoryId 分组文章
            const articlesMap = new Map<string, ArticleNode[]>();
            uniqueArticles.forEach((article: any) => {
              const catId = article.category_id;
              if (!articlesMap.has(catId)) {
                articlesMap.set(catId, []);
              }
              articlesMap.get(catId)!.push(article);
            });

            // 使用统一的 DFS 排序函数
            const sortedArticles = sortArticlesDFS(categoryId, categoryMap, articlesMap);
            const articleIds = sortedArticles.map((article: any) => article.id.toString());

            // 创建文章到分类的映射
            const articleCategoryMap = new Map<string, string>();
            sortedArticles.forEach((article: any) => {
              articleCategoryMap.set(article.id.toString(), article.category_id || categoryId);
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

// 导出预缓存函数供其他组件使用
export { preloadAllBookArticleLists };

/**
 * 书架页面
 * 显示cat_bookcase分类下的所有内容
 * 使用瀑布流布局展示各种类型的卡片
 * Box1: 标签筛选区
 * Box2: 瀑布流卡片展示区
 */
function BookcasePageContent() {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [columns, setColumns] = useState<number>(3);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false); // 延迟显示的加载状态
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // 过滤条件状态
  const [allTags, setAllTags] = useState<string[]>([]); // 所有可用标签
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 选中的标签
  const [searchKeyword, setSearchKeyword] = useState(''); // 搜索关键词

  // 从URL参数获取category
  const categoryFromUrl = searchParams.get('category');

  // 目录抽屉状态
  const [drawerVisible, setDrawerVisible] = useState(false);

  // 侧边栏刷新key，用于强制重新渲染侧边栏
  const [sidebarKey, setSidebarKey] = useState(0);

  // 删除模式状态
  const [deleteMode, setDeleteMode] = useState(false);

  // 打开目录抽屉的函数
  const openCategoryDrawer = () => setDrawerVisible(true);

  // 章节管理成功后的刷新函数
  const handleChapterManageSuccess = () => {
    console.log('章节管理成功，刷新页面和侧边栏');
    // 清除当前书籍的文章列表缓存，因为目录结构可能发生变化
    if (categoryFromUrl) {
      clearBookCache(categoryFromUrl);
    }
    // 刷新当前页面数据
    setOffset(0);
    setHasMore(true);
    loadBookcaseArticles(0, false);
    // 刷新侧边栏（通过更新key强制重新渲染）
    setSidebarKey(prev => prev + 1);
  };

  const ITEMS_PER_PAGE = 15; // 每页加载15篇

  // 加载所有可用标签和预缓存书籍文章列表
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

    // 后台预缓存所有书籍的文章列表，提升用户体验
    // 使用 setTimeout 避免阻塞页面初次加载
    setTimeout(() => {
      preloadAllBookArticleLists();
    }, 2000); // 2秒后开始预缓存，给页面加载让路
  }, []);


  // 加载书架文章数据
  const loadBookcaseArticles = async (currentOffset: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      let articles: any[] = [];

      // 根据是否有category参数决定加载逻辑
      if (!categoryFromUrl || categoryFromUrl === 'cat_bookcase') {
        // 书橱根目录：一次性获取所有书籍分类及其第一篇文章
        const response = await apiGet('/api/categories/book-previews?parentId=cat_bookcase', { requiresAuth: true });
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
              console.log('Main article for category', book.categoryName, ':', mainArticle);
              console.log('First image URL:', mainArticle.firstImageUrl);
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
        console.log('加载分类目录:', categoryFromUrl);

        // 直接调用API，让API自己处理递归获取所有子分类的文章
        const params = new URLSearchParams({
          status: 'published',
          limit: '1000', // 获取该分类及其所有子分类的所有文章
          offset: '0',
          categoryId: categoryFromUrl,
          orderByPath: 'true', // 按path和order_index排序
        });

        const response = await apiGet(`/api/articles/list?${params.toString()}`, { requiresAuth: false });
        const result = await response.json();

        let allArticles: any[] = [];
        if (response.ok && result.success) {
          allArticles = result.articles;
          console.log('分类目录 - API返回文章数量:', allArticles.length);
        } else {
          console.error('获取分类文章失败:', result);
        }

        // 获取完整的分类树
        const categoryTree = await loadCategoryTree();

        // 构建分类ID到节点的映射
        const categoryMap = new Map<string, any>();
        const buildCategoryMap = (categories: any[]) => {
          categories.forEach(category => {
            categoryMap.set(category.id, category);
            if (category.children) {
              buildCategoryMap(category.children);
            }
          });
        };
        buildCategoryMap(categoryTree);

        // 去重文章
        const uniqueArticles = allArticles.filter((article, index, self) =>
          index === self.findIndex(a => a.id === article.id)
        );

        // 按 categoryId 分组文章
        const articlesMap = new Map<string, any[]>();
        uniqueArticles.forEach(article => {
          const catId = article.categoryId;
          if (!articlesMap.has(catId)) {
            articlesMap.set(catId, []);
          }
          articlesMap.get(catId)!.push(article);
        });

        // 使用统一的 DFS 排序函数
        const sortedArticles = sortArticlesDFS(categoryFromUrl, categoryMap, articlesMap);

        console.log('分类目录 - 排序后文章数量:', sortedArticles.length);

        // 缓存有序的文章ID列表，用于文章切换功能
        const articleIds = sortedArticles.map(article => article.id.toString());
        cacheArticleList(categoryFromUrl, articleIds);

        // 应用分页
        const startIndex = currentOffset;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedArticles = sortedArticles.slice(startIndex, endIndex);

        if (append) {
          setCards(prev => [...prev, ...paginatedArticles]);
        } else {
          setCards(paginatedArticles);
        }

        setHasMore(endIndex < uniqueArticles.length);
        setOffset(endIndex);
      }

    } catch (error) {
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
      setLoadingMore(false);
    }
  };

  // 延迟显示加载动画，避免快速切换时的闪烁
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (loading) {
      // 延迟500ms后才显示加载动画
      timer = setTimeout(() => {
        setShowLoading(true);
      }, 500);
    } else {
      // 加载完成，立即隐藏
      setShowLoading(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading]);

  // 初次加载和category变化时重新加载
  useEffect(() => {
    console.log('加载数据库书籍数据，category:', categoryFromUrl);
    loadBookcaseArticles(0, false);
  }, [categoryFromUrl]);

  // 过滤文章
  const filteredCards = useMemo(() => {
    const filtered = cards.filter(article => {
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

    // 检查重复ID并记录
    const idCount: Record<string, number> = {};
    filtered.forEach(card => {
      const idStr = String(card.id);
      idCount[idStr] = (idCount[idStr] || 0) + 1;
    });

    const duplicates = Object.entries(idCount).filter(([id, count]) => count > 1);
    if (duplicates.length > 0) {
      console.error('发现重复的书籍ID:', duplicates);
      console.error('所有书籍ID:', filtered.map(card => ({ id: card.id, title: card.title })));
    }

    return filtered;
  }, [cards, selectedTags, searchKeyword]);

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
        loadBookcaseArticles(offset, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [offset, loading, loadingMore, hasMore]);

  // 点击卡片处理
  const handleCardClick = (card: any) => {
    console.log('点击了卡片:', card);
    console.log('卡片类型:', card.type);
    console.log('卡片ID:', card.id);
    console.log('主文章ID:', card.mainArticleId);
    // 所有文章类型都使用书籍页面的布局来显示
    if (card.type === 'text' || card.type === 'image' || card.type === 'code' || card.type === 'diary' || card.type === 'drawing') {
      router.push(`/book/${card.id}`);
    } else if (card.type === 'article') {
      // mock 数据兼容，也使用书籍页面布局
      router.push(`/book/${card.id}`);
    } else if (card.type === 'book') {
      // 书籍卡片跳转到书籍详情页
      router.push(`/book/${card.mainArticleId}`);
    }
    // 其他类型的卡片可以弹出模态框或其他操作
  };

  // 根据文章类型渲染对应的卡片
  const renderCard = (article: any) => {
    const handleClick = () => handleCardClick(article);

    switch (article.type) {
      case 'text':
        return <ArticleCard key={article.id} card={article} onClick={handleClick} />;
      case 'image':
        return <ImageCard key={article.id} card={article} onClick={handleClick} />;
      case 'drawing':
        // 绘画类型使用 ImageCard 显示，但添加特殊标识
        return <ImageCard key={article.id} card={{
          ...article,
          description: article.excerpt + (article.imageCount ? ` 🎨 ${article.imageCount} 张` : '')
        }} onClick={handleClick} />;
      case 'code':
        return <CodeCard key={article.id} card={article} onClick={handleClick} />;
      case 'diary':
        return <DiaryCard key={article.id} card={article} onClick={handleClick} />;
      case 'book':
        return (
          <BookCard 
            key={article.id} 
            card={article} 
            onClick={handleClick}
            showDeleteIcon={deleteMode}
            onDeleteSuccess={() => {
              // 删除成功后刷新页面和侧边栏
              console.log('书籍删除成功，刷新页面和侧边栏');
              // 清除当前书籍的文章列表缓存
              const bookCategoryId = (article as any).categoryId;
              if (bookCategoryId) {
                clearBookCache(bookCategoryId);
              }
              // 刷新当前页面数据
              setOffset(0);
              setHasMore(true);
              loadBookcaseArticles(0, false);
              // 刷新侧边栏（通过更新key强制重新渲染）
              setSidebarKey(prev => prev + 1);
              // 退出删除模式
              setDeleteMode(false);
            }}
          />
        );
      default:
        // 兼容 mock 数据的其他类型
        return <CardRenderer key={article.id} card={article} onClick={handleClick} />;
    }
  };

  return (
    <>
      {/* Header 独立在最顶部，覆盖在边框上 */}
      <Header
        leftContent={
          isMobile && <BookCategoryDrawerButton onClick={openCategoryDrawer} />
        }
      />

      <div style={{ marginLeft: isMobile ? 0 : '280px' }}>
        <PageLayout
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
            {(selectedTags.length > 0 || searchKeyword) && (
              <div style={{
                marginTop: '12px',
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}>
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
        box1BgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        box2BgColor="#f5f5f5"
        box2Style={{ padding: isMobile ? '16px' : '40px 20px' }}
      >
        {/* 瀑布流容器 */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
        }}>
          {showLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
              加载中...
            </div>
          ) : filteredCards.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>书架还是空的</div>
              <div style={{ fontSize: '14px' }}>试试调整筛选条件或添加一些书籍吧？</div>
            </div>
          ) : (
            <>
              <Masonry
                columns={columns}
                gutter={16}
                items={filteredCards.map((card) => ({
                  key: `card-${card.id}`,
                  data: card,
                }))}
                itemRender={({ data }) => renderCard(data)}
              />

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
                <div style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#999',
                  fontSize: '14px',
                }}>
                  <div style={{ marginBottom: '8px' }}>✨</div>
                  已经到底了，没有更多内容啦~
                </div>
              )}
            </>
          )}
        </div>
        </PageLayout>
      </div>

      {/* 统一的书籍分类导航组件（自动适配移动端/桌面端） */}
      <BookCategoryNavigator
        refreshKey={sidebarKey}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        selectedCategoryId={categoryFromUrl}
        onCategorySelect={(categoryId) => {
          // 移动端点击分类后跳转
          if (categoryId) {
            router.push(`/bookcase?category=${categoryId}`);
          } else {
            router.push('/bookcase');
          }
        }}
      />

      {/* 书架页面操作悬浮按钮组 */}
      <BookcaseActionFloat
        onChapterManageSuccess={handleChapterManageSuccess}
        deleteMode={deleteMode}
        onDeleteModeChange={(enabled) => {
          setDeleteMode(enabled);
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

export default function BookcasePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookcasePageContent />
    </Suspense>
  );
}
