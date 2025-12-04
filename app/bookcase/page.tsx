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

  // 加载书架文章数据（只显示cat_bookcase分类）
  const loadBookcaseArticles = async (currentOffset: number, append: boolean = false) => {
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
        categoryId: 'cat_bookcase', // 只显示书架分类
      });

      // 使用优化的列表 API，一次查询返回所有预览数据
      const response = await fetch(`/api/articles/list?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.success) {
        // API 已经返回了所有需要的预览数据
        const articles = result.articles;

        console.log('API 返回的文章数量:', articles.length);
        console.log('文章列表:', articles.map((a: any) => ({
          id: a.id,
          title: a.title,
          category_id: a.category_id,
          category_name: a.category_name
        })));

        // 将文章数据转换为书籍卡片
        const bookCards = extractBooksFromArticles(articles);

        if (append) {
          // 追加模式：添加到现有列表，并去重
          setCards(prev => {
            const existingIds = new Set(prev.map(card => card.id));
            const newBooks = bookCards.filter(
              (book: any) => !existingIds.has(book.id)
            );
            return [...prev, ...newBooks];
          });
        } else {
          // 初始加载模式：替换列表，但也要去重
          const uniqueBookCards = bookCards.filter((book, index, self) =>
            index === self.findIndex(b => b.id === book.id)
          );
          setCards(uniqueBookCards);
        }

        // 判断是否还有更多数据
        setHasMore(result.articles.length === ITEMS_PER_PAGE);
        setOffset(currentOffset + result.articles.length);
      } else {
        // API 失败
        if (!append) {
          console.log('API 失败，使用 mock 数据');
          // 使用BookCard mock数据，但要与现有数据去重
          setCards(prev => {
            const existingIds = new Set(prev.map(card => card.id));
            const newBooks = mockBookCards.filter(book => !existingIds.has(book.id));
            return [...prev, ...newBooks];
          });
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('加载书架文章失败:', error);
      if (!append) {
        // 网络错误，使用 mock 数据，但要与现有数据去重
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

  // 初次加载
  useEffect(() => {
    console.log('加载数据库书籍数据');
    loadBookcaseArticles(0, false);
  }, []);

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
    // 数据库文章直接跳转
    if (card.type === 'text' || card.type === 'image' || card.type === 'code' || card.type === 'diary' || card.type === 'drawing') {
      router.push(`/article/${card.id}`);
    } else if (card.type === 'article') {
      // mock 数据兼容
      router.push(`/article/${card.id}`);
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

            {/* 管理分类按钮 */}
            <div style={{ marginTop: '12px' }}>
              <Button
                type="primary"
                icon={<UnorderedListOutlined />}
                onClick={openCategoryModal}
                size="small"
              >
                管理书籍分类
              </Button>
            </div>
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
          <div style={{
            padding: '20px',
            textAlign: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1a1a1a',
          }}>
            📚 我的书架
          </div>
          <div style={{
            padding: '0 20px 20px',
            color: '#666',
            fontSize: '14px',
            lineHeight: '1.6',
          }}>
            这里收藏了我喜欢的书籍和阅读资料。可以通过标签和关键词来快速找到想要的内容。
          </div>
        </div>
      )}

      {/* 目录抽屉 - 书架页面专用 */}
      {/* 目录抽屉 - 书架页面专用 */}
      <BookCategoryDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        selectedCategoryId={selectedTags.length > 0 ? undefined : undefined} // 这里可以根据需要传递选中的分类ID
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
