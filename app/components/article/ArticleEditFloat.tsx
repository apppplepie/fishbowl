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
  canEdit?: boolean;
  isLoggedIn?: boolean;
  currentUser?: any;
}

export default function ArticleEditFloat({
  isEditing = false,
  onToggleEdit,
  onPreview,
  onSave,
  onCancel,
  onDelete,
  canEdit = true
}: ArticleEditFloatProps) {
  if (!canEdit) return null; // 或者 render disabled UI

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 1200 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => onToggleEdit && onToggleEdit()}>
          {isEditing ? '退出编辑' : '进入编辑'}
        </button>

        <button onClick={() => onPreview && onPreview()} disabled={!isEditing}>
          预览
        </button>

        <button onClick={() => onSave && onSave()} disabled={!isEditing}>
          保存
        </button>

        <button onClick={() => onCancel && onCancel()} disabled={!isEditing}>
          取消
        </button>

        <button onClick={() => onDelete && onDelete()} style={{ color: 'crimson' }}>
          删除
        </button>
      </div>
    </div>
  );
}
