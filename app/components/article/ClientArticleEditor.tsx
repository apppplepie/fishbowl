// app/components/article/ClientArticleEditor.tsx
'use client';
import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useRef,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { message, Modal, Input, Tag, Divider, Space } from '@/app/components/ui';
import { ExclamationCircleOutlined } from '@/app/components/ui/icons';
import BlockEditor from '@/app/components/blocks/BlockEditor';
import CategoryTreeSelect from '@/app/components/CategoryTreeSelect';
import TagInput from '@/app/components/TagInput';
import { Select } from '@/app/components/ui/compat';
// 权限信息现在从props传入，不再需要内部hooks
import { useResponsive } from '@/app/hooks/useResponsive';
import { apiPutJson, apiDeleteJson, apiGetJson } from '@/lib/apiClient';
import { generateExcerptFromBlocks } from '@/app/utils/bookUtils';
import { getNextOrderIndex } from '@/app/utils/orderIndex';
import ArticleContentClient from './ArticleContent.client';

const { Option } = Select;

type EditMeta = { title: string; type: string; category_id: string | null; tags: string[]; order_index?: number };

/** 编辑区顶部 meta（标题、类型、目录、标签），与 blocks 解耦，避免块输入时重渲染 */
const ArticleEditMetaSection = React.memo(function ArticleEditMetaSection(props: {
  meta: EditMeta;
  setMeta: React.Dispatch<React.SetStateAction<EditMeta | null>>;
  fetchCategoryPath: (categoryId: string) => void;
  isMobile: boolean;
}) {
  const { meta, setMeta, fetchCategoryPath, isMobile } = props;
  const onTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMeta((prev) => (prev ? { ...prev, title: e.target.value } : null));
  }, [setMeta]);
  const onTypeChange = useCallback((v: string) => {
    setMeta((prev) => (prev ? { ...prev, type: v } : null));
  }, [setMeta]);
  const onCategoryChange = useCallback((value: string | null) => {
    setMeta((prev) => (prev ? { ...prev, category_id: value ?? null } : null));
    if (value) {
      fetchCategoryPath(value);
      getNextOrderIndex(value).then((n) => setMeta((prev) => (prev ? { ...prev, order_index: n } : null))).catch(() => {});
    }
  }, [setMeta, fetchCategoryPath]);
  const onTagsChange = useCallback((tags: string[]) => {
    setMeta((prev) => (prev ? { ...prev, tags } : null));
  }, [setMeta]);
  return (
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
        <Input value={meta.title} onChange={onTitleChange} placeholder="请输入文章标题" size="large" style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#666' }}>文章类型</label>
        <Select value={meta.type} onChange={onTypeChange} size="large" style={{ width: 300 }}>
          <Option value="text">📝 普通文章</Option>
          <Option value="image">📷 图片内容</Option>
          <Option value="drawing">🎨 绘画作品</Option>
          <Option value="code">💻 代码片段</Option>
          <Option value="diary">📔 日志</Option>
        </Select>
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#666' }}>文章目录</label>
        <CategoryTreeSelect value={meta.category_id ?? undefined} onChange={onCategoryChange} placeholder="选择文章所属目录（可选）" />
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#666' }}>文章标签</label>
        <TagInput value={meta.tags} onChange={onTagsChange} placeholder="输入标签" maxTags={10} />
      </div>
    </div>
  );
});

export type ArticleEditorHandle = {
  save: () => Promise<void> | void;
  delete: () => Promise<void> | void;
};

interface Props {
  articleId: string;
  initialArticle: any;
  mode?: 'edit' | 'preview';
  onArticleUpdate?: (updatedArticle: any) => void;
  onEditModeChange?: (editMode: 'view' | 'edit' | 'preview') => void;
  canEdit?: boolean;
  currentUser?: any;
  isLoggedIn?: boolean;
}

const ClientArticleEditor = forwardRef<ArticleEditorHandle, Props>(function ClientArticleEditor(
  { articleId, initialArticle, mode = 'edit', onArticleUpdate, onEditModeChange, canEdit = true, currentUser, isLoggedIn = false },
  ref
) {
  const router = useRouter();
  const { isMobile } = useResponsive();

  // Keep state hooks always present (hook order stable)
  const [article, setArticle] = useState<any>(initialArticle);
  const [categoryPath, setCategoryPath] = useState<Array<{ id: string; name: string }>>([]);
  // 拆开 meta 与 editorBlocks，块输入时只更新 editorBlocks，meta 区不重渲染
  const [meta, setMeta] = useState<{ title: string; type: string; category_id: string | null; tags: string[]; order_index?: number } | null>(null);
  const [editorBlocks, setEditorBlocks] = useState<any[]>([]);
  const metaRef = useRef(meta);
  const blocksRef = useRef(editorBlocks);
  metaRef.current = meta;
  blocksRef.current = editorBlocks;

  // Sync initialArticle -> article state
  useEffect(() => {
    setArticle(initialArticle);
  }, [initialArticle]);

  // Initialize meta + editorBlocks when entering the editor. Keep this stable
  // across edit/preview switches so preview can render unsaved changes.
  useEffect(() => {
    if (!article || metaRef.current) return;

    const blocks = (article.blocks || []).map((b: any, idx: number) => {
      if (b.type === 'text') {
        return {
          id: b.id,
          type: 'text',
          order: idx,
          content: b.parsedContent?.content || b.content || '',
          access_level: b.access_level || 1,
        };
      }
      if (b.type === 'image') {
        const mid = b.media_id ?? b.mediaId ?? null;
        return {
          id: b.id,
          type: 'image',
          order: idx,
          imageUrl: b.parsedContent?.url || b.url || b.imageUrl || '',
          title: b.parsedContent?.title || b.title || '',
          description: b.parsedContent?.description || b.description || '',
          access_level: b.access_level || 1,
          media_id: mid,
          mediaId: mid ?? undefined,
          media: b.media ?? undefined,
        };
      }
      if (b.type === 'code') {
        return {
          id: b.id,
          type: 'code',
          order: idx,
          code: b.parsedContent?.code || b.code || '',
          language: b.parsedContent?.language || b.language || 'javascript',
          title: b.parsedContent?.title || b.title || '',
          access_level: b.access_level || 1,
        };
      }
      return { ...b, access_level: b.access_level || 1 };
    }).filter(Boolean);

    setMeta({
      title: article.title || '',
      type: article.type || 'text',
      category_id: article.category_id ?? null,
      tags: article.tags || [],
      order_index: article.order_index,
    });
    setEditorBlocks(blocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id]);

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

  // Save：从 ref 取最新 meta + editorBlocks，避免闭包陈旧
  const doSave = useCallback(async () => {
    const m = metaRef.current;
    const blks = blocksRef.current;
    if (!m) return;
    if (!m.title?.trim()) {
      message.warning('请输入文章标题');
      return;
    }

    if ((m.type === 'drawing' || m.type === 'image') && !(blks || []).some((b: any) => b.type === 'image')) {
      message.warning('图片/绘画类型必须包含至少一张图片');
      return;
    }
    if (m.type === 'code' && !(blks || []).some((b: any) => b.type === 'code')) {
      message.warning('代码类型必须包含至少一个代码块');
      return;
    }

    try {
      message.loading({ content: '正在保存...', key: 'save' });
      const updatedExcerpt = generateExcerptFromBlocks(blks || []);

      let visibleAccessLevel: number;
      let fullAccessLevel: number;
      if ((blks || []).length > 0) {
        const accessLevels = (blks || []).map((block: any) => block.access_level || 1);
        visibleAccessLevel = Math.min(...accessLevels);
        fullAccessLevel = Math.max(...accessLevels);
      } else {
        visibleAccessLevel = article?.visible_access_level ?? article?.max_access_level ?? 1;
        fullAccessLevel = article?.full_access_level ?? article?.max_access_level ?? 1;
      }

      const blocksForSave = (blks || []).map((block: any) => {
        if (block.type === 'image') {
          const mid = block.media_id ?? block.mediaId ?? null;
          return { ...block, media_id: mid, mediaId: mid ?? undefined };
        }
        return block;
      });

      const payload: any = {
        title: m.title,
        type: m.type || 'text',
        category_id: m.category_id || null,
        tags: m.tags || [],
        blocks: blocksForSave,
        excerpt: updatedExcerpt,
        visible_access_level: visibleAccessLevel,
        full_access_level: fullAccessLevel,
      };

      const oldCat = String(article?.category_id ?? '');
      const newCat = String(m.category_id ?? '');
      if (newCat !== oldCat) {
        let candidate: number | undefined = m.order_index as number | undefined;
        if (candidate == null || Number.isNaN(Number(candidate))) candidate = undefined;
        if (candidate === undefined) {
          try { candidate = await getNextOrderIndex(m.category_id!); } catch (e) { candidate = 1; }
        }
        if (candidate !== undefined && candidate !== null && !Number.isNaN(Number(candidate))) payload.order_index = Number(candidate);
      }

      await apiPutJson(`/api/articles/${articleId}`, payload);
      message.success({ content: '保存成功！', key: 'save' });

      const refreshed = await apiGetJson<{ success: boolean; article?: any; error?: string }>(
        `/api/articles/${articleId}`
      );
      if (!refreshed.success || !refreshed.article) {
        throw new Error(refreshed.error || 'Saved, but failed to refresh the article');
      }

      const updatedArticle = refreshed.article;
      setArticle(updatedArticle);
      onArticleUpdate?.(updatedArticle);
      router.refresh();
      onEditModeChange?.('view');
    } catch (err: any) {
      console.error('保存失败', err);
      message.error({ content: '保存失败: ' + (err?.message || '未知错误'), key: 'save' });
    }
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

  const handleBlocksChange = useCallback((arg: any[] | ((prev: any[]) => any[])) => {
    setEditorBlocks(arg as any);
  }, []);

  const previewArticle = useMemo(() => {
    if (!meta) return null;

    const previewBlocks = (editorBlocks || []).map((block: any, index: number) => {
      if (block.type === 'text') {
        return {
          ...block,
          order: index,
          parsedContent: { content: block.content || '' },
        };
      }

      if (block.type === 'image') {
        return {
          ...block,
          order: index,
          parsedContent: {
            url: block.imageUrl || block.url || '',
            title: block.title || '',
            description: block.description || '',
          },
        };
      }

      if (block.type === 'code') {
        return {
          ...block,
          order: index,
          parsedContent: {
            code: block.code || '',
            language: block.language || 'javascript',
            title: block.title || '',
          },
        };
      }

      return { ...block, order: index };
    });

    return {
      ...article,
      title: meta.title,
      type: meta.type || 'text',
      category_id: meta.category_id,
      tags: meta.tags || [],
      blocks: previewBlocks,
    };
  }, [article, editorBlocks, meta]);

  // Permission guard / early return for UI only (hooks above always run)
  if (!isLoggedIn || !canEdit || !currentUser) {
    return null;
  }

  if (!meta) {
    return null;
  }

  if (mode === 'preview') {
    return previewArticle ? <ArticleContentClient article={previewArticle} /> : null;
  }

  return (
    <>
      <ArticleEditMetaSection meta={meta} setMeta={setMeta} fetchCategoryPath={fetchCategoryPath} isMobile={isMobile} />
      <div style={{ background: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Tag color="default">{editorBlocks.length} 个块</Tag>
            <Tag color="blue">{editorBlocks.filter((b: any) => b.type === 'text').length} 文字</Tag>
            <Tag color="green">{editorBlocks.filter((b: any) => b.type === 'image').length} 图片</Tag>
            <Tag color="purple">{editorBlocks.filter((b: any) => b.type === 'code').length} 代码</Tag>
          </Space>
        </div>
        <Divider />
        <BlockEditor blocks={editorBlocks} onChange={handleBlocksChange} showAddButton={false} />
      </div>
    </>
  );
});

ClientArticleEditor.displayName = 'ClientArticleEditor';
export default ClientArticleEditor;
