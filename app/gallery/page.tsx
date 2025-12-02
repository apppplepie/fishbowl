'use client';

import React, { useState, useEffect } from 'react';
import { Masonry, Modal, Spin, message } from 'antd';
import { useRouter } from 'next/navigation';
import PageLayout from '../components/PageLayout';
import Header from '../components/Header';
import DrawingGalleryCard from '../components/cards/DrawingGalleryCard';
import GalleryPublishFloat from '../components/GalleryPublishFloat';

// 根据屏幕宽度计算列数
const calculateColumns = (width: number) => {
  if (width >= 1400) return 5;
  if (width >= 1200) return 4;
  if (width >= 768) return 3;
  if (width >= 480) return 2;
  return 1;
};

// 图片项组件（显示文章的封面）
const GalleryImage: React.FC<{
  article: any;
  onClick: () => void;
}> = ({ article, onClick }) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      {/* 占位图 */}
      {!imgLoaded && (
        <img
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3Cpath d='M200 120 L200 180 M170 150 L230 150' stroke='%23d0d0d0' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E"
          alt="loading"
          style={{
            width: '100%',
            display: 'block',
          }}
        />
      )}
      
      {/* 真实图片 */}
      <img 
        src={article.cover_image_url} 
        alt={article.title}
        onLoad={() => setImgLoaded(true)}
        style={{ 
          width: '100%',
          display: imgLoaded ? 'block' : 'none',
          transition: 'transform 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      />
    </div>
  );
};

export default function GalleryPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [columns, setColumns] = useState<number>(4);

  // 获取绘画类型文章列表（加载完整数据并缓存）
  const fetchDrawingArticles = async () => {
    try {
      setLoading(true);
      // 获取所有绘画类型文章
      const response = await fetch('/api/articles?status=published&limit=100');
      const data = await response.json();
      
      if (data.success) {
        // 筛选出绘画类型的文章
        const drawingArticles = data.articles.filter((a: any) => a.type === 'drawing');
        
        // 为每篇文章获取完整数据（包含所有 blocks）
        const articlesWithFullData = await Promise.all(
          drawingArticles.map(async (article: any) => {
            try {
              const detailRes = await fetch(`/api/articles/${article.id}`);
              const detailData = await detailRes.json();
              
              if (detailData.success) {
                const articleWithBlocks = detailData.article;
                // 获取所有图片块
                const imageBlocks = articleWithBlocks.blocks.filter((b: any) => b.type === 'image');
                
                if (imageBlocks.length > 0) {
                  // 找到 order 最大的图片（最后一张）
                  const lastImage = imageBlocks.reduce((max: any, block: any) => 
                    block.order > max.order ? block : max
                  );
                  
                  // 返回完整数据，同时添加封面字段
                  return {
                    ...articleWithBlocks, // 包含所有 blocks
                    cover_image_url: lastImage.parsedContent.url,
                    image_count: imageBlocks.length,
                  };
                }
              }
            } catch (error) {
              console.error('获取文章详情失败:', error);
            }
            return null;
          })
        );
        
        // 过滤掉失败的项
        const validArticles = articlesWithFullData.filter(a => a !== null);
        setArticles(validArticles);
      } else {
        message.error('获取文章失败');
      }
    } catch (error) {
      console.error('获取文章失败:', error);
      message.error('获取文章失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawingArticles();
  }, []);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setColumns(calculateColumns(window.innerWidth));
    };

    // 初始化列数
    handleResize();

    // 添加窗口大小变化监听
    window.addEventListener('resize', handleResize);

    // 清理监听器
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleImageClick = (article: any) => {
    // 直接使用已缓存的完整数据，无需重新请求
    setSelectedArticle(article);
  };

  const handleTitleClick = (article: any) => {
    // 跳转到文章页面
    router.push(`/article/${article.id}`);
  };

  return (
    <PageLayout
      box1Content={<Header />}
      box1BgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      box2BgColor="#f5f5f5"
      box2Style={{ padding: '40px 20px' }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Spin size="large" />
          </div>
        ) : articles.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '100px 20px',
            color: '#999',
          }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>🎨 还没有作品</p>
            <p style={{ fontSize: '14px' }}>点击右下角按钮发布你的第一个绘画作品吧！</p>
          </div>
        ) : (
          <Masonry
            columns={columns}
            gutter={16}
            items={articles.map((article, index) => ({
              key: article.id,
              data: article,
              index: index,
            }))}
            itemRender={({ data }) => (
              <GalleryImage
                article={data}
                onClick={() => handleImageClick(data)}
              />
            )}
          />
        )}
      </div>

      {/* 图组卡片模态框 */}
      <Modal
        open={!!selectedArticle}
        onCancel={() => setSelectedArticle(null)}
        footer={null}
        closable={false}
        width={600}
        centered
        styles={{ body: { padding: 0 } }}
      >
        {selectedArticle && (
          <DrawingGalleryCard
            article={selectedArticle}
            onTitleClick={() => handleTitleClick(selectedArticle)}
          />
        )}
      </Modal>

      {/* 发布悬浮按钮 */}
      <GalleryPublishFloat onSuccess={fetchDrawingArticles} />
    </PageLayout>
  );
}

