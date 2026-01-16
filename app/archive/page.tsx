import { Suspense } from 'react';
import { headers } from 'next/headers';
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

    // 获取请求的 headers，包括 Cookie（用于身份认证）
    // 这是安全的，因为：
    // 1. 服务端到服务端的内部请求，不会暴露给客户端
    // 2. HttpOnly Cookie 中的 token 无法被客户端 JavaScript 访问
    // 3. 只传递必要的 Cookie header，不传递其他敏感信息
    const headersList = await headers();
    const cookieHeader = headersList.get('cookie');

    const response = await fetch(
      `${baseUrl}/api/articles/list?${params.toString()}`,
      {
        next: { revalidate: 60 }, // ISR: 60秒缓存
        headers: {
          'Content-Type': 'application/json',
          // 传递 Cookie header，让服务端 API 能识别用户身份和权限
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

// 移除骨架屏 - 加载时显示空白，保持背景透明

// 主页面组件
export default async function ArchivePage({ 
  searchParams 
}: { 
  searchParams: { category?: string } 
}) {
  // 服务端预取首屏数据
  const { articles, hasMore } = await getInitialArticles(searchParams.category);

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      {/* 所有卡片都在 ArchiveClient 的 MasonryGrid 里统一渲染 */}
      <ArchiveClient 
        initialArticles={articles}
        initialHasMore={hasMore}
        initialOffset={0} // 从头开始
      />
    </Suspense>
  );
}
