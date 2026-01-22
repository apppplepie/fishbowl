'use client';
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import ClientArticleActions from './ClientArticleActions';
import ClientHeaderSetter from './ClientHeaderSetter';
import ArticleEditFloat from '@/app/components/float/ArticleEditFloat';
import ArticleStaticView from './ArticleStaticView';
import ClientArticleEditor from './ClientArticleEditor';
import type { ArticleEditorHandle } from './ClientArticleEditor';
import { useAuth } from '@/app/hooks/useAuth';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useResponsive } from '@/app/hooks/useResponsive';
import { BreadcrumbBox1, TitleBox1, TagBox1 } from '@/app/components/box1';

const CommentSection = dynamic(
  () => import('@/app/components/CommentSection').catch(() => () => null),
  { ssr: false }
);

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
  onArticleUpdate,
}: ClientArticleShellProps) {
  const { isLoggedIn, user } = useAuth();
  const { setConfig } = usePageShell();
  const { isMobile } = useResponsive();
  const [article, setArticle] = useState<any>(initialArticle);
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'preview'>('view');
  const editorRef = useRef<ArticleEditorHandle>(null);

  // 同步外部 article 更新
  useEffect(() => {
    if (initialArticle) setArticle(initialArticle);
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
  }, [article, articleId, categoryPath, setConfig, isMobile]);

  const handleArticleUpdate = (updatedArticle: any) => {
    setArticle(updatedArticle);
    setEditMode('view'); // 保存后回到预览/查看态
    onArticleUpdate?.(updatedArticle);
  };

  return (
    <>
      <ClientHeaderSetter articleId={articleId} editMode={editMode} />

      {/* 文章正文区域：根据 editMode 状态条件渲染 */}
      <div style={{ width: '100%', maxWidth: 800, margin: '0 auto', padding: '0 20px' }}>
        {editMode === 'view' ? (
          // 查看模式：显示静态内容
          <ArticleStaticView article={article} />
        ) : (
          // 编辑模式：显示编辑器
          <ClientArticleEditor
            ref={editorRef}
            articleId={articleId}
            initialArticle={article}
            isEditing={editMode === 'edit'}
            onArticleUpdate={handleArticleUpdate}
            onEditModeChange={setEditMode}
          />
        )}
      </div>

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

      {/* 浮动遥控器：只负责切换 editMode 与触发保存等 */}
      <ArticleEditFloat
        mode={editMode}
        onEdit={() => setEditMode('edit')}
        onPreview={() => setEditMode('preview')}
        onSave={() => editorRef.current?.save()}
        onCancel={() => setEditMode('view')}
        onDelete={() => editorRef.current?.delete()}
        categoryId={article?.category_id}
        articleAuthor={article?.author}
        currentUser={user?.username}
        userRole={user?.role}
      />

    </>
  );
}