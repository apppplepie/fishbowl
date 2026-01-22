'use client';
// Client shell hydrates only interactive parts: header sync, actions (like/share/export),
// editor, and comments. Keep this file light.
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ClientArticleActions from './ClientArticleActions';
import ClientHeaderSetter from './ClientHeaderSetter';
import ClientArticleEditor from './ClientArticleEditor';
import { useAuth } from '@/app/hooks/useAuth';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useResponsive } from '@/app/hooks/useResponsive';
import { BreadcrumbBox1, TitleBox1, TagBox1 } from '@/app/components/box1';

// Lazy load heavy interactive parts (comments)
const CommentSection = dynamic(() => import('@/app/components/CommentSection').catch(() => () => null), { 
  ssr: false,
  loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>加载评论区...</div>
});

interface ClientArticleShellProps {
  articleId: string;
  initialArticle: any;
  initialLikes: number;
  initialComments: number;
  categoryPath: Array<{ id: string; name: string }>;
  onArticleUpdate?: (updatedArticle: any) => void;
}

export default function ClientArticleShell({ 
  articleId, 
  initialArticle,
  initialLikes, 
  initialComments,
  categoryPath,
  onArticleUpdate
}: ClientArticleShellProps) {
  const { isLoggedIn, user } = useAuth();
  const { setConfig } = usePageShell();
  const { isMobile } = useResponsive();
  const [article, setArticle] = React.useState(initialArticle);
  const [editMode, setEditMode] = React.useState<'view' | 'edit' | 'preview'>('view');

  // 同步外部 article 更新
  React.useEffect(() => {
    if (initialArticle) {
      setArticle(initialArticle);
    }
  }, [initialArticle]);

  // 设置 box1Content：面包屑 + 标题 + 标签
  useEffect(() => {
    if (!article) return;

    setConfig({
      box1Content: (
        <div>
          <BreadcrumbBox1
            type="article"
            articleId={articleId}
            categoryPath={categoryPath}
          />
          <TitleBox1
            title={article.title}
          />
          {article.tags && article.tags.length > 0 && (
            <div style={{ padding: '0 24px 16px' }}>
              <TagBox1 tags={article.tags} editMode={false} maxTags={10} />
            </div>
          )}
        </div>
      ),
      box2Style: {
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
      },
    });

    return () => {
      setConfig({ box1Content: null });
    };
  }, [article, articleId, categoryPath, setConfig]);

  const handleArticleUpdate = (updatedArticle: any) => {
    setArticle(updatedArticle);
    if (onArticleUpdate) {
      onArticleUpdate(updatedArticle);
    }
  };

  return (
    <>
      <ClientHeaderSetter articleId={articleId} editMode={editMode} />
      
      {/* 互动按钮区域 */}
      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          minWidth: isMobile ? 'auto' : '600px',
          margin: '0 auto',
          padding: isMobile ? '20px' : '40px',
          boxSizing: 'border-box',
        }}
        data-export-hide
      >
        <div
          style={{
            background: 'white',
            padding: isMobile ? '20px' : '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
          data-export-hide
        >
        <ClientArticleActions 
          articleId={articleId} 
          initialLikes={initialLikes}
          initialComments={initialComments}
        />

        {/* 评论区 - 延迟加载 */}
        <CommentSection 
          articleId={articleId}
          currentUser={user ? { 
            username: user.username, 
            avatar: user.avatar_base64 as string, 
            role: user.role 
          } : null}
          isLoggedIn={isLoggedIn}
        />
        </div>
      </div>

      {/* 编辑器组件（处理编辑模式） */}
      <ClientArticleEditor
        articleId={articleId}
        initialArticle={article}
        onArticleUpdate={handleArticleUpdate}
        onEditModeChange={(mode) => setEditMode(mode)}
      />
    </>
  );
}
