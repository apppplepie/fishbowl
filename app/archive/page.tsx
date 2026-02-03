import { Suspense } from 'react';
import ArchiveClient from './ArchiveClient';
import '../styles/articles-filter.css';

/**
 * 文章归档页面 - 纯客户端渲染，数据由 ArchiveClient 拉取
 */

export default function ArchivePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <ArchiveClient />
    </Suspense>
  );
}
