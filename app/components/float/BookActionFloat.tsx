'use client';

import React, { useState, useEffect } from 'react';
import { FloatButton } from '@/app/components/ui';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';
import { BOOK_ROOT_CATEGORY_ID } from '@/lib/constants';

interface BookActionFloatProps {
  /** 当前所在的书（分类 id）；为空表示停在书房根目录 */
  categoryId: string | null;
}

/**
 * 书房「书籍」视角右下角的加号。
 *
 * 只有一个动作，看你站在哪一层：
 * - 书架根目录：建新书
 * - 某一本书里面：给这本书加一章
 *
 * 章节管理仍然挂在文章页的编辑悬浮按钮（ArticleEditFloat）上。
 */
export default function BookActionFloat({ categoryId }: BookActionFloatProps) {
  const router = useRouter();
  const { canModerate } = useAuth();

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

  // 判断是否进到了某一本书里
  const isInSpecificCategory = categoryId && categoryId !== BOOK_ROOT_CATEGORY_ID;

  return (
    <FloatButton
      icon={<Plus size={20} />}
      type="primary"
      style={{ right: 24, bottom: 40 }}
      onClick={() =>
        router.push(isInSpecificCategory ? `/publish-chapter?category=${categoryId}` : '/publish-book')
      }
      tooltip={tooltipProp(isInSpecificCategory ? '发布章节' : '建新书')}
    />
  );
}
