/**
 * Article Page - Server Component
 * Render shell immediately, load content on client
 */

import React from 'react';
import ClientArticleShell from '@/app/components/article/ClientArticleShell';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id: articleId } = await params;

  return (
    <ClientArticleShell
      articleId={articleId}
      initialArticle={null}
      initialLikes={0}
      initialComments={0}
      categoryPath={[]}
    />
  );
}