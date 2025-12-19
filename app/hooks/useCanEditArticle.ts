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
  const { isLoggedIn, token } = useAuth();
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastCheckedRef = useRef<{ articleId: string | null; token: string | null }>({ articleId: null, token: null });

  useEffect(() => {
    // 如果没有文章ID或未登录，直接返回
    if (!articleId || !isLoggedIn) {
      setCanEdit(false);
      setIsLoading(false);
      lastCheckedRef.current = { articleId: null, token: null };
      return;
    }

    // 获取当前 token
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    
    // 如果已经检查过相同的 articleId 和 token，跳过重复请求
    if (
      lastCheckedRef.current.articleId === articleId &&
      lastCheckedRef.current.token === authToken
    ) {
      return;
    }

    // 调用后端API检查权限
    const checkPermission = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!authToken) {
          setCanEdit(false);
          setIsLoading(false);
          lastCheckedRef.current = { articleId, token: null };
          return;
        }

        const response = await fetch(`/api/articles/${articleId}/can-edit`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        const result = await response.json();

        if (result.success) {
          setCanEdit(result.canEdit);
          lastCheckedRef.current = { articleId, token: authToken }; // 记录已检查的状态
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
  }, [articleId, isLoggedIn, token]); // 只依赖 articleId、isLoggedIn 和 token

  return { canEdit, isLoading, error };
}
