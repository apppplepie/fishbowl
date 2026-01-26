/**
 * Article Page - Server Component
 * Preload article data on server for faster initial render
 */

import React from 'react';
import ClientArticleShell from '@/app/components/article/ClientArticleShell';
import { fetchArticleData, fetchCategoryPath } from '@/app/lib/articleServer';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id: articleId } = await params;

  // 服务端预加载文章数据
  const article = await fetchArticleData(articleId);
  
  // 如果有分类ID，获取分类路径
  const categoryPath = article?.category_id 
    ? await fetchCategoryPath(article.category_id)
    : [];

  return (
    <ClientArticleShell
      articleId={articleId}
      initialArticle={article}
      initialLikes={article?.likes || 0}
      initialComments={article?.comments || 0}
      categoryPath={categoryPath}
    />
  );
}