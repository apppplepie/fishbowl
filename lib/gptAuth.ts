/**
 * GPT Actions API 认证模块
 *
 * 认证方式：
 * - Header: Authorization: Bearer <token>
 * - Token 与环境变量 GPT_PUBLISH_TOKEN 比对
 * - 验证通过后，作者固定为 GPT_AUTHOR_USER_ID
 *
 * 安全限制：
 * - 仅允许访问 /api/gpt/* 下的接口
 * - 不允许删除、修改用户、访问后台管理
 */
import { NextRequest } from 'next/server';
import crypto from 'crypto';

export interface GptAuthUser {
  id: string;
  username: string;
}

export function generateApiKey(): string {
  return `gpt-sk-${crypto.randomBytes(32).toString('hex')}`;
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * 从请求中提取 Bearer Token
 */
export function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7).trim();
}

/**
 * 解析 GPT_API_KEYS 环境变量
 * 支持格式：
 * - GPT_API_KEYS=key:userId,key2:userId2
 * - GPT_API_KEYS=key
 * - GPT_API_KEY=key:userId
 * - GPT_API_KEY=key
 */
function parseGptApiKeys(): Array<{ token: string; authorId: string }> {
  const raw =
    process.env.GPT_API_KEYS ||
    process.env.GPT_API_KEY ||
    '';

  if (!raw.trim()) {
    return [];
  }

  // 支持逗号、空格、换行分隔
  const entries = raw
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  const results: Array<{ token: string; authorId: string }> = [];

  for (const entry of entries) {
    const separatorIndex = entry.indexOf(':');
    if (separatorIndex > 0) {
      // key:userId 格式
      results.push({
        token: entry.slice(0, separatorIndex),
        authorId: entry.slice(separatorIndex + 1),
      });
    } else {
      // 只有 key，使用默认 userId
      results.push({
        token: entry,
        authorId: process.env.GPT_AUTHOR_USER_ID || process.env.GPT_AUTHOR_NAME || 'chatgpt',
      });
    }
  }

  return results;
}

/**
 * 验证 GPT Token
 */
export function verifyGptToken(req: NextRequest): {
  valid: boolean;
  authorId?: string;
  user?: GptAuthUser;
  error?: string;
} {
  const token = extractToken(req);

  // 1. 检查是否有 Token
  if (!token) {
    return { valid: false, error: 'Missing Authorization header' };
  }

  // 2. 优先支持多 Key 配置
  const apiKeys = parseGptApiKeys();
  if (apiKeys.length > 0) {

    for (const entry of apiKeys) {
      if (timingSafeEqual(token, entry.token)) {
        return {
          valid: true,
          authorId: entry.authorId,
          user: {
            id: entry.authorId,
            username: process.env.GPT_AUTHOR_NAME || 'chatgpt',
          },
        };
      }
    }
    return { valid: false, error: 'Invalid token' };
  }

  // 3. 兼容旧配置：GPT_PUBLISH_TOKEN + GPT_AUTHOR_USER_ID
  const expectedToken = process.env.GPT_PUBLISH_TOKEN;
  const authorId = process.env.GPT_AUTHOR_USER_ID;

  if (!expectedToken || !authorId) {
    console.error('[GPT Auth] GPT_API_KEYS or GPT_PUBLISH_TOKEN/GPT_AUTHOR_USER_ID not configured');
    console.error('[GPT Auth] GPT_API_KEYS:', process.env.GPT_API_KEYS ? 'SET' : 'NOT SET');
    console.error('[GPT Auth] GPT_API_KEY:', process.env.GPT_API_KEY ? 'SET' : 'NOT SET');
    console.error('[GPT Auth] GPT_PUBLISH_TOKEN:', expectedToken ? 'SET' : 'NOT SET');
    console.error('[GPT Auth] GPT_AUTHOR_USER_ID:', authorId ? 'SET' : 'NOT SET');
    return { valid: false, error: 'GPT authentication not configured' };
  }

  if (!timingSafeEqual(token, expectedToken)) {
    return { valid: false, error: 'Invalid token' };
  }

  return {
    valid: true,
    authorId,
    user: {
      id: authorId,
      username: process.env.GPT_AUTHOR_NAME || 'chatgpt',
    },
  };
}

/**
 * 检查请求路径是否在 GPT 允许的范围内
 */
export function isPathAllowed(path: string): boolean {
  // 仅允许访问 /api/gpt/* 下的接口
  return path.startsWith('/api/gpt/');
}

/**
 * 完整的 GPT 请求认证校验
 */
export function authenticateGptRequest(req: NextRequest): {
  success: boolean;
  authorId?: string;
  user?: GptAuthUser;
  error?: string;
  status?: number;
} {
  // 1. 检查路径
  if (!isPathAllowed(req.nextUrl.pathname)) {
    return {
      success: false,
      status: 403,
      error: 'This endpoint is not accessible via GPT Actions',
    };
  }

  // 2. 验证 Token
  const result = verifyGptToken(req);
  if (!result.valid) {
    return {
      success: false,
      status: 401,
      error: result.error,
    };
  }

  return {
    success: true,
    authorId: result.authorId,
    user: result.user,
  };
}
