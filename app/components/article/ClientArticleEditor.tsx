// app/components/article/ClientArticleEditor.tsx
'use client';
import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { message, Modal, Input } from '@/app/components/ui';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import BlockEditor from '@/app/components/blocks/BlockEditor';
import CategoryTreeSelect from '@/app/components/CategoryTreeSelect';
import TagInput from '@/app/components/TagInput';
import { Select, Tag, Divider, Space } from 'antd';
import { useAuth } from '@/app/hooks/useAuth';
import { useCanEditArticle } from '@/app/hooks/useCanEditArticle';
import { useResponsive } from '@/app/hooks/useResponsive';
import { apiPutJson, apiDeleteJson } from '@/lib/apiClient';
import { generateExcerptFromBlocks } from '@/app/utils/bookUtils';
import { getNextOrderIndex } from '@/app/utils/orderIndex';

const { Option } = Select;

export type ArticleEditorHandle = {
  save: () => Promise<void> | void;
  delete: () => Promise<void> | void;
};

interface Props {
  articleId: string;
  initialArticle: any;
  isEditing?: boolean;
  onArticleUpdate?: (updatedArticle: any) => void;
  onEditModeChange?: (editMode: 'view' | 'edit' | 'preview') => void;
}

const ClientArticleEditor = forwardRef<ArticleEditorHandle, Props>(function ClientArticleEditor(
  { articleId, initialArticle, isEditing = false, onArticleUpdate, onEditModeChange },
  ref
) {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const { isLoggedIn, user } = useAuth();
  const { canEdit: canEditArticle } = useCanEditArticle(articleId);

  // Keep state hooks always present (hook order stable)
  const [article, setArticle] = useState<any>(initialArticle);
  const [editedArticle, setEditedArticle] = useState<any>(null);
  const [categoryPath, setCategoryPath] = useState<Array<{ id: string; name: string }>>([]);

  // A ref to avoid stale closures if needed
  const editedRef = useRef<any>(null);
  useEffect(() => { editedRef.current = editedArticle; }, [editedArticle]);

  // Sync initialArticle -> article state
  useEffect(() => {
    setArticle(initialArticle);
  }, [initialArticle]);

  // Initialize/cleanup editedArticle when isEditing toggles
  useEffect(() => {
    if (isEditing && article) {
      const editorBlocks = (article.blocks || []).map((b: any, idx: number) => {
        if (b.type === 'text') return { id: b.id, type: 'text', order: idx, content: b.parsedContent?.content || b.content || '' };
        if (b.type === 'image') return { id: b.id, type: 'image', order: idx, imageUrl: b.parsedContent?.url || b.url || '', title: b.title || '' };
        if (b.type === 'code') return { id: b.id, type: 'code', order: idx, code: b.parsedContent?.code || b.code || '' };
        return b;
      }).filter(Boolean);

      setEditedArticle({ ...article, editorBlocks });
      onEditModeChange?.('edit');
    } else {
      setEditedArticle(null);
      if (!isEditing) onEditModeChange?.('view');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, article]);

  // fetch category path function (kept stable)
  const fetchCategoryPath = useCallback(async (categoryId: string) => {
    try {
      const res = await fetch(`/api/categories/${categoryId}/path`, { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.path) setCategoryPath(json.path);
    } catch (e) {
      console.error('fetchCategoryPath failed', e);
    }
  }, []);

  // Save (useCallback so ref/setImperativeHandle stable)
  const doSave = useCallback(async () => {
    const current = editedRef.current ?? editedArticle;
    if (!current) return;
    if (!current.title?.trim()) {
      message.warning('请输入文章标题');
      return;
    }

    // validations (same rules as original)
    if ((current.type === 'drawing' || current.type === 'image') && !(current.editorBlocks || []).some((b: any) => b.type === 'image')) {
      message.warning('图片/绘画类型必须包含至少一张图片');
      return;
    }
    if (current.type === 'code' && !(current.editorBlocks || []).some((b: any) => b.type === 'code')) {
      message.warning('代码类型必须包含至少一个代码块');
      return;
    }

    try {
      message.loading({ content: '正在保存...', key: 'save' });
      const updatedExcerpt = generateExcerptFromBlocks(current.editorBlocks || []);
      const payload: any = {
        title: current.title,
        type: current.type || 'text',
        category_id: current.category_id || null,
        tags: current.tags || [],
        blocks: current.editorBlocks || [],
        excerpt: updatedExcerpt,
      };

      // category order logic preserved
      const oldCat = String(article?.category_id ?? '');
      const newCat = String(current.category_id ?? '');
      const categoryChanged = newCat !== oldCat;
      if (categoryChanged) {
        let candidate = current.order_index;
        if (candidate === '' || candidate === null) candidate = undefined;
        if (candidate === undefined) {
          try { candidate = await getNextOrderIndex(current.category_id); } catch (e) { candidate = 1; }
        }
        if (candidate !== undefined && candidate !== null && !Number.isNaN(Number(candidate))) payload.order_index = Number(candidate);
      }

      const res = await apiPutJson(`/api/articles/${articleId}`, payload);
      message.success({ content: '保存成功！', key: 'save' });

      // update local + notify parent
      const updatedArticle = res || { ...article, ...payload, blocks: payload.blocks };
      setArticle(updatedArticle);
      onArticleUpdate?.(updatedArticle);
      // Refresh route to update server-rendered content
      router.refresh();
      onEditModeChange?.('view');
    } catch (err: any) {
      console.error('保存失败', err);
      message.error({ content: '保存失败: ' + (err?.message || '未知错误'), key: 'save' });
    }
  // include dependencies used inside
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, article, onArticleUpdate, onEditModeChange]);

  // Delete (useCallback)
  const doDelete = useCallback(async () => {
    Modal.confirm({
      title: '确认删除文章？',
      icon: <ExclamationCircleOutlined />,
      content: '删除后无法恢复，确定要删除这篇文章吗？',
      okText: '确定删除',
      cancelText: '取消',
      okType: 'danger',
      async onOk() {
        try {
          await apiDeleteJson(`/api/articles/${articleId}`);
          message.success('文章已删除');
          // navigate away
          router.push('/archive');
        } catch (e: any) {
          console.error(e);
          message.error('删除失败: ' + (e.message || '未知错误'));
        }
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  // Always expose imperative handle (ensures Hooks order stable)
  useImperativeHandle(ref, () => ({
    save: doSave,
    delete: doDelete,
  }), [doSave, doDelete]);

  // Permission guard / early return for UI only (hooks above always run)
  if (!isLoggedIn || !canEditArticle || !user) {
    return null;
  }

  // If not editing, don't render editor UI (but hooks are still wired)
  if (!isEditing) {
    return null;
  }

  // --- Render edit UI (same as before, using editedArticle state) ---
  return (
    <>
      {/* Top meta editing */}
      <div style={{
        background: 'white',
        padding: isMobile ? '16px 12px' : '40px',
        borderRadius: '8px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        maxWidth: 800,
        margin: '0 auto 24px',
      }}>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#666' }}>文章标题</label>
          <Input value={editedArticle?.title || ''} onChange={(e) => setEditedArticle({ ...editedArticle, title: e.target.value })} placeholder="请输入文章标题" size="large" style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#666' }}>文章类型</label>
          <Select value={editedArticle?.type || 'text'} onChange={(v) => setEditedArticle({ ...editedArticle, type: v })} size="large" style={{ width: 300 }}>
            <Option value="text">📝 普通文章</Option>
            <Option value="image">📷 图片内容</Option>
            <Option value="drawing">🎨 绘画作品</Option>
            <Option value="code">💻 代码片段</Option>
            <Option value="diary">📔 日志</Option>
          </Select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#666' }}>文章目录</label>
          <CategoryTreeSelect value={editedArticle?.category_id} onChange={async (value) => {
            if (editedArticle) {
              let newOrderIndex = editedArticle.order_index;
              if (value && value !== editedArticle.category_id) {
                try { newOrderIndex = await getNextOrderIndex(value); } catch (e) { newOrderIndex = editedArticle.order_index; }
              }
              setEditedArticle({ ...editedArticle, category_id: value, order_index: newOrderIndex });
              if (value) fetchCategoryPath(value); else setCategoryPath([]);
            }
          }} placeholder="选择文章所属目录（可选）" />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#666' }}>文章标签</label>
          <TagInput value={editedArticle?.tags || []} onChange={(tags) => setEditedArticle({ ...editedArticle, tags })} placeholder="输入标签" maxTags={10} />
        </div>
      </div>

      {/* 编辑块区域 */}
      <div style={{ background: 'rgba(255,255,255,0.95)', padding: 40, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {editedArticle?.editorBlocks && (
              <>
                <Tag>{editedArticle.editorBlocks.length} 个块</Tag>
                <Tag>{editedArticle.editorBlocks.filter((b: any)=> b.type === 'text').length} 文字</Tag>
                <Tag>{editedArticle.editorBlocks.filter((b: any)=> b.type === 'image').length} 图片</Tag>
                <Tag>{editedArticle.editorBlocks.filter((b: any)=> b.type === 'code').length} 代码</Tag>
              </>
            )}
          </Space>
        </div>
        <Divider />
        <BlockEditor blocks={editedArticle?.editorBlocks || []} onChange={(blocks) => setEditedArticle({ ...editedArticle, editorBlocks: blocks })} showAddButton={false} />
      </div>
    </>
  );
});

ClientArticleEditor.displayName = 'ClientArticleEditor';
export default ClientArticleEditor;
