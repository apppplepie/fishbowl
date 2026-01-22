'use client';
// Client shell hydrates only interactive parts: header sync, actions (like/share/export),
// editor float, and comments. Keep this file light.
import React from 'react';
import dynamic from 'next/dynamic';
import ClientArticleActions from './ClientArticleActions';
import ClientHeaderSetter from './ClientHeaderSetter';

// Lazy load heavy interactive parts (editor, comments)
const ArticleEditFloat = dynamic(() => import('./ArticleEditFloat').catch(() => () => null), { ssr: false });
const CommentSection = dynamic(() => import('./ClientCommentSection').catch(() => () => null), { ssr: false });

export default function ClientArticleShell({ articleId, initialLikes, initialComments }: { articleId: string; initialLikes: number; initialComments: number }) {
  return (
    <>
      <ClientHeaderSetter articleId={articleId} />
      <div style={{ padding: '0 16px', maxWidth: 900, margin: '0 auto' }}>
        <ClientArticleActions articleId={articleId} initialLikes={initialLikes} />
      </div>

      {/* editor and comments are lazy-loaded to avoid adding to first byte */}
      <ArticleEditFloat articleId={articleId} />
      <CommentSection articleId={articleId} initialCount={initialComments} />
    </>
  );
}
