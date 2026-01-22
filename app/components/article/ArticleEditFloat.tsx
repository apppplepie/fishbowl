'use client';
import React from 'react';

export default function ArticleEditFloat({ articleId }: { articleId: string }) {
  // This is a placeholder for your heavy floating editor UI.
  // In your original file, ArticleEditFloat used DOM APIs and many useEffects.
  // Keep that file client-only and dynamically import it in the shell (ssr:false).
  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20 }}>
      {/* Replace with your real floating editor UI */}
      <button>编辑（浮动，编辑权限可见）</button>
    </div>
  );
}
