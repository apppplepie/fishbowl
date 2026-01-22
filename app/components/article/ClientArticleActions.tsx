'use client';
import React, { useState } from 'react';

export default function ClientArticleActions({ articleId, initialLikes }: { articleId: string; initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes || 0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleLike = async () => {
    setLoading(true);
    try {
      // call your API to like/unlike - keep optimistic UI
      // await fetch(`/api/articles/${articleId}/like`, { method: 'POST' });
      setLiked(v => !v);
      setLikes(l => l + (liked ? -1 : 1));
    } catch (e) {
      console.error(e);
      alert('点赞失败');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('链接已复制');
    } catch {
      alert('复制失败');
    }
  };

  const handleExportImage = async () => {
    const mod = await import('./exportLongImage');
    mod.exportArticleAsImage(articleId);
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
      <button onClick={toggleLike} disabled={loading}>{liked ? '❤️ 已点赞' : '♡ 点赞'} {likes}</button>
      <button onClick={handleShare}>分享</button>
      <button onClick={handleExportImage}>导出为长图</button>
    </div>
  );
}
