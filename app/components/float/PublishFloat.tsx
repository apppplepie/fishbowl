'use client';

// Force recompile - updated import structure

import React, { useState, useEffect } from 'react';
import { FloatButton, message, Modal } from '@/app/components/ui';
import { Menu, Check, Eye, Trash2 } from 'lucide-react';
import type { FormInstance } from '@/app/components/ui/compat';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';

export interface FloatingActionsProps {
  onPublish: () => void
  onSave: () => void | Promise<void>
  onLoadDraft?: () => void // 读取草稿的回调
  onClearDraft?: () => void // 清除草稿的回调
  form: FormInstance<any>
  blocks: Array<any>
  isPreviewMode: boolean
  setIsPreviewMode: (v: boolean) => void
  isSubmitting?: boolean // 发布中时禁用发布按钮，防止重复提交
  onExit?: () => void
  exitPath?: string // 退出时跳转的路径，如果提供则优先使用
  minWidth?: number | string
  position?: { right?: number; bottom?: number }
  className?: string
}

/**
 * 文章发布悬浮按钮组件
 * 提供发布文章、保存草稿、预览和退出页面的功能
 * 使用可展开的按钮组，默认收起状态
 */
export default function FloatingActions({
  onPublish,
  onSave,
  onLoadDraft,
  onClearDraft,
  form,
  blocks,
  isPreviewMode,
  setIsPreviewMode,
  isSubmitting = false,
  onExit,
  exitPath,
  position,
  className,
}: FloatingActionsProps) {
  const router = useRouter()
  const { canModerate } = useAuth()
  const [open, setOpen] = useState(false)

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
  if (!canModerate()) {
    return null;
  }

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
    // 检查表单是否有未保存的更改
    const formValues = form.getFieldsValue();
    const hasContent = blocks.length > 0 || Object.values(formValues).some(value =>
      value !== undefined && value !== null && value !== ''
    );

    if (hasContent) {
      // 如果有内容，显示确认对话框
      Modal.confirm({
        title: '退出确认',
        content: '您有未保存的内容，是否要保存草稿后再退出？',
        okText: '保存草稿并退出',
        cancelText: '直接退出',
        onOk: async () => {
          try {
            // 先保存草稿
            const result = onSave();
            if (result instanceof Promise) {
              await result;
            }
            // 然后退出
            if (onExit) {
              onExit();
            } else if (exitPath) {
              router.push(exitPath);
            } else {
              router.back();
            }
          } catch (error) {
            message.error('保存草稿失败');
          }
        },
        onCancel: () => {
          // 直接退出前清除草稿
          if (onClearDraft) {
            onClearDraft();
          }
          // 然后退出
          if (onExit) {
            onExit();
          } else if (exitPath) {
            router.push(exitPath);
          } else {
            router.back();
          }
        },
      });
    } else {
      // 如果没有内容，直接退出
      if (onExit) {
        onExit();
      } else if (exitPath) {
        router.push(exitPath);
      } else {
        router.back();
      }
    }
  }

  return (
    <FloatButton.Group
      open={open}
      onOpenChange={setOpen}
      icon={<Menu size={20} />}
      trigger="click"
      style={{
        insetInlineEnd: position?.right ?? 24,
        bottom: position?.bottom ?? 40
      }}
      className={className}
      tooltip={tooltipProp('操作')}
      type="primary"
    >
      <FloatButton
        icon={<Check size={20} />}
        tooltip={tooltipProp(isSubmitting ? '发布中...' : '发布文章')}
        onClick={() => {
          if (!isSubmitting) onPublish();
        }}
      />
      {/* {blocks.length > 0 ? (
        <FloatButton
          icon={<Save size={20} />}
          tooltip={{ title: '保存草稿', placement: 'left' }}
          onClick={onSave}
        />
      ) : (
        <FloatButton
          icon={<Save size={20} />}
          tooltip={{ title: '读取草稿', placement: 'left' }}
          onClick={onLoadDraft || (() => {})}
        />
      )} */}
      <FloatButton
        icon={<Eye size={20} />}
        tooltip={tooltipProp(isPreviewMode ? '退出预览' : '预览')}
        type={isPreviewMode ? 'primary' : 'default'}
        onClick={handlePreviewToggle}
      />
      <FloatButton
        icon={<Trash2 size={20} />}
        tooltip={tooltipProp('退出页面')}
        onClick={handleExit}
        style={{ backgroundColor: '#ff4d4f' }}
      />
    </FloatButton.Group>
  );
}
