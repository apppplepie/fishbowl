/**
 * 游客身份：仅存于浏览器本地，不提交到服务端存储。
 * 用于请求头 X-Guest-Name / X-Guest-Access-Level，供未登录时的访问等级与展示名使用。
 */

const GUEST_STORAGE_KEY = 'fishbowl_guest';

export interface GuestIdentity {
  name?: string;
  access_level: number; // 1 = 学习模式，2 = 宽松
}

export function getGuestIdentity(): GuestIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GuestIdentity;
    if (typeof data.access_level !== 'number') return null;
    return {
      name: typeof data.name === 'string' ? data.name : undefined,
      access_level: data.access_level,
    };
  } catch {
    return null;
  }
}

export function setGuestIdentity(data: GuestIdentity): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function clearGuestIdentity(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {}
}

/** 供 apiClient 使用：返回要附加的请求头（无则返回空对象） */
export function getGuestHeaders(): Record<string, string> {
  const guest = getGuestIdentity();
  if (!guest) return {};
  const headers: Record<string, string> = {
    'X-Guest-Access-Level': String(guest.access_level),
  };
  if (guest.name) headers['X-Guest-Name'] = guest.name;
  return headers;
}
