/**
 * API客户端工具
 * 使用 HttpOnly Cookie 进行认证，所有请求自动携带 cookie
 */

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
          // 刷新成功，新的 token 已自动存储在 cookie 中
          // 触发事件通知其他组件登录状态已更新
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('loginStatusChanged'));
          }
          return true;
        }
      }

      // 刷新失败，清除本地用户数据
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('user');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        window.dispatchEvent(new Event('loginStatusChanged'));
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // 刷新失败，清除本地用户数据
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('user');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        window.dispatchEvent(new Event('loginStatusChanged'));
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
  let response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
    credentials: 'include', // 关键：携带 HttpOnly cookie
  });

  // 如果返回401且需要认证，尝试刷新token并重试
  if (response.status === 401 && requiresAuth) {
    const refreshSuccess = await refreshAccessToken();
    
    if (refreshSuccess) {
      // 刷新成功，重试请求（浏览器会自动携带新的 cookie）
      response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
        credentials: 'include',
      });
    } else {
      // 刷新失败，可能需要重新登录
      // 触发登录状态变化事件，让前端处理
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('loginStatusChanged'));
      }
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