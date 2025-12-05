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
import DiaryPublishFloat from '@/app/components/float/DiaryPublishFloat';
import BookCategoryDrawer, { BookCategoryDrawerButton } from '@/app/components/sidebar/BookCategoryDrawer';
import BookCategoryModal from '@/app/components/sidebar/ChapterDragSort';
import BookPublishFloat from '@/app/components/float/BookPublishFloat';
import BookCategorySidebar from '@/app/components/sidebar/BookCategorySidebar'
import { mockCards } from '@/app/data/mockCards';
import type { Card } from '@/app/types/card';
import { extractBooksFromArticles } from '@/app/utils/bookUtils';
import { mockBookCards } from '@/app/utils/bookMocks';
import '../styles/articles-filter.css';

// 根据屏幕宽度计算列数
const calculateColumns = (width: number) => {
  if (width >= 1400) return 4;
  if (width >= 1200) return 3;
  if (width >= 768) return 2;
  return 1;
};

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

  // 书籍分类管理模态框状态
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // 打开目录抽屉的函数
  const openCategoryDrawer = () => setDrawerVisible(true);

  // 打开书籍分类管理模态框的函数
  const openCategoryModal = () => setCategoryModalVisible(true);

  const ITEMS_PER_PAGE = 15; // 每页加载15篇

  // 加载所有可用标签
  useEffect(() => {
    async function loadTags() {
      try {
        const response = await fetch('/api/tags');
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

  // 递归获取分类及其所有子分类的ID
  const getAllCategoryIds = async (categoryId: string): Promise<string[]> => {
    const allIds = [categoryId];
    const visited = new Set<string>();

    const collectCategoryIds = async (catId: string) => {
      if (visited.has(catId)) return;
      visited.add(catId);

      try {
        const response = await fetch(`/api/categories?type=children&parentId=${catId}`);
        const result = await response.json();

        if (result.success && result.categories) {
          for (const category of result.categories) {
            allIds.push(category.id);
            await collectCategoryIds(category.id); // 递归获取子分类
          }
        }
      } catch (error) {
        console.error(`获取分类 ${catId} 的子分类失败:`, error);
      }
    };

    await collectCategoryIds(categoryId);
    return [...new Set(allIds)]; // 去重
  };

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
        // 书橱根目录：直接获取下一级目录，按order_index排序显示为bookcard
        const response = await fetch('/api/categories?type=children&parentId=cat_bookcase');
        const result = await response.json();

        if (response.ok && result.success) {
          const categories = result.categories;
          console.log('书橱根目录 - 获取到的书籍分类数量:', categories.length);

          // 按order_index排序
          const sortedCategories = categories.sort((a: any, b: any) => {
            const orderA = a.order_index || 0;
            const orderB = b.order_index || 0;
            return orderA - orderB;
          });

          // 应用分页
          const startIndex = currentOffset;
          const endIndex = startIndex + ITEMS_PER_PAGE;
          const paginatedCategories = sortedCategories.slice(startIndex, endIndex);

          // 将分类转换为书籍卡片
          const bookCards = await Promise.all(paginatedCategories.map(async (category: any, index: number) => {
            // 使用递增的ID确保唯一性
            const bookCardId = 10000 + currentOffset + index;

            // 获取该分类下的第一篇文章作为书籍信息
            try {
              const articleResponse = await fetch(`/api/articles/list?categoryId=${category.id}&limit=1&status=published`);
              const articleResult = await articleResponse.json();

              if (articleResponse.ok && articleResult.success && articleResult.articles.length > 0) {
                const mainArticle = articleResult.articles[0];
                return {
                  id: bookCardId,
                  type: 'book',
                  title: category.name,
                  description: mainArticle.excerpt || '暂无简介',
                  coverImage: mainArticle.firstImageUrl || '/default-book-cover.jpg',
                  author: mainArticle.author || '未知作者',
                  updatedAt: mainArticle.last_modified || mainArticle.publish_date || new Date().toISOString(),
                  mainArticleId: mainArticle.id.toString(),
                  createdAt: mainArticle.publish_date || new Date().toISOString(),
                };
              }
            } catch (error) {
              console.error(`获取分类 ${category.id} 的文章失败:`, error);
            }

            // 如果获取文章失败，返回基本的书籍信息
            return {
              id: bookCardId,
              type: 'book',
              title: category.name,
              description: '暂无简介',
              coverImage: '/default-book-cover.jpg',
              author: '未知作者',
              updatedAt: new Date().toISOString(),
              mainArticleId: category.id,
              createdAt: new Date().toISOString(),
            };
          }));

          if (append) {
            setCards(prev => [...prev, ...bookCards]);
          } else {
            setCards(bookCards);
          }

          setHasMore(endIndex < sortedCategories.length);
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
          orderByPath: 'true', // 按path和order_in_category排序
        });

        const response = await fetch(`/api/articles/list?${params.toString()}`);
        const result = await response.json();

        let allArticles: any[] = [];
        if (response.ok && result.success) {
          allArticles = result.articles;
          console.log('分类目录 - API返回文章数量:', allArticles.length);
        } else {
          console.error('获取分类文章失败:', result);
        }

        // 获取该分类的直接子分类信息，用于混合排序
        const childCategoriesResponse = await fetch(`/api/categories?type=children&parentId=${categoryFromUrl}`);
        const childCategoriesResult = await childCategoriesResponse.json();
        const childCategories = childCategoriesResult.success ? childCategoriesResult.categories : [];

        // 创建category_id到order_index的映射
        const categoryOrderMap = new Map<string, number>();
        childCategories.forEach((cat: any) => {
          categoryOrderMap.set(cat.id, cat.order_index || 0);
        });

        // 去重
        const uniqueArticles = allArticles.filter((article, index, self) =>
          index === self.findIndex(a => a.id === article.id)
        );

        // 混合排序：同一级的子分类和文章按统一排序值排序
        const sortedArticles = uniqueArticles.sort((a, b) => {
          // 计算排序值：直接文章用order_in_category，子分类文章用子分类的order_index
          const getSortValue = (article: any) => {
            if (article.category_id === categoryFromUrl) {
              // 直接文章
              return article.order_in_category || 0;
            } else {
              // 子分类文章，用子分类的order_index
              return categoryOrderMap.get(article.category_id) || 999;
            }
          };

          const sortA = getSortValue(a);
          const sortB = getSortValue(b);

          if (sortA !== sortB) {
            return sortA - sortB; // 按排序值从小到大
          }

          // 相同排序值时，按order_in_category排序
          const orderA = a.order_in_category || 0;
          const orderB = b.order_in_category || 0;
          if (orderA !== orderB) {
            return orderA - orderB;
          }

          // 最后按创建时间排序
          return new Date(a.createdAt || a.publish_date).getTime() - new Date(b.createdAt || b.publish_date).getTime();
        });

        console.log('分类目录 - 排序后文章数量:', sortedArticles.length);

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
        return <BookCard key={article.id} card={article} onClick={handleClick} />;
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
          <BookCategoryDrawerButton onClick={openCategoryDrawer} />
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
          {loading ? (
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

      {/* 电脑端固定侧边栏 - 从 header 下方到页面底部 */}
      {!isMobile && (
  <div
    style={{
      position: 'fixed',
      left: 0,
      top: '45px', // header 的高度
      bottom: 0,
      width: '280px',
      background: 'white',
      borderRight: '1px solid #e8e8e8',
      zIndex: 999,
      overflowY: 'auto',
    }}
  >
    <BookCategorySidebar selectedCategoryId={categoryFromUrl} />
  </div>
)}

      {/* 目录抽屉 - 书架页面专用 */}
      <BookCategoryDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        selectedCategoryId={categoryFromUrl} // 传递从URL获取的category参数
      />

      {/* 日志发布悬浮按钮 */}
      <DiaryPublishFloat
        onSuccess={() => {
          message.success('日志发布成功！');
          // 重新加载文章列表
          setOffset(0);
          setHasMore(true);
          loadBookcaseArticles(0, false);
        }}
      />

      {/* 添加旋转动画样式 */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* 书籍发布悬浮按钮 */}
      <BookPublishFloat />

      {/* 书籍分类管理模态框 */}
      <BookCategoryModal
        open={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onSuccess={() => {
          // 分类调整成功后重新加载书籍列表
          loadBookcaseArticles(0, false);
        }}
      />
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
