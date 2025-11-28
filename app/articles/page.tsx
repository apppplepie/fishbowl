'use client';

import React, { useState, useEffect } from 'react';
import { Masonry } from 'antd';
import { Tag, Flex } from 'antd';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import PageLayout from '@/app/components/PageLayout';
import CardRenderer from '@/app/components/cards/CardRenderer';
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
  const [cards] = useState<Card[]>(mockCards);

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
  const handleCardClick = (card: Card) => {
    console.log('点击了卡片:', card);
    // 可以根据不同类型的卡片做不同处理
    if (card.type === 'article') {
      router.push(`/article/${card.id}`);
    }
    // 其他类型的卡片可以弹出模态框或其他操作
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
          <Masonry
            columns={columns}
            gutter={16}
            items={cards.map((card) => ({
              key: `card-${card.id}`,
              data: card,
            }))}
            itemRender={({ data }) => (
              <CardRenderer 
                card={data} 
                onClick={handleCardClick}
              />
            )}
          />
        </div>
      </PageLayout>
    </>
  );
}

