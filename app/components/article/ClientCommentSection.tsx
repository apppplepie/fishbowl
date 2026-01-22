'use client';
import React from 'react';

export default function ClientCommentSection({ articleId, initialCount }: { articleId: string; initialCount?: number }) {
  return (
    <div id="comment-section" style={{ marginTop: '32px' }}>
      <h3>评论（{initialCount ?? 0}）</h3>
    </div>
  );
}
