// app/components/float/ArticleEditFloat.tsx
'use client';
import React from 'react';

export interface ArticleEditFloatProps {
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onPreview?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onAdjustCategory?: () => void;
  // optional metadata for UI/permission display
  categoryId?: string | number | null;
  articleAuthor?: any;
  currentUser?: string;
  userRole?: string;
}

export default function ArticleEditFloat({
  isEditing = false,
  onToggleEdit,
  onPreview,
  onSave,
  onCancel,
  onDelete,
  onAdjustCategory,
  currentUser,
  userRole,
}: ArticleEditFloatProps) {
  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 1200 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => onToggleEdit && onToggleEdit()}>
          {isEditing ? '退出编辑' : '进入编辑'}
        </button>

        <button onClick={() => onPreview && onPreview()} disabled={!isEditing}>
          预览
        </button>

        {/* 通常我们把保存放到编辑器内部；如果你想让浮窗触发保存，传入 onSave */}
        <button onClick={() => onSave && onSave()} disabled={!isEditing}>
          保存
        </button>

        <button onClick={() => onCancel && onCancel()} disabled={!isEditing}>
          取消
        </button>

        <button onClick={() => onDelete && onDelete()} style={{ color: 'crimson' }}>
          删除
        </button>

        <button onClick={() => onAdjustCategory && onAdjustCategory()}>
          调整分类
        </button>
      </div>
    </div>
  );
}
