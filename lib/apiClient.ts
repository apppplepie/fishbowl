/** Thin same-origin fetch helpers. Authentication is handled by the HttpOnly session cookie. */

function getContainerWidthForHeader(): number {
  if (typeof window === 'undefined') return 1400;
  return Math.min(1400, Math.max(0, window.innerWidth - 48));
}

export async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('X-Container-Width', String(getContainerWidthForHeader()));
  return fetch(url, { ...options, headers, credentials: 'include' });
}

export function apiGet(url: string, options: RequestInit = {}): Promise<Response> {
  return apiRequest(url, { ...options, method: 'GET' });
}

export function apiPost(url: string, data?: unknown, options: RequestInit = {}): Promise<Response> {
  return apiRequest(url, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined });
}

export function apiPut(url: string, data?: unknown, options: RequestInit = {}): Promise<Response> {
  return apiRequest(url, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined });
}

export function apiDelete(url: string, options: RequestInit = {}): Promise<Response> {
  return apiRequest(url, { ...options, method: 'DELETE' });
}

export async function apiRequestJson<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await apiRequest(url, options);
  if (!response.ok) throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
  return response.json();
}

export function apiGetJson<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  return apiRequestJson<T>(url, { ...options, method: 'GET' });
}

export function apiPostJson<T = unknown>(url: string, data?: unknown, options: RequestInit = {}): Promise<T> {
  return apiRequestJson<T>(url, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined });
}

export function apiPutJson<T = unknown>(url: string, data?: unknown, options: RequestInit = {}): Promise<T> {
  return apiRequestJson<T>(url, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined });
}

export function apiPatch(url: string, data?: unknown, options: RequestInit = {}): Promise<Response> {
  return apiRequest(url, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : undefined });
}

export function apiPatchJson<T = unknown>(url: string, data?: unknown, options: RequestInit = {}): Promise<T> {
  return apiRequestJson<T>(url, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : undefined });
}

export function apiDeleteJson<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  return apiRequestJson<T>(url, { ...options, method: 'DELETE' });
}
