import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

// JWT密钥（生产环境应该放在环境变量中）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface JWTPayload {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
  max_access_level?: number;
}

/**
 * 生成JWT Token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // 7天过期
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
 * 从请求中提取Token
 */
export function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return null;
  }
  
  // 支持 "Bearer token" 格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
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
 * - 普通用户：必须是作者才能编辑
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
  
  // 版主和普通用户必须是作者才能编辑
  const isAuthor = 
    (articleAuthor && articleAuthor === user.username) ||
    (articleAuthorId && articleAuthorId === user.id);
  
  return isAuthor;
}

