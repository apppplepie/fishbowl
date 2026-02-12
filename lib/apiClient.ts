/**
 * API客户端工具
 * 使用 HttpOnly Cookie 进行认证，所有请求自动携带 cookie
 * 未登录时可选携带游客身份请求头（X-Guest-Name, X-Guest-Access-Level）
 */

import { authFetch } from './authFetch';
import { getGuestHeaders } from './guestIdentity';

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

/** 由屏幕宽度推算父容器宽度，与后端 masonry 列宽计算一致（用于请求头） */
function getContainerWidthForHeader(): number {
  if (typeof window === 'undefined') return 1400;
  return Math.min(1400, Math.max(0, window.innerWidth - 48));
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

  // 携带容器宽度供后端算列宽 / precomputedSpan（屏幕宽 - 48，与前端一致）
  requestHeaders['X-Container-Width'] = String(getContainerWidthForHeader());

  // 游客身份：仅存本地，请求时带上供未登录场景使用
  Object.assign(requestHeaders, getGuestHeaders());

  // 合并额外的headers
  Object.assign(requestHeaders, headers);

  // 发送请求（浏览器自动携带 HttpOnly cookie）
  // 注意：authFetch 已经处理了 401 和 token 刷新，所以这里只需要捕获可能的 AUTH_EXPIRED 错误
  let response: Response;
  try {
    response = await authFetch(url, {
      ...restOptions,
      headers: requestHeaders,
    });
  } catch (error: any) {
    // 捕获 AUTH_EXPIRED 错误（authFetch 在刷新失败时抛出）
    // authFetch 已经触发了 authRefreshFailed 事件，这里不需要再次触发
    if (error?.message === 'AUTH_EXPIRED') {
      console.log('❌ Token 刷新失败，认证已过期');
      // 返回一个 401 响应，而不是抛出错误
      // 这样调用者可以通过 response.status 判断，而不是 try-catch
      return new Response(
        JSON.stringify({ success: false, error: '认证已过期' }),
        {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    // 其他错误继续抛出
    throw error;
  }

  // authFetch 已经处理了 401 和 token 刷新，所以这里不应该再收到 401
  // 但如果还是收到了（可能是其他原因），且需要认证，尝试再次刷新
  if (response.status === 401 && requiresAuth) {
    console.log('🔄 收到 401（authFetch 处理后），尝试再次刷新 token...');
    const refreshSuccess = await refreshAccessToken();
    
    if (refreshSuccess) {
      // 刷新成功，重试原始请求（浏览器会自动携带新的 cookie）
      console.log('✅ Token 刷新成功，重试原始请求');
      try {
        response = await authFetch(url, {
          ...restOptions,
          headers: requestHeaders,
        });
      } catch (error: any) {
        // 重试时如果还是失败，返回 401 响应
        if (error?.message === 'AUTH_EXPIRED') {
          console.log('❌ 重试时 Token 刷新失败，认证已过期');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('authRefreshFailed'));
          }
          return new Response(
            JSON.stringify({ success: false, error: '认证已过期' }),
            {
              status: 401,
              statusText: 'Unauthorized',
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        throw error;
      }
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
 * PATCH请求
 */
export async function apiPatch(url: string, data?: any, options: RequestOptions = {}): Promise<Response> {
  return apiRequest(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH请求并解析JSON
 */
export async function apiPatchJson<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
  return apiRequestJson<T>(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE请求并解析JSON
 */
export async function apiDeleteJson<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  return apiRequestJson<T>(url, { ...options, method: 'DELETE' });
}