'use client';

import React, { useEffect, useState } from 'react';
import { TagSearchPickerWithTags, TransparentSearchInput } from '@/app/components/ui';

interface LibraryBox1Props {
  isMobile: boolean;
  showFilters: boolean;
  /** 关键词已防抖，交出去的是「可以拿去请求」的值 */
  onKeywordCommit: (keyword: string) => void;
  onTagsChange: (tags: string[]) => void;
}

const KEYWORD_DEBOUNCE_MS = 300;

/**
 * 书房顶部区（PageShell 的 box1）：搜索 + 标签筛选。
 *
 * 视角切换已经搬到 header 导航里了（文章 / 书籍 / 画作），这里只管筛选。
 *
 * 输入框的值只活在这里，防抖之后才交给上层，
 * 这样打字不会每个字符都推一次 PageShell 配置、把整棵树带着重渲染。
 */
export default function LibraryBox1({
  isMobile,
  showFilters,
  onKeywordCommit,
  onTagsChange,
}: LibraryBox1Props) {
  const [keyword, setKeyword] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => onKeywordCommit(keyword.trim()), KEYWORD_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keyword, onKeywordCommit]);

  // 画作视角没有筛选项，就别占着顶部那块地方
  if (!showFilters) return null;

  return (
    <div style={{ padding: '4px 24px 16px' }}>
      <div style={{ maxWidth: isMobile ? '100%' : 320, marginBottom: 12 }}>
        <TransparentSearchInput
          placeholder="标题或摘要..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          allowClear
        />
      </div>

      <div style={{ maxWidth: isMobile ? '100%' : 400 }}>
        <TagSearchPickerWithTags
          value={tags}
          onChange={(next: string[]) => {
            setTags(next);
            onTagsChange(next);
          }}
          placeholder="按标签筛选…"
          className="tag-search-picker-transparent"
        />
      </div>
    </div>
  );
}
