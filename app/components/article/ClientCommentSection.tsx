'use client';
import React from 'react';

export default function ClientCommentSection({ articleId, initialCount }: { articleId: string; initialCount?: number }) {
  return (
    <section style={{ padding: '16px', maxWidth: 900, margin: '24px auto' }}>
      <h3>评论（{initialCount ?? 0}）</h3>
      <p>评论组件已被拆分为 client-only，并且懒加载以减少首屏体积。</p>
    </section>
  );
}
