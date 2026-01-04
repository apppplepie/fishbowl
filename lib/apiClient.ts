/**
 * API客户端工具
 * 统一处理认证token和请求
 */

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * 获取认证token
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  // 优先使用新版sessionStorage（access token），兼容旧版localStorage
  const sessionToken = sessionStorage.getItem('access-token');
  if (sessionToken) return sessionToken;
  return localStorage.getItem('token');
}

/**
 * 刷新Access Token
 */
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
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
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.accessToken) {
          // 更新access token
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('access-token', data.accessToken);
            localStorage.setItem('token', data.accessToken);
          }
          return data.accessToken;
        }
      }

      // 刷新失败，清除认证数据
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('access-token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // 刷新失败，清除认证数据
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('access-token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
      }
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * 统一的API请求函数
 * 自动添加认证头，并在401时自动刷新token
 */
export async function apiRequest(url: string, options: RequestOptions = {}): Promise<Response> {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  // 准备请求头
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 合并额外的headers
  Object.assign(requestHeaders, headers);

  // 如果需要认证，添加token
  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  // 发送请求
  let response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });

  // 如果返回401且需要认证，尝试刷新token并重试
  if (response.status === 401 && requiresAuth) {
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      // 用新token重试请求
      requestHeaders['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
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