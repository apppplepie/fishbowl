// ArticleStaticView.server.tsx  (Server Component)
import React from 'react';

export default function ArticleStaticView({ article }: { article: any }) {
  return (
    <div style={{
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
    }}>
      {/* 文章头部（Server 渲染，利于 SEO 与 LCP） */}
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>{article.title}</h1>
        {article.excerpt && <p style={{ color: '#666', marginTop: 8 }}>{article.excerpt}</p>}
      </header>

      {/* 文章正文容器：客户端组件会在这里接管渲染（inline 编辑会在客户端实现） */}
      <div id={`article-content-${article.id}`} data-article-content />
    </div>
  );
}
