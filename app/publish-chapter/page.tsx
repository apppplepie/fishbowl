'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import BlockComposer from '@/app/components/publish/BlockComposer';
import { apiGetJson } from '@/lib/apiClient';
import { getNextOrderIndex } from '@/app/utils/orderIndex';

/**
 * 章节发布页面内部组件
 * 分类来自 URL 的 category 参数，发布后回到对应书橱目录
 */
function PublishChapterContent() {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get('category');

  const [nextOrderInCategory, setNextOrderInCategory] = useState(1);
  const [categoryName, setCategoryName] = useState<string>('');

  // 初始化时获取 order_index 和分类名称
  useEffect(() => {
    if (!categoryFromUrl) return;

    getNextOrderIndex(categoryFromUrl)
      .then(setNextOrderInCategory)
      .catch(error => {
        console.warn('获取章节顺序失败，使用默认顺序:', error);
        setNextOrderInCategory(0); // 继续发布，后端可能会自动处理
      });

    apiGetJson<{ success: boolean; category?: { name: string } }>(`/api/categories/${categoryFromUrl}`)
      .then(result => {
        if (result.success && result.category) {
          setCategoryName(result.category.name);
        }
      })
      .catch(error => {
        console.error('获取分类名称失败:', error);
      });
  }, [categoryFromUrl]);

  return (
    <BlockComposer
      noun="章节"
      draftKey="chapter-draft"
      successRedirect={`/bookcase?category=${categoryFromUrl}`}
      exitPath="/bookcase"
      headerTitle="📝 章节信息"
      mobileInfoPadding="0"
      mobileEditorPadding="0"
      fixedCategory={{
        id: categoryFromUrl,
        name: categoryName,
        orderIndex: nextOrderInCategory,
      }}
    />
  );
}

/**
 * 章节发布页面
 * 用 Suspense 包装以支持 useSearchParams
 */
export default function PublishChapterPage() {
  return (
    <Suspense fallback={<div> </div>}>
      <PublishChapterContent />
    </Suspense>
  );
}
