'use client';

import React, { useState, useEffect } from 'react';
import { Masonry } from 'antd';
import { Tag, Flex } from 'antd';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import PageLayout from '@/app/components/PageLayout';
import CardRenderer from '@/app/components/cards/CardRenderer';
import ArticleCard from '@/app/components/cards/ArticleCard';
import ImageCard from '@/app/components/cards/ImageCard';
import CodeCard from '@/app/components/cards/CodeCard';
import DiaryCard from '@/app/components/cards/DiaryCard';
import { mockCards } from '@/app/data/mockCards';
import type { Card } from '@/app/types/card';

// 标签数据（占位展示）
const tags = [
  { id: 1, name: '技术', color: 'blue' },
  { id: 2, name: '生活', color: 'green' },
  { id: 3, name: '摄影', color: 'orange' },
  { id: 4, name: '随笔', color: 'purple' },
  { id: 5, name: '旅行', color: 'cyan' },
  { id: 6, name: '美食', color: 'gold' },
  { id: 7, name: '读书', color: 'geekblue' },
];

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

  // 从 API 加载文章数据
  useEffect(() => {
    async function loadArticles() {
      try {
        const response = await fetch('/api/articles?status=published&limit=50');
        const result = await response.json();
        
        if (response.ok && result.success) {
          // 处理文章数据，为不同类型添加必要的字段
          const processedArticles = await Promise.all(
            result.articles.map(async (article: any) => {
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
          
          setCards(processedArticles);
        } else {
          // API 失败，使用 mock 数据
          console.log('API 失败，使用 mock 数据');
          setCards(mockCards);
        }
      } catch (error) {
        console.error('加载文章失败:', error);
        // 网络错误，使用 mock 数据
        setCards(mockCards);
      } finally {
        setLoading(false);
      }
    }

    loadArticles();
  }, []);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setColumns(calculateColumns(window.innerWidth));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            <Flex gap="small" align="center" wrap>
              {tags.map((tag) => (
                <Tag
                  key={tag.id}
                  color={tag.color}
                  style={{
                    fontSize: '14px',
                    padding: '4px 12px',
                  }}
                >
                  {tag.name}
                </Tag>
              ))}
            </Flex>
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
          ) : (
            <Masonry
              columns={columns}
              gutter={16}
              items={cards.map((card) => ({
                key: `card-${card.id}`,
                data: card,
              }))}
              itemRender={({ data }) => renderCard(data)}
            />
          )}
        </div>
      </PageLayout>
    </>
  );
}

