/**
 * API客户端工具
 * 使用 HttpOnly Cookie 进行认证，所有请求自动携带 cookie
 */

import { authFetch } from './authFetch';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * 刷新Access Token（通过 HttpOnly Cookie）
 * 刷新成功后，新的 token 会自动存储在 cookie 中
 */
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  // 如果正在刷新，返回同一个Promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 关键：携带HttpOnly cookie
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Token 刷新成功');
          // 刷新成功，新的 token 已自动存储在 cookie 中
          // 不需要触发事件，因为后续请求会自动使用新 token
          return true;
        }
      }

      // 刷新失败（refresh token 可能过期了）
      console.warn('⚠️ Token 刷新失败，refresh token 可能已过期');
      
      // 不在这里清除数据，让 AuthContext 统一处理
      // 只触发一次事件，通知 AuthContext
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('authRefreshFailed'));
      }
      return false;
    } catch (error) {
      console.error('❌ Token refresh 请求失败:', error);
      
      // 网络错误，不清除数据，让 AuthContext 决定
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('authRefreshFailed'));
      }
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * 统一的API请求函数
 * 使用 HttpOnly Cookie 进行认证，浏览器自动携带 cookie
 * 401时自动刷新token并重试
 */
export async function apiRequest(url: string, options: RequestOptions = {}): Promise<Response> {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  // 准备请求头
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 合并额外的headers
  Object.assign(requestHeaders, headers);

  // 发送请求（浏览器自动携带 HttpOnly cookie）
  let response = await authFetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });

  // 如果返回401且需要认证，尝试刷新token并重试
  if (response.status === 401 && requiresAuth) {
    console.log('🔄 收到 401，尝试刷新 token...');
    const refreshSuccess = await refreshAccessToken();
    
    if (refreshSuccess) {
      // 刷新成功，重试原始请求（浏览器会自动携带新的 cookie）
      console.log('✅ Token 刷新成功，重试原始请求');
      response = await authFetch(url, {
        ...restOptions,
        headers: requestHeaders,
      });
    } else {
      // 刷新失败已经触发了 authRefreshFailed 事件
      // 不需要在这里再次处理
      console.log('❌ Token 刷新失败，请求终止');
    }
  }

  return response;
}

/**
 * GET请求
 */
export async function apiGet(url: string, options: RequestOptions = {}): Promise<Response> {
  return apiRequest(url, { ...options, method: 'GET' });
}

/**
 * POST请求
 */
export async function apiPost(url: string, data?: any, options: RequestOptions = {}): Promise<Response> {
  return apiRequest(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT请求
 */
export async function apiPut(url: string, data?: any, options: RequestOptions = {}): Promise<Response> {
  return apiRequest(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE请求
 */
export async function apiDelete(url: string, options: RequestOptions = {}): Promise<Response> {
  return apiRequest(url, { ...options, method: 'DELETE' });
}

/**
 * 解析JSON响应
 */
export async function apiRequestJson<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await apiRequest(url, options);
  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * GET请求并解析JSON
 */
export async function apiGetJson<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  return apiRequestJson<T>(url, { ...options, method: 'GET' });
}

/**
 * POST请求并解析JSON
 */
export async function apiPostJson<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
  return apiRequestJson<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT请求并解析JSON
 */
export async function apiPutJson<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
  return apiRequestJson<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE请求并解析JSON
 */
export async function apiDeleteJson<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  return apiRequestJson<T>(url, { ...options, method: 'DELETE' });
}