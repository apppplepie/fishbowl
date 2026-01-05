import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

// JWT密钥（生产环境应该放在环境变量中）
const JWT_SECRET = process.env.JWT_SECRET || '0OooOoO00oO0HR0313R1N3OoO0oOoO0oOo0';

// Token过期时间配置（统一管理，避免错开）
export const TOKEN_EXPIRATION = {
  // Access Token过期时间（JWT格式）
  ACCESS_TOKEN_JWT: '1h', // JWT过期时间：1小时
  // Access Token Cookie过期时间（秒），略大于JWT过期时间，避免边界情况
  ACCESS_TOKEN_COOKIE: 60 * 60 + 300, // 1小时 + 5分钟 = 3900秒
  
  // Refresh Token过期时间（JWT格式）
  REFRESH_TOKEN_JWT: '7d', // JWT过期时间：7天
  // Refresh Token Cookie过期时间（秒），略大于JWT过期时间
  REFRESH_TOKEN_COOKIE: 60 * 60 * 24 * 7 + 3600, // 7天 + 1小时 = 604800 + 3600秒
} as const;

export interface JWTPayload {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
  max_access_level?: number;
  type?: 'access' | 'refresh'; // Token类型
}

/**
 * 生成Access Token和Refresh Token
 */
export function generateTokens(payload: Omit<JWTPayload, 'type'>): {
  accessToken: string;
  refreshToken: string;
} {
  const now = Math.floor(Date.now() / 1000);

  // 生成Access Token（1h过期）
  const accessTokenPayload: JWTPayload = {
    ...payload,
    type: 'access'
  };

  const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION.ACCESS_TOKEN_JWT,
  });

  // 生成Refresh Token（7天过期）
  const refreshTokenPayload: JWTPayload = {
    ...payload,
    type: 'refresh'
  };

  const refreshToken = jwt.sign(refreshTokenPayload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION.REFRESH_TOKEN_JWT,
  });

  return {
    accessToken,
    refreshToken
  };
}

/**
 * 生成单个JWT Token（向后兼容）
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION.ACCESS_TOKEN_JWT,
  });
}

/**
 * 验证JWT Token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

/**
 * 验证Refresh Token
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    // 确保是refresh token
    if (decoded.type !== 'refresh') {
      console.error('Token类型不匹配: 期望refresh token');
      return null;
    }
    return decoded;
  } catch (error) {
    console.error('Refresh Token验证失败:', error);
    return null;
  }
}

/**
 * 使用Refresh Token刷新Access Token
 */
export function refreshAccessToken(refreshToken: string): {
  accessToken: string;
  refreshToken: string;
} | null {
  const decoded = verifyRefreshToken(refreshToken);

  if (!decoded) {
    return null;
  }

  // 从refresh token中提取用户信息，只保留必要的字段，排除JWT标准字段（exp, iat等）
  const userPayload: Omit<JWTPayload, 'type'> = {
    id: decoded.id,
    username: decoded.username,
    email: decoded.email,
    role: decoded.role,
    max_access_level: decoded.max_access_level,
  };

  // 生成新的token对
  return generateTokens(userPayload);
}

/**
 * 从请求中提取Token（从HttpOnly cookie读取）
 */
export function extractToken(req: NextRequest): string | null {
  // 优先从 cookie 读取 access-token
  const accessToken = req.cookies.get('access-token')?.value;
  if (accessToken) {
    return accessToken;
  }
  
  // 兼容：如果 cookie 中没有，尝试从 Authorization header 读取（向后兼容）
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * 从请求中获取当前用户信息
 */
export function getCurrentUser(req: NextRequest): JWTPayload | null {
  const token = extractToken(req);
  
  if (!token) {
    return null;
  }
  
  return verifyToken(token);
}

/**
 * 检查用户是否有特定角色
 */
export function hasRole(user: JWTPayload | null, roles: Array<'admin' | 'moderator' | 'user'>): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * 检查是否是管理员
 */
export function isAdmin(user: JWTPayload | null): boolean {
  return hasRole(user, ['admin']);
}

/**
 * 检查是否有管理权限（管理员或版主）
 */
export function canModerate(user: JWTPayload | null): boolean {
  return hasRole(user, ['admin', 'moderator']);
}

/**
 * 检查用户是否可以编辑指定文章
 * - 管理员：可以编辑任何文章
 * - 版主：必须是作者才能编辑
 * - 普通用户：不能编辑文章（只能发评论）
 */
export function canEditArticle(
  user: JWTPayload | null,
  articleAuthor: string | null,
  articleAuthorId: string | null
): boolean {
  if (!user) return false;
  
  // 管理员可以编辑任何文章
  if (user.role === 'admin') {
    return true;
  }
  
  // 普通用户不能编辑文章
  if (user.role === 'user') {
    return false;
  }
  
  // 版主必须是作者才能编辑
  return (
    (articleAuthor !== null && articleAuthor === user.username) ||
    (articleAuthorId !== null && articleAuthorId === user.id)
  );
}

