'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Masonry, Input, Tag, Select, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import PageLayout from '@/app/components/PageLayout';
import CardRenderer from '@/app/components/cards/CardRenderer';
import ArticleCard from '@/app/components/cards/ArticleCard';
import ImageCard from '@/app/components/cards/ImageCard';
import CodeCard from '@/app/components/cards/CodeCard';
import DiaryCard from '@/app/components/cards/DiaryCard';
import DiaryPublishFloat from '@/app/components/DiaryPublishFloat';
import { mockCards } from '@/app/data/mockCards';
import type { Card } from '@/app/types/card';
import '../styles/articles-filter.css';

// 根据屏幕宽度计算列数
const calculateColumns = (width: number) => {
  if (width >= 1400) return 4;
  if (width >= 1200) return 3;
  if (width >= 768) return 2;
  return 1;
};

/**
 * 文章归档页面
 * 使用瀑布流布局展示各种类型的卡片
 * Box1: 标签筛选区
 * Box2: 瀑布流卡片展示区
 */
export default function ArticlesPage() {
  const { isMobile } = useResponsive();
  const router = useRouter();
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

  // 处理文章数据（提取图片/代码预览）
  const processArticles = async (articles: any[]) => {
    return await Promise.all(
      articles.map(async (article: any) => {
        // 如果是图片、代码或绘画类型，需要获取块信息
        if (article.type === 'image' || article.type === 'code' || article.type === 'drawing') {
          try {
            const detailRes = await fetch(`/api/articles/${article.id}`);
            const detailResult = await detailRes.json();
            if (detailRes.ok && detailResult.success) {
              const articleWithBlocks = detailResult.article;
              
              // 图片类型：提取第一个图片块
              if (article.type === 'image') {
                const firstImageBlock = articleWithBlocks.blocks.find(
                  (b: any) => b.type === 'image'
                );
                if (firstImageBlock) {
                  article.firstImageUrl = firstImageBlock.parsedContent.url;
                }
              }
              
              // 绘画类型：提取 order 最大的图片块（最后一张）
              if (article.type === 'drawing') {
                const imageBlocks = articleWithBlocks.blocks
                  .filter((b: any) => b.type === 'image')
                  .sort((a: any, b: any) => b.order - a.order); // 按 order 降序排列
                
                if (imageBlocks.length > 0) {
                  article.firstImageUrl = imageBlocks[0].parsedContent.url;
                  article.imageCount = imageBlocks.length;
                }
              }
              
              // 代码类型：提取第一个代码块预览
              if (article.type === 'code') {
                const codeBlocks = articleWithBlocks.blocks.filter(
                  (b: any) => b.type === 'code'
                );
                if (codeBlocks.length > 0) {
                  article.codePreview = codeBlocks[0].parsedContent.code;
                  article.codeLanguage = codeBlocks[0].parsedContent.language;
                  article.codeBlockCount = codeBlocks.length;
                }
              }
            }
          } catch (error) {
            console.error('获取文章详情失败:', error);
          }
        }
        
        return article;
      })
    );
  };

  // 加载文章数据（支持分批加载）
  const loadArticles = async (currentOffset: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `/api/articles?status=published&limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`
      );
      const result = await response.json();
      
      if (response.ok && result.success) {
        const processedArticles = await processArticles(result.articles);
        
        if (append) {
          // 追加模式：添加到现有列表，并去重
          setCards(prev => {
            const existingIds = new Set(prev.map(card => card.id));
            const newArticles = processedArticles.filter(
              article => !existingIds.has(article.id)
            );
            return [...prev, ...newArticles];
          });
        } else {
          // 初始加载模式：替换列表
          setCards(processedArticles);
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

  // 初次加载
  useEffect(() => {
    loadArticles(0, false);
  }, []);

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

  // 点击卡片处理
  const handleCardClick = (card: any) => {
    console.log('点击了卡片:', card);
    // 数据库文章直接跳转
    if (card.type === 'text' || card.type === 'image' || card.type === 'code' || card.type === 'diary' || card.type === 'drawing') {
      router.push(`/article/${card.id}`);
    } else if (card.type === 'article') {
      // mock 数据兼容
      router.push(`/article/${card.id}`);
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
      default:
        // 兼容 mock 数据的其他类型
        return <CardRenderer key={article.id} card={article} onClick={handleClick} />;
    }
  };

  return (
    <>
      {/* Header 独立在最顶部，覆盖在边框上 */}
      <Header />
      
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
              {/* 左侧：标签搜索筛选 */}
              <div style={{ flex: 1 }}>
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
                    const { label, value, closable, onClose } = props;
                    const colors = ['magenta', 'red', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'];
                    const tagIndex = allTags.indexOf(value as string);
                    const color = tagIndex >= 0 
                      ? colors[tagIndex % colors.length]
                      : 'default'; // 临时标签用默认颜色
                    
                    return (
                      <Tag
                        color={color}
                        closable={closable}
                        onClose={onClose}
                        style={{ marginRight: 3 }}
                      >
                        {label}
                      </Tag>
                    );
                  }}
                  options={allTags.map(tag => ({ label: tag, value: tag }))}
                />
              </div>

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
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>未找到匹配的文章</div>
              <div style={{ fontSize: '14px' }}>试试调整筛选条件或搜索其他关键词？</div>
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

      {/* 日记发布悬浮按钮 */}
      <DiaryPublishFloat 
        onSuccess={() => {
          message.success('日记发布成功！');
          // 重新加载文章列表
          setOffset(0);
          setHasMore(true);
          loadArticles(0, false);
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

