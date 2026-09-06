'use client';

import React, { Suspense } from 'react';
import { Spin } from '@/app/components/ui';
import LibraryShell from './LibraryShell';

/**
 * 书房：文 / 书 / 画 三个视角共用一个页面。
 * 视角与分类都写在 query 里（/library?view=doc&category=xxx），
 * 切视角不换路由，列表状态留在内存里，回来直接复原。
 */
export default function LibraryPage() {
  return (
    <Suspense fallback={<div style={{ height: '100vh' }}><Spin size="middle" /></div>}>
      <LibraryShell />
    </Suspense>
  );
}
