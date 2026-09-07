import type { LibraryViewKey } from './types';

/**
 * 列表状态缓存：在视角/分类之间来回切换时直接复原，不重新请求也不重新测量，
 * 这样才有「一直待在同一个页面」的手感。缓存只活在内存里，刷新即失效。
 */
export interface FeedSnapshot {
  cards: any[];
  offset: number;
  hasMore: boolean;
  searchedOnServer: boolean;
  scrollTop: number;
}

const MAX_ENTRIES = 12;
const store = new Map<string, FeedSnapshot>();

/** viewport：手机/电脑布局不同（电脑有梗概块），必须拆开缓存，不然会串台 */
export function feedKey(
  view: LibraryViewKey,
  categoryId: string | null,
  keyword: string,
  viewport: 'mobile' | 'desktop' = 'desktop'
): string {
  return `${view}|${categoryId ?? ''}|${keyword}|${viewport}`;
}

export function readFeed(key: string): FeedSnapshot | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  // LRU：命中的挪到队尾
  store.delete(key);
  store.set(key, hit);
  return hit;
}

export function writeFeed(key: string, snapshot: FeedSnapshot): void {
  store.delete(key);
  store.set(key, snapshot);
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export function patchFeed(key: string, patch: Partial<FeedSnapshot>): void {
  const hit = store.get(key);
  if (hit) store.set(key, { ...hit, ...patch });
}

/** 发布/删除之后让缓存失效：传视角则只清该视角，不传则全清 */
export function invalidateFeed(view?: LibraryViewKey): void {
  if (!view) {
    store.clear();
    return;
  }
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(`${view}|`)) store.delete(key);
  }
}
