import React from 'react';
import { FloatButton } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

/**
 * 书籍发布悬浮按钮
 * 在bookcase页面显示，用于快速跳转到书籍发布页面
 */
export default function BookPublishFloat() {
  const router = useRouter();

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
