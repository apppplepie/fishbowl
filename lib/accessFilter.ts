import type { FilterMode } from '@/app/contexts/AccessFilterContext';

/** 游客默认权限等级 */
export const GUEST_ACCESS_LEVEL = 2;

interface AccessLike {
  visible_access_level?: number | null;
  visibleAccessLevel?: number | null;
  max_access_level?: number | null;
  maxAccessLevel?: number | null;
  full_access_level?: number | null;
  fullAccessLevel?: number | null;
}

/**
 * 列表页统一的权限过滤：
 * - study  学习模式：只看完全公开的
 * - strict 严格模式：用户等级 >= 完整阅读等级
 * - loose  宽松模式：用户等级 >= 可见等级
 */
export function matchesAccessFilter(
  article: AccessLike,
  filterMode: FilterMode,
  userLevel: number
): boolean {
  const visibleLevel =
    article.visible_access_level ??
    article.visibleAccessLevel ??
    article.max_access_level ??
    article.maxAccessLevel ??
    1;
  const fullLevel = article.full_access_level ?? article.fullAccessLevel ?? visibleLevel;

  if (filterMode === 'study') return fullLevel === 1;
  if (filterMode === 'strict') return userLevel >= fullLevel;
  return userLevel >= visibleLevel;
}
