import { Suspense } from 'react';
import { headers } from 'next/headers';
import ArchiveCSSClient from './ArchiveCSSClient';
import '../styles/articles-filter.css';

/**
 * 文章归档页面 - CSS Grid Masonry 版本
 * 使用浏览器原生 masonry 布局（Chrome 117+）
 */

// 服务端数据获取函数
async function getInitialArticles(categoryId?: string | null) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      status: 'published',
      limit: '15',
      offset: '0',
    });

    if (categoryId) {
      params.append('categoryId', categoryId);
    }

    const headersList = await headers();
    const cookieHeader = headersList.get('cookie');

    const response = await fetch(
      `${baseUrl}/api/articles/list?${params.toString()}`,
      {
        next: { revalidate: 60 },
        headers: {
          'Content-Type': 'application/json',
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
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

export default async function ArchiveCSSPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = (await searchParams) ?? {};
  const { articles, hasMore } = await getInitialArticles(category);

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <ArchiveCSSClient 
        initialArticles={articles}
        initialHasMore={hasMore}
        initialOffset={0}
      />
    </Suspense>
  );
}

