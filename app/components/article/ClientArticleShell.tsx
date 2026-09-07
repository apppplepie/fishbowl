'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import ClientArticleActions from './ClientArticleActions';
import ClientHeaderSetter from './ClientHeaderSetter';
import ArticleEditFloat from '@/app/components/float/ArticleEditFloat';
import ArticleContentClient from './ArticleContent.client';
import ClientArticleEditor, { ArticleEditorHandle } from './ClientArticleEditor';
import { useAuth } from '@/app/hooks/useAuth';
import { useCanEditArticle } from '@/app/hooks/useCanEditArticle';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useResponsive } from '@/app/hooks/useResponsive';
import { BreadcrumbBox1, TitleBox1 } from '@/app/components/box1';
import { message } from '@/app/components/ui';
import { apiGet, apiDeleteJson } from '@/lib/apiClient';
import { getContentAreaWrapperStyle, getContentCardStyle } from '@/app/styles/contentArea';

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
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const { canEdit } = useCanEditArticle(articleId);
  const canEditBool = canEdit ?? false;
  const { setConfig } = usePageShell();
  const { isMobile } = useResponsive();

  const [article, setArticle] = useState<any>(initialArticle);
  const [categoryPathState, setCategoryPathState] = useState(categoryPath);
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);
  const [loading, setLoading] = useState(!initialArticle);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'preview'>('view');
  const editorRef = useRef<ArticleEditorHandle | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    (window as any).__debug_article = article;
    console.log('[ClientArticleShell] article', article, 'editMode', editMode);
  }, [article, editMode]);

  // 同步外部 article 更新
  useEffect(() => {
    if (initialArticle) {
      setArticle(initialArticle);
      setLikes(initialArticle.likes || initialLikes || 0);
      setComments(initialArticle.comments || initialComments || 0);
    }
  }, [initialArticle, initialLikes, initialComments]);

  // 客户端加载文章内容（避免进入页面前阻塞）
  useEffect(() => {
    if (!articleId) return;
    if (article && article.id === articleId) return;

    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);

    apiGet(`/api/articles/${articleId}`, { signal: controller.signal })
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok || !result?.success || !result?.article) {
          throw new Error(result?.error || '文章不存在');
        }

        const fetchedArticle = result.article;
        setArticle(fetchedArticle);
        setLikes(fetchedArticle.likes || 0);
        setComments(fetchedArticle.comments || 0);

        if (fetchedArticle.category_id) {
          return apiGet(`/api/categories/${fetchedArticle.category_id}/path`, {
            signal: controller.signal,
          });
        }
        return null;
      })
      .then(async (pathRes) => {
        if (!pathRes) {
          setCategoryPathState([]);
          return;
        }
        const pathResult = await pathRes.json();
        if (pathRes.ok && pathResult?.success && pathResult?.path) {
          setCategoryPathState(pathResult.path);
        } else {
          setCategoryPathState([]);
        }
      })
      .catch((error: any) => {
        if (error?.name === 'AbortError') return;
        console.error('加载文章失败:', error);
        setLoadError(error?.message || '加载文章失败');
        setArticle(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [articleId, article]);

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
              categoryPath={categoryPathState}
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
          <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
            <BreadcrumbBox1
              type="article"
              articleId={articleId}
              categoryPath={categoryPathState}
            />
            <TitleBox1 title={article.title} author={article.author} />
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
  }, [article, articleId, categoryPathState, setConfig, isMobile]);

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

  // 删除文章：在 Shell 里直接调 API，不依赖 editorRef（view 模式下编辑器未挂载，ref 为 null）
  const handleDelete = useCallback(() => {
    apiDeleteJson(`/api/articles/${articleId}`)
      .then(() => {
        message.success('文章已删除');
        router.push('/library?view=doc');
      })
      .catch((e: any) => {
        message.error('删除失败: ' + (e?.message || '未知错误'));
      });
  }, [articleId]);

  return (
    <>
      <ClientHeaderSetter articleId={articleId} editMode={editMode} />

      {/* ========== 文章页主题内容区（article [id]）==========
          样式来自 @/app/styles/contentArea，修改该文件即可统一文章/书籍/发布页。 */}
      <div
        data-content-area
        style={getContentAreaWrapperStyle()}>
        {editMode === 'view' ? (
          article ? (
            <ArticleContentClient article={article} />
          ) : (
            <div
              style={{
                ...getContentCardStyle(isMobile),
                color: '#666',
              }}
            >
              {loadError ? `加载失败：${loadError}` : (loading ? '加载文章中...' : '暂无文章内容')}
            </div>
          )
        ) : (
          <ClientArticleEditor
            ref={editorRef}
            articleId={articleId}
            initialArticle={article}
            mode={editMode === 'preview' ? 'preview' : 'edit'}
            onArticleUpdate={handleArticleUpdate}
            onEditModeChange={(m) => setEditMode(m)}
            // 传权限与用户信息
            canEdit={canEditBool}
            currentUser={user}
            isLoggedIn={isLoggedIn}
          />
        )}
      </div>

      {/* 文章页：互动区+评论区容器（编辑模式下不显示） */}
      {editMode === 'view' && (
        <div
          style={getContentAreaWrapperStyle({ minWidth: 0 })}
          data-export-hide
        >
          <div
            style={{
              ...getContentCardStyle(isMobile),
              background: 'white',
              marginBottom: 0,
            }}
            data-export-hide
          >
            <ClientArticleActions
              articleId={articleId}
              initialLikes={likes}
              initialComments={comments}
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
      )}

      {/* 浮动遥控器：只负责切换 editMode 与触发保存等 */}
      <ArticleEditFloat
        mode={editMode}
        onEdit={() => {
          if (canEditBool) setEditMode('edit');
        }}
        onPreview={() => setEditMode('preview')}
        onSave={() => editorRef.current?.save()}
        onCancel={() => setEditMode('view')}
        onBackToEdit={() => setEditMode('edit')}
        onDelete={handleDelete}
        canEditCurrentArticle={canEditBool}
        categoryId={article?.category_id}
        articleAuthor={article?.author}
        currentUser={user?.username}
        userRole={user?.role}
      />

    </>
  );
}
