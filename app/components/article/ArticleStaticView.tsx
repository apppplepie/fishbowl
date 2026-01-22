// Server Component - ArticleStaticView.tsx
// Renders title, excerpt, and static blocks (text/image/code) as HTML on the server.
import React from 'react';

export default function ArticleStaticView({ article }: { article: any }) {
  return (
    <main>
      <header style={{ padding: '24px 16px', borderBottom: '1px solid #eee' }}>
        <h1 style={{ margin: 0 }}>{article.title}</h1>
        <p style={{ color: '#666' }}>{article.excerpt}</p>
      </header>

      <article style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
        {(article.blocks || []).map((b: any) => {
          if (b.type === 'text') {
            return <div key={b.id} dangerouslySetInnerHTML={{ __html: b.html || b.content || '' }} style={{ marginBottom: 16 }} />;
          }
          if (b.type === 'image') {
            return <img key={b.id} src={b.url || b.src} alt={b.alt || ''} style={{ width: '100%', height: 'auto', marginBottom: 16 }} />;
          }
          if (b.type === 'code') {
            return (
              <pre key={b.id} style={{ whiteSpace: 'pre-wrap', background: '#0b0b0b', color: '#e6e6e6', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                <code>{b.code || b.content || ''}</code>
              </pre>
            );
          }
          return <div key={b.id} style={{ marginBottom: 16 }}><pre>{JSON.stringify(b)}</pre></div>;
        })}
      </article>
    </main>
  );
}
