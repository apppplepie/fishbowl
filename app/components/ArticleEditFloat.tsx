'use client';

import React from 'react';
import { FloatButton, Modal } from 'antd';
import { 
  EditOutlined, 
  CheckOutlined, 
  CloseOutlined, 
  EyeOutlined,
  SaveOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  FolderOutlined
} from '@ant-design/icons';

export type EditMode = 'view' | 'edit' | 'preview';

interface ArticleEditFloatProps {
  mode: EditMode;
  onEdit: () => void;
  onPreview: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onAdjustCategory?: () => void; // 新增：调整章节
  articleAuthor?: string;
  currentUser?: string;
}

/**
 * 文章编辑悬浮按钮组件
 * 根据不同模式显示不同的操作按钮
 * - view: 显示编辑按钮
 * - edit: 显示预览和取消按钮
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
  articleAuthor,
  currentUser,
}: ArticleEditFloatProps) {
  // 检查是否有编辑权限（当前用户和文章作者一致）
  const canEdit = articleAuthor && currentUser && articleAuthor === currentUser;
  
  // 调试信息
  console.log('ArticleEditFloat 权限检查:', {
    articleAuthor,
    currentUser,
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
      return (
        <FloatButton.Group
          trigger="click"
          style={{ insetInlineEnd: 24 }}
          icon={<EditOutlined />}
          tooltip={{ title: '操作', placement: 'left' }}
          type="primary"
        >
          <FloatButton
            icon={<EditOutlined />}
            tooltip={{ title: '编辑文章', placement: 'left' }}
            onClick={onEdit}
          />
          {onAdjustCategory && (
            <FloatButton
              icon={<FolderOutlined />}
              tooltip={{ title: '调整章节', placement: 'left' }}
              onClick={onAdjustCategory}
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

  // 编辑模式：显示预览和取消按钮组
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

