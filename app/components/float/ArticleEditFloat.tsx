'use client';

import React, { useState, useEffect } from 'react';
import { FloatButton, Modal } from '@/app/components/ui';
import { Edit, X, Eye, Save, Trash2, AlertCircle, FileText, Menu } from 'lucide-react';
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
  /** 是否显示「编辑」按钮（如虚拟翻页后不显示，避免保存错章节）；发布新章节等不受影响，可一直显示 */
  showEditButton?: boolean;
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
  showEditButton = true,
}: ArticleEditFloatProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 检测触摸设备 - 必须在权限检查之前调用hooks，确保每次渲染hooks顺序一致
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    setIsTouch(Boolean(touch));
  }, []);

  // 根据设备类型决定是否显示tooltip
  const tooltipProp = (title: string) => isTouch ? undefined : { title, placement: 'left' as const };

  // 权限检查：只允许管理员和版主看到此按钮
  // 注意：这里不再允许作者本人编辑，只有管理员和版主可以编辑
  const isAdmin = userRole === 'admin';
  const isModerator = userRole === 'moderator';
  const canEdit = isAdmin || isModerator;

  // 如果没有权限，不显示任何按钮
  if (!canEdit) {
    return null;
  }

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
      icon: <AlertCircle size={20} />,
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
          icon={<Menu size={20} />}
          tooltip={tooltipProp('操作')}
          type="primary"
        >
          {showEditButton && (
            <FloatButton
              icon={<Edit size={20} />}
              tooltip={tooltipProp('编辑文章')}
              onClick={onEdit}
            />
          )}
          {isBookPage && (
            <FloatButton
              icon={<FileText size={20} />}
              tooltip={tooltipProp('发布章节')}
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
              icon={<FileText size={20} />}
              tooltip={tooltipProp('写文章')}
              onClick={handlePublishArticle}
            />
          )}
          {showEditButton && onDelete && (
            <FloatButton
              icon={<Trash2 size={20} />}
              tooltip={tooltipProp('删除文章')}
              onClick={handleDelete}
            />
          )}
        </FloatButton.Group>
      );
    }
    
    return (
      <FloatButton
        icon={<Edit size={20} />}
        tooltip={tooltipProp('编辑文章')}
        type="primary"
        style={{ insetInlineEnd: 24, bottom: 40 }}
        onClick={onEdit}
      />
    );
  }

  // 编辑模式：显示保存、预览和取消按钮组
  if (mode === 'edit') {
    return (
      <FloatButton.Group
        trigger="click"
        style={{ insetInlineEnd: 24, bottom: 40 }}
        icon={<Edit size={20} />}
        tooltip={tooltipProp('编辑中')}
        type="primary"
      >
        <FloatButton
          icon={<Save size={20} />}
          tooltip={tooltipProp('保存')}
          onClick={() => {
            console.log('💾 点击保存按钮');
            onSave();
          }}
        />
        <FloatButton
          icon={<Eye size={20} />}
          tooltip={tooltipProp('预览')}
          onClick={onPreview}
        />
        <FloatButton
          icon={<X size={20} />}
          tooltip={tooltipProp('取消')}
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
        style={{ insetInlineEnd: 24, bottom: 40 }}
        icon={<Eye size={20} />}
        tooltip={tooltipProp('预览中')}
        type="primary"
      >
        <FloatButton
          icon={<Save size={20} />}
          tooltip={tooltipProp('保存')}
          onClick={() => {
            console.log('💾 点击保存按钮');
            onSave();
          }}
        />
        <FloatButton
          icon={<Edit size={20} />}
          tooltip={tooltipProp('继续编辑')}
          onClick={() => onCancel()} // 返回编辑模式
        />
      </FloatButton.Group>
    );
  }

  return null;
}

