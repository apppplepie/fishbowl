let refreshing: Promise<boolean> | null = null;

export async function authFetch(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    credentials: 'include', // 非常重要
  });

  if (res.status !== 401) return res;

  // ---------- 401 进入刷新流程 ----------
  if (!refreshing) {
    refreshing = refreshToken();
  }

  const ok = await refreshing;
  refreshing = null;

  if (!ok) {
    // 这里才是真正"登录失效"
    throw new Error('AUTH_EXPIRED');
  }

  // ---------- 重放原请求 ----------
  return fetch(input, {
    ...init,
    credentials: 'include',
  });
}

async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

