import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || '0OooOoO00oO0HR0313R1N3OoO0oOoO0oOo0';

export const SESSION_COOKIE_NAME = 'fishbowl-session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface JWTPayload {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
  max_access_level?: number;
  type?: 'session';
}

export function generateSession(payload: Omit<JWTPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'session' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
}

export function verifySession(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload;
    return decoded.type === 'session' ? decoded : null;
  } catch {
    return null;
  }
}

export function getCurrentUser(req: NextRequest): JWTPayload | null {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? verifySession(token) : null;
}

export function hasRole(user: JWTPayload | null, roles: Array<'admin' | 'moderator' | 'user'>): boolean {
  return !!user && roles.includes(user.role);
}

export function isAdmin(user: JWTPayload | null): boolean {
  return hasRole(user, ['admin']);
}

export function canModerate(user: JWTPayload | null): boolean {
  return hasRole(user, ['admin', 'moderator']);
}

export function canEditArticle(
  user: JWTPayload | null,
  articleAuthor: string | null,
  articleAuthorId: string | null
): boolean {
  if (!user || user.role === 'user') return false;
  if (user.role === 'admin') return true;
  return articleAuthor === user.username || articleAuthorId === user.id;
}
