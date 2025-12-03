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
          maxHeight: '500px',
          objectFit: 'cover',
          display: imgLoaded ? 'block' : 'none',
          transition: 'transform 0.3s ease',
          borderRadius: '8px',
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [columns, setColumns] = useState<number>(4);

  const ITEMS_PER_PAGE = 20; // 每页加载20个作品

  // 获取绘画作品列表（使用优化的 API）
  const fetchDrawingArticles = async (currentOffset: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // 使用优化的绘画作品 API，一次查询返回所有需要的数据
      const response = await fetch(
        `/api/articles/drawing?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`
      );
      const data = await response.json();
      
      if (data.success) {
        if (append) {
          // 追加模式：添加到现有列表，并去重
          setArticles(prev => {
            const existingIds = new Set(prev.map(article => article.id));
            const newArticles = data.articles.filter(
              (article: any) => !existingIds.has(article.id)
            );
            return [...prev, ...newArticles];
          });
        } else {
          // 初始加载模式：替换列表
          setArticles(data.articles);
        }

        // 判断是否还有更多数据
        setHasMore(data.articles.length === ITEMS_PER_PAGE);
        setOffset(currentOffset + data.articles.length);

        console.log(`加载了 ${data.articles.length} 个作品，总计 ${append ? articles.length + data.articles.length : data.articles.length} 个`);
      } else {
        message.error('获取作品失败');
        setHasMore(false);
      }
    } catch (error) {
      console.error('获取作品失败:', error);
      message.error('获取作品失败');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 初次加载
  useEffect(() => {
    fetchDrawingArticles(0, false);
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
        fetchDrawingArticles(offset, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [offset, loading, loadingMore, hasMore]);

  const handleImageClick = async (article: any) => {
    // 如果文章已经有完整的 blocks 数据，直接使用
    if (article.blocks && article.blocks.length > 0) {
      setSelectedArticle(article);
      return;
    }

    // 否则，需要获取完整的文章数据（包含所有 blocks）
    try {
      const detailRes = await fetch(`/api/articles/${article.id}`);
      const detailData = await detailRes.json();
      
      if (detailData.success) {
        // 合并列表数据和详情数据
        const fullArticle = {
          ...article,
          blocks: detailData.article.blocks,
        };
        
        // 更新缓存
        setArticles(prev => 
          prev.map(a => a.id === article.id ? fullArticle : a)
        );
        
        setSelectedArticle(fullArticle);
      } else {
        message.error('获取作品详情失败');
      }
    } catch (error) {
      console.error('获取作品详情失败:', error);
      message.error('获取作品详情失败');
    }
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
          <>
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

            {/* 加载更多提示 */}
            {loadingMore && (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#999',
              }}>
                <Spin size="large" />
                <div style={{ marginTop: '12px', fontSize: '14px' }}>
                  加载更多作品...
                </div>
              </div>
            )}

            {/* 没有更多数据提示 */}
            {!hasMore && articles.length > 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#999',
                fontSize: '14px',
              }}>
                <div style={{ marginBottom: '8px' }}>🎨</div>
                已经到底了，没有更多作品啦~
              </div>
            )}
          </>
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
      <GalleryPublishFloat 
        onSuccess={() => {
          // 重新加载列表
          setOffset(0);
          setHasMore(true);
          fetchDrawingArticles(0, false);
        }} 
      />
    </PageLayout>
  );
}

