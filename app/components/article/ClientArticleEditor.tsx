'use client';

/**
 * ClientArticleEditor - Handles all edit-mode logic for articles
 * This component manages edit state, save/delete operations, and renders edit UI
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { message, Modal, Input } from '@/app/components/ui';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import ArticleEditFloat from '@/app/components/float/ArticleEditFloat';
import BlockEditor from '@/app/components/blocks/BlockEditor';
import TextBlock from '@/app/components/blocks/TextBlock';
import ImageBlock from '@/app/components/blocks/ImageBlock';
import CodeBlock from '@/app/components/blocks/CodeBlock';
import PlaceholderBlock from '@/app/components/blocks/PlaceholderBlock';
import { apiPutJson, apiDeleteJson } from '@/lib/apiClient';
import { generateExcerptFromBlocks } from '@/app/utils/bookUtils';
import { getNextOrderIndex } from '@/app/utils/orderIndex';
import CategoryTreeSelect from '@/app/components/CategoryTreeSelect';
import TagInput from '@/app/components/TagInput';
import { TagBox1 } from '@/app/components/box1';
import { Select, Tag, Divider, Space } from 'antd';
import { useAuth } from '@/app/hooks/useAuth';
import { useCanEditArticle } from '@/app/hooks/useCanEditArticle';
import { useResponsive } from '@/app/hooks/useResponsive';
import type { EditMode } from '@/app/components/float/ArticleEditFloat';

const { Option } = Select;

interface ClientArticleEditorProps {
  articleId: string;
  initialArticle: any;
  onArticleUpdate?: (updatedArticle: any) => void;
  onEditModeChange?: (editMode: 'view' | 'edit' | 'preview') => void;
}

export default function ClientArticleEditor({ 
  articleId, 
  initialArticle,
  onArticleUpdate,
  onEditModeChange
}: ClientArticleEditorProps) {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const { isLoggedIn, user } = useAuth();
  const { canEdit: canEditArticle } = useCanEditArticle(articleId);

  const [article, setArticle] = useState(initialArticle);
  const [editMode, setEditMode] = useState<EditMode>('view');
  const [editedArticle, setEditedArticle] = useState<any>(null);
  const [categoryPath, setCategoryPath] = useState<Array<{ id: string; name: string }>>([]);

  // 同步外部 article 更新
  useEffect(() => {
    if (initialArticle) {
      setArticle(initialArticle);
    }
  }, [initialArticle]);

  // 获取分类路径
  const fetchCategoryPath = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}/path`, { 
        credentials: 'include' 
      });
      const result = await response.json();
      if (result.success && result.path) {
        setCategoryPath(result.path);
      }
    } catch (error) {
      console.error('获取分类路径失败:', error);
    }
  };

  // 进入编辑模式
  const handleEdit = () => {
    if (!article) return;
    
    const editorBlocks = article.blocks
      .map((b: any, index: number) => {
        if (b.type === 'text') {
          return {
            id: b.id,
            type: 'text',
            order: index,
            content: b.parsedContent?.content || b.content || '',
            access_level: b.access_level || 1,
          };
        } else if (b.type === 'image') {
          return {
            id: b.id,
            type: 'image',
            order: index,
            imageUrl: b.parsedContent?.url || b.url || '',
            title: b.parsedContent?.title || b.title || '',
            description: b.parsedContent?.description || b.description || '',
            access_level: b.access_level || 1,
          };
        } else if (b.type === 'code') {
          return {
            id: b.id,
            type: 'code',
            order: index,
            language: b.parsedContent?.language || 'javascript',
            code: b.parsedContent?.code || b.code || '',
            title: b.parsedContent?.title || b.title || '',
            access_level: b.access_level || 1,
          };
        } else if (b.type === 'placeholder') {
          return null;
        }
        return b;
      })
      .filter((block: any) => block !== null);

    setEditedArticle({
      ...article,
      editorBlocks,
    });
    setEditMode('edit');
    if (onEditModeChange) onEditModeChange('edit');
    message.info('进入编辑模式');
  };

  // 进入预览模式
  const handlePreview = () => {
    if (!editedArticle?.title?.trim()) {
      message.warning('请输入文章标题');
      return;
    }
    setEditMode('preview');
    if (onEditModeChange) onEditModeChange('preview');
    message.info('预览模式 - 请确认后保存');
  };

  // 保存文章
  const handleSave = async () => {
    if (!editedArticle) return;

    try {
      if (!editedArticle.title?.trim()) {
        message.warning('请输入文章标题');
        return;
      }

      // 验证类型要求
      if (editedArticle.type === 'drawing' || editedArticle.type === 'image') {
        const hasImage = editedArticle.editorBlocks?.some((block: any) => block.type === 'image');
        if (!hasImage) {
          message.warning(`🎨 ${editedArticle.type === 'drawing' ? '绘画' : '图片'}类型必须包含至少一张图片！`);
          return;
        }
      }

      if (editedArticle.type === 'code') {
        const hasCode = editedArticle.editorBlocks?.some((block: any) => block.type === 'code');
        if (!hasCode) {
          message.warning('💻 代码类型必须包含至少一个代码块！');
          return;
        }
      }

      message.loading({ content: '正在保存...', key: 'save' });

      const updatedExcerpt = generateExcerptFromBlocks(editedArticle.editorBlocks || []);

      const saveData: any = {
        title: editedArticle.title,
        type: editedArticle.type || 'text',
        category_id: editedArticle.category_id || null,
        tags: editedArticle.tags || [],
        blocks: editedArticle.editorBlocks || [],
        excerpt: updatedExcerpt,
      };

      const oldCat = String(article?.category_id ?? '');
      const newCat = String(editedArticle.category_id ?? '');
      const categoryChanged = newCat !== oldCat;

      if (categoryChanged) {
        let candidate = editedArticle.order_index;
        if (candidate === '' || candidate === null) candidate = undefined;

        if (candidate === undefined) {
          try {
            candidate = await getNextOrderIndex(editedArticle.category_id);
          } catch (e) {
            console.warn('getNextOrderIndex failed, using default order', e);
            candidate = 1;
          }
        }

        if (candidate !== undefined && candidate !== null && !Number.isNaN(Number(candidate))) {
          saveData.order_index = Number(candidate);
        }
      }

      await apiPutJson(`/api/articles/${articleId}`, saveData);
      message.success({ content: '保存成功！', key: 'save' });

      // 刷新页面以获取最新数据
      router.refresh();
      setEditMode('view');
      if (onEditModeChange) onEditModeChange('view');
    } catch (error: any) {
      console.error('保存失败:', error);
      message.error({ content: '保存失败: ' + (error.message || '未知错误'), key: 'save' });
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setEditMode('view');
    if (onEditModeChange) onEditModeChange('view');
    setEditedArticle(null);
    message.info('已取消编辑');
  };

  // 返回编辑
  const handleBackToEdit = () => {
    setEditMode('edit');
    if (onEditModeChange) onEditModeChange('edit');
  };

  // 删除文章
  const handleDelete = () => {
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
          router.push('/archive');
        } catch (error: any) {
          console.error('删除失败:', error);
          message.error('删除失败: ' + (error.message || '未知错误'));
        }
      },
    });
  };

  // 调整分类（暂时留空，后续实现）
  const handleAdjustCategory = () => {
    message.info('调整分类功能开发中');
  };

  // 如果没有权限或未登录，不显示编辑相关 UI
  if (!isLoggedIn || !canEditArticle || !user) {
    return null;
  }

  return (
    <>
      {/* 编辑悬浮按钮 */}
      <ArticleEditFloat
        mode={editMode}
        onEdit={handleEdit}
        onPreview={handlePreview}
        onSave={handleSave}
        onCancel={editMode === 'preview' ? handleBackToEdit : handleCancel}
        onDelete={handleDelete}
        onAdjustCategory={handleAdjustCategory}
        categoryId={article?.category_id}
        articleAuthor={article?.author}
        currentUser={user.username}
        userRole={user.role}
      />

      {/* 编辑模式下的编辑控件 */}
      {editMode === 'edit' && editedArticle && (
        <div style={{
          background: 'white',
          padding: isMobile ? '16px 12px' : '40px',
          borderRadius: '8px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          maxWidth: 800,
          margin: '0 auto 24px',
        }}>
          {/* 文章标题编辑 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#666',
            }}>
              文章标题
            </label>
            <Input
              value={editedArticle?.title || ''}
              onChange={(e) => editedArticle && setEditedArticle({ ...editedArticle, title: e.target.value })}
              placeholder="请输入文章标题"
              size="large"
              style={{ width: '100%' }}
            />
          </div>

          {/* 文章类型选择 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#666',
            }}>
              文章类型
            </label>
            <Select
              value={editedArticle?.type || 'text'}
              onChange={(value) => editedArticle && setEditedArticle({ ...editedArticle, type: value })}
              size="large"
              style={{ width: '300px' }}
            >
              <Option value="text">📝 普通文章</Option>
              <Option value="image">📷 图片内容</Option>
              <Option value="drawing">🎨 绘画作品</Option>
              <Option value="code">💻 代码片段</Option>
              <Option value="diary">📔 日志</Option>
            </Select>
          </div>

          {/* 文章目录选择 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#666',
            }}>
              文章目录
            </label>
            <CategoryTreeSelect
              value={editedArticle?.category_id}
              onChange={async (value) => {
                if (editedArticle) {
                  let newOrderIndex = editedArticle.order_index;
                  if (value && value !== editedArticle.category_id) {
                    try {
                      newOrderIndex = await getNextOrderIndex(value);
                    } catch (error) {
                      console.warn('计算新顺序失败:', error);
                      newOrderIndex = editedArticle.order_index;
                    }
                  }
                  setEditedArticle({ ...editedArticle, category_id: value, order_index: newOrderIndex });
                  if (value) {
                    fetchCategoryPath(value);
                  } else {
                    setCategoryPath([]);
                  }
                }
              }}
              placeholder="选择文章所属目录（可选）"
            />
          </div>

          {/* 文章标签 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#666',
            }}>
              文章标签
            </label>
            <TagInput
              value={editedArticle?.tags || []}
              onChange={(tags) => {
                if (editedArticle) {
                  setEditedArticle({ ...editedArticle, tags });
                }
              }}
              placeholder="输入标签，按空格或回车添加"
              maxTags={10}
            />
          </div>
        </div>
      )}

      {/* 编辑模式下的块编辑器 */}
      {editMode === 'edit' && editedArticle && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: '40px',
          borderRadius: '12px',
          marginBottom: '40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              {editedArticle?.editorBlocks && (
                <>
                  <Tag>{editedArticle.editorBlocks.length} 个块</Tag>
                  <Tag>{editedArticle.editorBlocks.filter((b: any) => b.type === 'text').length} 文字</Tag>
                  <Tag>{editedArticle.editorBlocks.filter((b: any) => b.type === 'image').length} 图片</Tag>
                  <Tag>{editedArticle.editorBlocks.filter((b: any) => b.type === 'code').length} 代码</Tag>
                </>
              )}
            </Space>
          </div>
          <Divider />
          <BlockEditor
            blocks={editedArticle?.editorBlocks || []}
            onChange={(blocks) => setEditedArticle({ ...editedArticle, editorBlocks: blocks })}
            showAddButton={false}
          />
        </div>
      )}

      {/* 预览模式下的内容渲染 */}
      {editMode === 'preview' && editedArticle && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: '40px',
          borderRadius: '12px',
          marginBottom: '40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          {(editedArticle.blocks || []).map((block: any) => (
            <div key={block.id} style={{ marginBottom: '32px' }}>
              {block.type === 'text' ? (
                <TextBlock block={block} mode="view" />
              ) : block.type === 'image' ? (
                <ImageBlock block={block} mode="view" />
              ) : block.type === 'code' ? (
                <CodeBlock block={block} mode="view" />
              ) : block.type === 'placeholder' ? (
                <PlaceholderBlock block={block} />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
