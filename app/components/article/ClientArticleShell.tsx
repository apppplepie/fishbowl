'use client';
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import ClientArticleActions from './ClientArticleActions';
import ClientHeaderSetter from './ClientHeaderSetter';
import ArticleEditFloat from '@/app/components/float/ArticleEditFloat';
import ArticleContentClient from './ArticleContent.client';
import ClientArticleEditor, { ArticleEditorHandle } from './ClientArticleEditor';
import { useAuth } from '@/app/hooks/useAuth';
import { useCanEditArticle } from '@/app/hooks/useCanEditArticle';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useResponsive } from '@/app/hooks/useResponsive';
import { BreadcrumbBox1, TitleBox1, TagBox1 } from '@/app/components/box1';

const CommentSection = dynamic(
  () => import('@/app/components/CommentSection').catch(() => () => null),
  { ssr: false, loading: () => <div style={{ textAlign: 'center', padding: '20px' }}>加载评论中...</div> }
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
  const { canEdit } = useCanEditArticle(articleId);
  const canEditBool = canEdit ?? false;
  const { setConfig } = usePageShell();
  const { isMobile } = useResponsive();

  const [article, setArticle] = useState<any>(initialArticle);
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'preview'>('view');
  const editorRef = useRef<ArticleEditorHandle | null>(null);

  // expose for debug
  useEffect(() => {
    (window as any).__debug_article = article;
    console.log('[ClientArticleShell] article', article, 'editMode', editMode);
  }, [article, editMode]);

  // 同步外部 article 更新
  useEffect(() => {
    if (initialArticle && initialArticle !== article) {
      setArticle(initialArticle);
    }
  }, [initialArticle, article]);

  // 设置 box1 内容，根据 article 是否存在渲染完整内容或占位符
  useEffect(() => {
    if (!article) {
      // 没有文章数据时，设置占位符内容
      setConfig({
        box1Content: (
          <div style={{ opacity: 0.7 }}>
            <BreadcrumbBox1
              type="article"
              articleId={articleId}
              categoryPath={categoryPath}
            />
          </div>
        ),
        box2Style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        },
      });
    } else {
      // 有文章数据时，直接设置完整内容
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
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        },
      });
    }
  }, [article, articleId, categoryPath, setConfig, isMobile]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      setConfig({ box1Content: null });
    };
  }, [setConfig]);

  const handleArticleUpdate = (updatedArticle: any) => {
    setArticle(updatedArticle);
    setEditMode('view'); // 保存后回到预览/查看态
    onArticleUpdate?.(updatedArticle);
  };

  return (
    <>
      <ClientHeaderSetter articleId={articleId} editMode={editMode} />

      {/* 内容区：单一入口 */}
      <div
        data-content-area
        style={{ width: '100%', maxWidth: 800, margin: '0 auto', padding: '0 20px', boxSizing: 'border-box' }}>
        {editMode === 'view' ? (
          <ArticleContentClient article={article} />
        ) : (
          <ClientArticleEditor
            ref={editorRef}
            articleId={articleId}
            initialArticle={article}
            isEditing={editMode === 'edit'}
            onArticleUpdate={handleArticleUpdate}
            onEditModeChange={(m) => setEditMode(m)}
            // 传权限与用户信息
            canEdit={canEditBool}
            currentUser={user}
            isLoggedIn={isLoggedIn}
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
            articleTitle={article?.title}
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