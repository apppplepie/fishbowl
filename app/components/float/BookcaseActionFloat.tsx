'use client';

import React from 'react';
import { FloatButton } from 'antd';
import { PlusOutlined, BookOutlined, FileTextOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import ChapterManageFloat from './ChapterManageFloat';

interface BookcaseActionFloatProps {
  onChapterManageSuccess?: () => void;
}

/**
 * 书架页面操作悬浮按钮组
 * 集成书籍发布、章节管理等功能
 */
export default function BookcaseActionFloat({ onChapterManageSuccess }: BookcaseActionFloatProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryFromUrl = searchParams.get('category');
  const isInSpecificCategory = categoryFromUrl && categoryFromUrl !== 'cat_bookcase';


  // 跳转到发布新书页面
  const handlePublishBook = () => {
    router.push('/publish-book');
  };

  // 跳转到发布章节页面
  const handlePublishChapter = () => {
    router.push(`/publish-chapter?category=${categoryFromUrl}`);
  };


  if (isInSpecificCategory) {
    // 在具体分类目录下，显示发布章节和章节管理按钮
    return (
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
        <ChapterManageFloat categoryId={categoryFromUrl} onSuccess={onChapterManageSuccess} />
      </FloatButton.Group>
    );
  } else {
    // 在书橱根目录，显示发布新书按钮
    return (
      <FloatButton
        icon={<BookOutlined />}
        type="primary"
        style={{ right: 24, bottom: 24 }}
        tooltip={{ title: "发布新书", placement: "left" }}
        onClick={handlePublishBook}
      />
    );
  }
}
