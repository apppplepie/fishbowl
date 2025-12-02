'use client';

import React from 'react';
import { FloatButton } from 'antd';
import { 
  EditOutlined, 
  CheckOutlined, 
  CloseOutlined, 
  EyeOutlined,
  SaveOutlined 
} from '@ant-design/icons';

export type EditMode = 'view' | 'edit' | 'preview';

interface ArticleEditFloatProps {
  mode: EditMode;
  onEdit: () => void;
  onPreview: () => void;
  onSave: () => void;
  onCancel: () => void;
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
}: ArticleEditFloatProps) {
  // 浏览模式：只显示编辑按钮
  if (mode === 'view') {
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

