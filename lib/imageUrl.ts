/**
 * 将不可达的 CDN 占位域名（如 yourcdn.example.com）重写为同源路径，
 * 避免 Next/Image 请求时 ENOTFOUND，本地/开发环境用同源 /uploads 或 /api/uploads 拉图。
 */
const UNREACHABLE_HOSTS = [
  'yourcdn.example.com',
  process.env.NEXT_PUBLIC_UNREACHABLE_CDN,
].filter(Boolean) as string[];

export function getImageSrc(url: string | null | undefined): string | undefined {
  if (url == null || url === '') return undefined;
  try {
    const parsed = new URL(url, 'https://_');
    if (UNREACHABLE_HOSTS.some((host) => parsed.hostname === host)) {
      return parsed.pathname; // 同源请求，走 rewrites: /uploads/* -> /api/uploads/*
    }
  } catch {
    // 非合法 URL（如相对路径）直接返回
  }
  return url;
}
