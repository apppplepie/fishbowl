'use client';

import React from 'react';
import { FloatButton, Modal } from 'antd';
import { 
  EditOutlined, 
  CloseOutlined, 
  EyeOutlined,
  SaveOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ChapterManageFloat from './ChapterManageFloat';


export type EditMode = 'view' | 'edit' | 'preview';

interface ArticleEditFloatProps {
  mode: EditMode;
  onEdit: () => void;
  onPreview: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onAdjustCategory?: () => void; // 新增：调整章节
  categoryId?: string;
  articleAuthor?: string;
  currentUser?: string;
  userRole?: 'admin' | 'moderator' | 'user'; // 新增：用户角色
}

/**
 * 文章编辑悬浮按钮组件
 * 根据不同模式显示不同的操作按钮
 * - view: 显示编辑按钮组（编辑、调整章节、删除）
 * - edit: 显示保存、预览和取消按钮
 * - preview: 显示保存和返回编辑按钮
 */
export default function ArticleEditFloat({
  mode,
  onEdit,
  onPreview,
  onSave,
  onCancel,
  onDelete,
  onAdjustCategory,
  categoryId,
  articleAuthor,
  currentUser,
  userRole,
}: ArticleEditFloatProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 检查是否有编辑权限
  // 1. 作者本人
  // 2. 管理员
  // 3. 版主
  const isAuthor = articleAuthor && currentUser && articleAuthor === currentUser;
  const isAdmin = userRole === 'admin';
  const isModerator = userRole === 'moderator';
  const canEdit = isAuthor || isAdmin || isModerator;

  // 路由判断
  const isBookPage = pathname?.startsWith('/book/');
  const isArticlePage = pathname?.startsWith('/article/');

  // 复用 BookcaseActionFloat 发布章节按钮逻辑
  // 优先使用组件参数传入的 categoryId，保证从 /book/[id] 页面跳转时带上当前目录
  // 如果 URL 上已经有 category（如虚拟翻页后），可以作为备用
  const categoryFromUrl = searchParams.get('category');
  const handlePublishChapter = () => {
    const targetCategory = categoryId || categoryFromUrl;
    const query = targetCategory ? `?category=${targetCategory}` : '';
    router.push(`/publish-chapter${query}`);
  };

  // 复用 ArchiveActionFloat 写文章按钮逻辑
  const handlePublishArticle = () => {
    router.push('/publish-article');
  };
  
  // 调试信息
  console.log('ArticleEditFloat 权限检查:', {
    articleAuthor,
    currentUser,
    userRole,
    isAuthor,
    isAdmin,
    isModerator,
    canEdit,
    hasOnDelete: !!onDelete,
    hasOnAdjustCategory: !!onAdjustCategory,
    mode,
  });

  // 删除确认
  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除这篇文章吗？此操作不可恢复。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        onDelete?.();
      },
    });
  };

  // 浏览模式：显示编辑按钮（如果有权限，显示按钮组）
  if (mode === 'view') {
    if (canEdit) {
      function onChapterManageSuccess(): void {
        throw new Error('Function not implemented.');
      }

      return (
        <FloatButton.Group
          trigger="click"
          style={{ insetInlineEnd: 24 }}
          icon={<MenuOutlined />}
          tooltip={{ title: '操作', placement: 'left' }}
          type="primary"
        >
          <FloatButton
            icon={<EditOutlined />}
            tooltip={{ title: '编辑文章', placement: 'left' }}
            onClick={onEdit}
          />
          {isBookPage && (
            <FloatButton
              icon={<FileTextOutlined />}
              tooltip={{ title: '发布章节', placement: 'left' }}
              onClick={handlePublishChapter}
            />
          )}
          {/* {isBookPage && (categoryId || categoryFromUrl) && (
            <ChapterManageFloat
              categoryId={categoryId || categoryFromUrl!}
              rootDepth={2}
              onSuccess={onChapterManageSuccess}
            />
          )} */}
          {isArticlePage && (
            <FloatButton
              icon={<FileTextOutlined />}
              tooltip={{ title: '写文章', placement: 'left' }}
              onClick={handlePublishArticle}
            />
          )}
          {onDelete && (
            <FloatButton
              icon={<DeleteOutlined />}
              tooltip={{ title: '删除文章', placement: 'left' }}
              onClick={handleDelete}
            />
          )}
        </FloatButton.Group>
      );
    }
    
    return (
      <FloatButton
        icon={<EditOutlined />}
        tooltip={{ title: '编辑文章', placement: 'left' }}
        type="primary"
        style={{ insetInlineEnd: 24 }}
        onClick={onEdit}
      />
    );
  }

  // 编辑模式：显示保存、预览和取消按钮组
  if (mode === 'edit') {
    return (
      <FloatButton.Group
        trigger="click"
        style={{ insetInlineEnd: 24 }}
        icon={<EditOutlined />}
        tooltip={{ title: '编辑中', placement: 'left' }}
        type="primary"
      >
        <FloatButton
          icon={<SaveOutlined />}
          tooltip={{ title: '保存', placement: 'left' }}
          onClick={onSave}
        />
        <FloatButton
          icon={<EyeOutlined />}
          tooltip={{ title: '预览', placement: 'left' }}
          onClick={onPreview}
        />
        <FloatButton
          icon={<CloseOutlined />}
          tooltip={{ title: '取消', placement: 'left' }}
          onClick={onCancel}
        />
      </FloatButton.Group>
    );
  }

  // 预览模式：显示保存和返回编辑按钮组
  if (mode === 'preview') {
    return (
      <FloatButton.Group
        trigger="click"
        style={{ insetInlineEnd: 24 }}
        icon={<EyeOutlined />}
        tooltip={{ title: '预览中', placement: 'left' }}
        type="primary"
      >
        <FloatButton
          icon={<SaveOutlined />}
          tooltip={{ title: '保存', placement: 'left' }}
          onClick={onSave}
        />
        <FloatButton
          icon={<EditOutlined />}
          tooltip={{ title: '继续编辑', placement: 'left' }}
          onClick={() => onCancel()} // 返回编辑模式
        />
      </FloatButton.Group>
    );
  }

  return null;
}

