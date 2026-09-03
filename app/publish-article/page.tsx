'use client';

import BlockComposer from '@/app/components/publish/BlockComposer';

/**
 * 块编辑器文章发布页面
 * 分类由用户在表单中选择，发布后回到归档页
 */
export default function PublishArticlePage() {
  return (
    <BlockComposer
      noun="文章"
      draftKey="article-draft"
      successRedirect="/archive?refresh=1"
      exitPath="/archive"
    />
  );
}
