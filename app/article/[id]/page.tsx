/**
 * Article Page - Server Component
 * Renders article content on the server for better SEO and initial load performance
 */

import React from 'react';
import { notFound } from 'next/navigation';
import { fetchArticleData, fetchCategoryPath } from '@/app/lib/articleServer';
import ClientArticleShell from '@/app/components/article/ClientArticleShell';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id: articleId } = await params;
  const article = await fetchArticleData(articleId);
  if (!article) notFound();

  // Fetch category path for breadcrumb
  let categoryPath: { id: string; name: string; }[] = [];
  if (article.category_id) {
    categoryPath = await fetchCategoryPath(article.category_id);
  }

  return (
    <ClientArticleShell
      articleId={articleId}
      initialArticle={article}
      initialLikes={article.likes || 0}
      initialComments={article.comments || 0}
      categoryPath={categoryPath}
    />
  );
}