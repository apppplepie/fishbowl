'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

interface UseCanEditArticleResult {
  canEdit: boolean | null; // null 表示正在检查
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook 用于检查用户是否可以编辑指定文章
 * 调用后端API统一判断权限，避免前端分散的权限判断
 */
export function useCanEditArticle(articleId: string | null | undefined): UseCanEditArticleResult {
  const { isLoggedIn } = useAuth();
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastCheckedRef = useRef<string | null>(null);

  useEffect(() => {
    // 如果没有文章ID或未登录，直接返回
    if (!articleId || !isLoggedIn) {
      setCanEdit(false);
      setIsLoading(false);
      lastCheckedRef.current = null;
      return;
    }
    
    // 如果已经检查过相同的 articleId，跳过重复请求
    if (lastCheckedRef.current === articleId) {
      return;
    }

    // 调用后端API检查权限（token 在 HttpOnly cookie 中）
    const checkPermission = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/articles/${articleId}/can-edit`, {
          credentials: 'include', // 携带 HttpOnly cookie
        });

        const result = await response.json();

        if (result.success) {
          setCanEdit(result.canEdit);
          lastCheckedRef.current = articleId; // 记录已检查的状态
        } else {
          setError(result.error || '检查权限失败');
          setCanEdit(false);
        }
      } catch (err: any) {
        console.error('检查编辑权限失败:', err);
        setError(err.message || '检查权限失败');
        setCanEdit(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [articleId, isLoggedIn]); // 只依赖 articleId 和 isLoggedIn

  return { canEdit, isLoading, error };
}
