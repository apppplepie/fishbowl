import { Suspense } from 'react';
import ArchiveClient from './ArchiveClient';
import '../styles/articles-filter.css';

/**
 * 文章归档页面 - 服务端组件
 * 预取首屏数据，提升 LCP 和 FCP 性能
 */

// 服务端数据获取函数
async function getInitialArticles(categoryId?: string | null) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      status: 'published',
      limit: '15', // 获取 15 条，首屏 6 条 SSR，剩余 9 条给客户端
      offset: '0',
    });

    if (categoryId) {
      params.append('categoryId', categoryId);
    }

    const response = await fetch(
      `${baseUrl}/api/articles/list?${params.toString()}`,
      {
        next: { revalidate: 60 }, // ISR: 60秒缓存
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('服务端获取文章失败:', response.status);
      return { articles: [], hasMore: false };
    }

    const result = await response.json();
    
    if (result.success) {
      return {
        articles: result.articles || [],
        hasMore: (result.articles || []).length === 15,
      };
    }

    return { articles: [], hasMore: false };
  } catch (error) {
    console.error('服务端获取文章异常:', error);
    return { articles: [], hasMore: false };
  }
}

// 骨架屏组件
function ArchiveSkeleton() {
  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto',
      padding: '40px 24px',
    }}>
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '16px',
      }}>
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className="archive-skeleton-item"
          />
        ))}
      </div>
    </div>
  );
}

// 主页面组件
export default async function ArchivePage({ 
  searchParams 
}: { 
  searchParams: { category?: string } 
}) {
  // 服务端预取首屏数据
  const { articles, hasMore } = await getInitialArticles(searchParams.category);

  return (
    <Suspense fallback={<ArchiveSkeleton />}>
      {/* 所有卡片都在 ArchiveClient 的 MasonryGrid 里统一渲染 */}
      <ArchiveClient 
        initialArticles={articles}
        initialHasMore={hasMore}
        initialOffset={0} // 从头开始
      />
    </Suspense>
  );
}
