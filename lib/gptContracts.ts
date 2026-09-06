import { createHash } from 'crypto';

export class GptError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new GptError(400, 'Expected an object');
  return value as Record<string, unknown>;
}
export function keys(value: Record<string, unknown>, allowed: string[]) {
  const extra = Object.keys(value).find(k => !allowed.includes(k));
  if (extra) throw new GptError(400, `Unknown field: ${extra}`);
}
export function string(value: unknown, name: string, max = 2000, empty = false): string {
  if (typeof value !== 'string' || (!empty && !value.trim()) || value.length > max) {
    throw new GptError(400, `${name} must be a string${empty ? '' : ' (not empty)'} of at most ${max} characters`);
  }
  return value;
}
export function level(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 5) throw new GptError(400, 'access_level must be an integer from 1 to 5 (P/G/M/A/R)');
  return Number(value);
}
export function array(value: unknown, name: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new GptError(400, `${name} must be an array of at most ${max} items`);
  return value;
}
export function tags(value: unknown): string[] {
  const seen = new Set<string>();
  return array(value, 'tags', 10).map(t => string(t, 'tag', 80).trim()).filter(t => {
    const key = t.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
export function digest(value: unknown) { return createHash('sha256').update(canonical(value)).digest('hex'); }
export function articleId(ref: unknown, origin: string): string {
  const value = string(ref, 'article_ref', 2048).trim();
  if (/^[a-zA-Z0-9_-]{1,36}$/.test(value)) return value;
  try {
    const url = new URL(value);
    const match = /^\/article\/([a-zA-Z0-9_-]{1,36})\/?$/.exec(url.pathname);
    if (url.origin === new URL(origin).origin && match && !url.username && !url.password) return match[1];
  } catch { /* report the same validation error */ }
  throw new GptError(400, 'article_ref must be an article ID or a same-site /article/{id} URL');
}

export const ratingPolicy = {
  version: 'fishbowl-access-v1',
  levels: [
    { value: 1, label: 'P', meaning: '公开 Public' },
    { value: 2, label: 'G', meaning: '一般 General' },
    { value: 3, label: 'M', meaning: '会员 Member' },
    { value: 4, label: 'A', meaning: '成人 Adult' },
    { value: 5, label: 'R', meaning: '管理员 Root' },
  ],
  guidance: 'GPT assesses each block. Adult content uses A; administrator-only/private material uses R. M is membership, not an age rating. Use draft when uncertain. Titles, tags and excerpts must be safe public previews. Backend validates levels, not semantic accuracy.',
};
