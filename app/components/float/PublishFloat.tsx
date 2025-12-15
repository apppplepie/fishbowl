'use client';

import React, { useState } from 'react';
import { FloatButton, message } from 'antd';
import { PlusOutlined, SaveOutlined, EyeOutlined, CloseOutlined, MenuOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';
import { useRouter } from 'next/navigation';

// 类型（如果你用 JS 可删去）
export interface FloatingActionsProps {
  onPublish: () => void;
  onSave: () => void;
  form: FormInstance<any>;
  blocks: Array<any>;
  isPreviewMode: boolean;
  setIsPreviewMode: (v: boolean) => void;
  onExit?: () => void; // 退出页面的回调
  minWidth?: number | string;      // 单个按钮的最小宽度，默认 140
  position?: { right?: number; bottom?: number }; // 自定义位置
  className?: string;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({
  onPublish,
  onSave,
  form,
  blocks,
  isPreviewMode,
  setIsPreviewMode,
  onExit,
  position,
  className,
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const validateBeforePreview = (): boolean => {
    const values = form.getFieldsValue();
    if (!values?.title) {
      message.warning('请先输入章节标题');
      return false;
    }
    const hasContent = blocks.length > 0 && blocks.some((b) => {
      if (b.type === 'text') return Boolean((b as any).content?.trim());
      if (b.type === 'code') return Boolean((b as any).code?.trim());
      if (b.type === 'image') return true;
      return false;
    });
    if (!hasContent) {
      message.warning('请先添加一些内容');
      return false;
    }
    return true;
  };

  const handlePreviewToggle = () => {
    // 如果要进入预览，先做校验；如果退出预览则直接退出
    if (!isPreviewMode) {
      if (!validateBeforePreview()) return;
    }
    setIsPreviewMode(!isPreviewMode);
    message.info(isPreviewMode ? '退出预览模式' : '进入预览模式');
  };

  const handleExit = () => {
    if (onExit) {
      onExit();
    } else {
      // 默认返回上一页
      router.back();
    }
  };

  return (
    <FloatButton.Group
      open={open}
      onOpenChange={setOpen}
      icon={<MenuOutlined />}
      trigger="click"
      style={{
        right: position?.right ?? 24,
        bottom: position?.bottom ?? 24,
      }}
      className={className}
    >
      <FloatButton
        icon={<PlusOutlined />}
        tooltip={{ title: "发布文章", placement: "left" }}
        onClick={onPublish}
      />
      <FloatButton
        icon={<SaveOutlined />}
        tooltip={{ title: "保存草稿", placement: "left" }}
        onClick={onSave}
      />
      <FloatButton
        icon={<EyeOutlined />}
        tooltip={{ title: isPreviewMode ? "退出预览" : "预览", placement: "left" }}
        type={isPreviewMode ? 'primary' : 'default'}
        onClick={handlePreviewToggle}
      />
      <FloatButton
        icon={<CloseOutlined />}
        tooltip={{ title: "退出页面", placement: "left" }}
        onClick={handleExit}
        style={{ backgroundColor: '#ff4d4f' }}
      />
    </FloatButton.Group>
  );
};

export default FloatingActions;
