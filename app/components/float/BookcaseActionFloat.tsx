'use client';

import React, { useState } from 'react';
import { FloatButton, message } from 'antd';
import { PlusOutlined, BookOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import ChapterManageFloat from './ChapterManageFloat';
import { useAuth } from '@/app/hooks/useAuth';

interface BookcaseActionFloatProps {
  onChapterManageSuccess?: () => void;
  onDeleteModeChange?: (enabled: boolean) => void; // 删除模式变化回调
  deleteMode?: boolean; // 当前删除模式状态
}

/**
 * 书架页面统一操作悬浮按钮组
 * 集成所有发布和管理功能：
 * - 发布功能：发布新书、发布章节
 * - 管理功能：章节管理、删除书籍
 */
export default function BookcaseActionFloat({ 
  onChapterManageSuccess, 
  onDeleteModeChange,
  deleteMode = false 
}: BookcaseActionFloatProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const categoryFromUrl = searchParams.get('category');

  // 判断是否在具体分类目录下
  const isInSpecificCategory = categoryFromUrl && categoryFromUrl !== 'cat_bookcase';

  // 检查是否为管理员
  const isAdmin = user?.role === 'admin';

  // ========== 发布功能 ==========
  // 跳转到发布新书页面
  const handlePublishBook = () => {
    router.push('/publish-book');
  };

  // 跳转到发布章节页面
  const handlePublishChapter = () => {
    router.push(`/publish-chapter?category=${categoryFromUrl}`);
  };

  // ========== 删除书籍功能 ==========
  // 处理删除书籍按钮点击 - 切换删除模式
  const handleDeleteBookClick = () => {
    if (!isAdmin) {
      message.warning('只有管理员才能删除书籍');
      return;
    }
    
    // 切换删除模式
    const newMode = !deleteMode;
    onDeleteModeChange?.(newMode);
    
    if (newMode) {
      message.info('已进入删除模式，点击卡片上的删除按钮可删除书籍');
    } else {
      message.info('已退出删除模式');
    }
  };

  // ========== 渲染 ==========
  if (isInSpecificCategory) {
    // 在具体分类目录下，显示发布章节和章节管理按钮
    return (
      <>
        <FloatButton.Group
          trigger="click"
          type="primary"
          style={{ right: 24, bottom: 24 }}
          icon={<PlusOutlined />}
          tooltip={{ title: "操作菜单", placement: "left" }}
        >
          {/* 发布章节按钮 */}
          <FloatButton
            icon={<FileTextOutlined />}
            tooltip={{ title: "发布章节", placement: "left" }}
            onClick={handlePublishChapter}
          />

          {/* 章节管理按钮 */}
          <ChapterManageFloat 
            categoryId={categoryFromUrl} 
            rootDepth={2}
            onSuccess={onChapterManageSuccess} 
          />
        </FloatButton.Group>
      </>
    );
  } else {
    // 在书橱根目录，显示发布新书、章节管理和删除书籍按钮
    return (
      <>
        <FloatButton.Group
          trigger="click"
          type="primary"
          style={{ right: 24, bottom: 24 }}
          icon={<BookOutlined />}
          tooltip={{ title: "操作菜单", placement: "left" }}
        >
          {/* 发布新书按钮 */}
          <FloatButton
            icon={<BookOutlined />}
            tooltip={{ title: "发布新书", placement: "left" }}
            onClick={handlePublishBook}
          />

          {/* 章节管理按钮 */}
          <ChapterManageFloat 
            categoryId={categoryFromUrl || 'cat_bookcase'} 
            rootDepth={1} 
            onSuccess={onChapterManageSuccess} 
          />

          {/* 删除书籍按钮 - 仅管理员可见 */}
          {isAdmin && (
            <FloatButton
              icon={<DeleteOutlined />}
              tooltip={{ title: deleteMode ? "退出删除模式" : "删除书籍", placement: "left" }}
              onClick={handleDeleteBookClick}
              style={{ 
                backgroundColor: deleteMode ? '#52c41a' : '#ff4d4f', 
                color: 'white' 
              }}
            />
          )}
        </FloatButton.Group>
      </>
    );
  }
}
