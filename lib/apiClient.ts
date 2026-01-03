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
 * 统一的API请求函数
 * 自动添加认证头
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
  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });

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