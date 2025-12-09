import React from 'react';
import { FloatButton } from 'antd';
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import ChapterManageFloat from './ChapterManageFloat';

/**
 * 书籍/章节发布悬浮按钮
 * 在bookcase页面显示，根据当前category参数决定显示书籍发布或章节发布按钮
 */
export default function BookPublishFloat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get('category');

  // 判断是否在具体分类目录下
  const isInSpecificCategory = categoryFromUrl && categoryFromUrl !== 'cat_bookcase';

  if (isInSpecificCategory) {
    // 在具体分类目录下，显示发布章节按钮和章节管理按钮
    return (
      <FloatButton.Group
        icon={<FileTextOutlined />}
        type="primary"
        style={{
          right: 24,
          bottom: 24,
        }}
      >
        <FloatButton
          icon={<FileTextOutlined />}
          tooltip="发布章节"
          onClick={() => router.push(`/publish-chapter?category=${categoryFromUrl}`)}
        />
        <ChapterManageFloat categoryId={categoryFromUrl} />
      </FloatButton.Group>
    );
  } else {
    // 在书橱根目录，显示发布新书按钮
    return (
      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        tooltip="发布新书"
        onClick={() => router.push('/publish-book')}
        style={{
          right: 24,
          bottom: 24,
        }}
      />
    );
  }
}
