import { query } from '@/lib/db';
import { generateBlurDataURL } from '@/lib/blur';
import crypto from 'crypto';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import sizeOf from 'image-size';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type ArticleType = 'default' | 'text' | 'image' | 'code' | 'diary' | 'drawing';
export type MomentType =
  | 'brainwave'
  | 'knowledge'
  | 'story_seed'
  | 'dev_note'
  | 'debug_note'
  | 'life_note'
  | 'quote'
  | 'mixed';

export interface GptBlockInput {
  type: 'text' | 'code' | 'image';
  content?: string | null;
  language?: string | null;
  image?: {
    url?: string;
    name?: string;
    description?: string | null;
  } | null;
  imageUrl?: string;
  title?: string;
  description?: string;
}

export interface CreateGptArticleInput {
  title: string;
  authorId: string;
  authorName?: string;
  summary?: string;
  excerpt?: string | null;
  categoryId?: string | null;
  tags?: string[];
  blocks: GptBlockInput[];
  articleType?: ArticleType;
  momentType?: MomentType;
}

export interface CreateGptArticleResult {
  articleId: string;
  articleType: ArticleType;
  categoryId: string;
  blockCount: number;
  imageCount: number;
  tags: string[];
}

const ARTICLE_TYPES = new Set<ArticleType>(['default', 'text', 'image', 'code', 'diary', 'drawing']);

const MOMENT_TYPE_TO_ARTICLE_TYPE: Record<MomentType, ArticleType> = {
  brainwave: 'text',
  knowledge: 'text',
  story_seed: 'text',
  dev_note: 'code',
  debug_note: 'code',
  life_note: 'diary',
  quote: 'text',
  mixed: 'text',
};

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueCleanTags(tags: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const cleaned = cleanString(tag).slice(0, 80);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= 10) break;
  }

  return result;
}

export function resolveArticleType(articleType?: string, momentType?: string): ArticleType {
  if (articleType && ARTICLE_TYPES.has(articleType as ArticleType)) {
    return articleType as ArticleType;
  }

  if (momentType && momentType in MOMENT_TYPE_TO_ARTICLE_TYPE) {
    return MOMENT_TYPE_TO_ARTICLE_TYPE[momentType as MomentType];
  }

  return 'text';
}

export function validateMomentType(momentType?: string): MomentType | undefined {
  if (!momentType) return undefined;
  if (momentType in MOMENT_TYPE_TO_ARTICLE_TYPE) return momentType as MomentType;
  throw new Error(`moment_type must be one of: ${Object.keys(MOMENT_TYPE_TO_ARTICLE_TYPE).join(', ')}`);
}

export async function getGptAuthorName(authorId: string): Promise<string> {
  const users = await query<any[]>(
    'SELECT username, name, display_name FROM users WHERE id = ? LIMIT 1',
    [authorId]
  ).catch(() => []);

  const user = users[0];
  return cleanString(user?.username) || cleanString(user?.name) || cleanString(user?.display_name) || 'chatgpt';
}

async function getNextOrderIndex(categoryId: string): Promise<number> {
  const rows = await query<any[]>(
    'SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order FROM articles WHERE category_id = ?',
    [categoryId]
  );
  return Number(rows[0]?.next_order || 1);
}

async function getDefaultCategoryId(): Promise<string> {
  const existing = await query<any[]>(
    "SELECT id FROM categories WHERE id = 'cat_uncategorized' OR name = '杂物间' LIMIT 1"
  );
  if (existing.length > 0) return existing[0].id;

  const orderRows = await query<any[]>('SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order FROM categories');
  const orderIndex = Number(orderRows[0]?.next_order || 1);

  await query(
    `INSERT INTO categories (id, name, parent_id, order_index, depth, path)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['cat_uncategorized', '杂物间', null, orderIndex, 1, String(orderIndex).padStart(6, '0')]
  );

  return 'cat_uncategorized';
}

export async function resolveCategoryId(categoryId?: string | null): Promise<string> {
  const cleaned = cleanString(categoryId);
  if (cleaned) {
    const existing = await query<any[]>('SELECT id FROM categories WHERE id = ? LIMIT 1', [cleaned]);
    if (existing.length > 0) return existing[0].id;
  }

  return getDefaultCategoryId();
}

async function downloadImage(imageUrl: string): Promise<{
  url: string;
  mediaId: string | null;
}> {
  const parsed = new URL(imageUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('image.url must be an http(s) URL');
  }

  const response = await fetch(parsed.toString(), {
    headers: { 'User-Agent': 'Fishbowl-GPT-Actions/1.0' },
  });
  if (!response.ok) {
    throw new Error(`image download failed: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType && !contentType.startsWith('image/')) {
    throw new Error(`image URL did not return an image: ${contentType}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 15 * 1024 * 1024) {
    throw new Error('image is too large; max 15MB');
  }

  const dimensions = sizeOf(buffer);
  const ext = dimensions.type ? `.${dimensions.type}` : path.extname(parsed.pathname) || '.jpg';
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  const existing = await query<any[]>('SELECT id, url FROM media WHERE sha256 = ? LIMIT 1', [sha256]).catch(() => []);
  if (existing.length > 0) {
    return { url: existing[0].url, mediaId: existing[0].id };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', String(year), month);
  if (!existsSync(uploadDir)) {
    await fs.mkdir(uploadDir, { recursive: true });
  }

  const filename = `${sha256.slice(0, 20)}${ext}`;
  await fs.writeFile(path.join(uploadDir, filename), buffer);

  const mediaId = uuidv4();
  const localUrl = `/uploads/${year}/${month}/${filename}`;
  const width = dimensions.width ?? null;
  const height = dimensions.height ?? null;
  const blurDataUrl = await generateBlurDataURL(buffer).catch(() => null);

  await query(
    `INSERT INTO media (id, url, mime, width, height, aspect_ratio, size_bytes, sha256, source, blur_data_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      mediaId,
      localUrl,
      dimensions.type ? `image/${dimensions.type}` : contentType || 'image/jpeg',
      width,
      height,
      width && height ? Number((width / height).toFixed(6)) : null,
      buffer.length,
      sha256,
      'chatgpt_action',
      blurDataUrl,
    ]
  );

  return { url: localUrl, mediaId };
}

function buildExcerpt(summary: string | undefined, excerpt: string | null | undefined, blocks: GptBlockInput[]): string {
  const explicit = cleanString(excerpt) || cleanString(summary);
  if (explicit) return explicit.slice(0, 500);

  const firstText = blocks.find(block => block.type === 'text' && cleanString(block.content));
  if (!firstText) return '';
  const plain = cleanString(firstText.content).replace(/[#*`[\]]/g, '').replace(/\s+/g, ' ');
  return plain.length > 150 ? `${plain.slice(0, 150)}...` : plain;
}

async function insertTags(articleId: string, tags: string[]): Promise<void> {
  for (const tagName of tags) {
    let tagId: string;
    const existing = await query<any[]>('SELECT id FROM tags WHERE name = ? LIMIT 1', [tagName]);

    if (existing.length > 0) {
      tagId = existing[0].id;
    } else {
      tagId = uuidv4();
      await query('INSERT INTO tags (id, name) VALUES (?, ?)', [tagId, tagName]);
    }

    await query('INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)', [articleId, tagId]);
  }
}

function validateBlocks(blocks: GptBlockInput[]): void {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error('blocks must be a non-empty array');
  }

  if (blocks.length > 80) {
    throw new Error('blocks is too long; max 80 blocks');
  }

  blocks.forEach((block, index) => {
    if (!block || !['text', 'code', 'image'].includes(block.type)) {
      throw new Error(`blocks[${index}].type must be text, code, or image`);
    }
    if ((block.type === 'text' || block.type === 'code') && !cleanString(block.content)) {
      throw new Error(`blocks[${index}].content is required for ${block.type} blocks`);
    }
    if (block.type === 'image') {
      const url = cleanString(block.image?.url) || cleanString(block.imageUrl);
      if (!url) throw new Error(`blocks[${index}].image.url is required for image blocks`);
    }
  });
}

export async function createGptArticle(input: CreateGptArticleInput): Promise<CreateGptArticleResult> {
  const title = cleanString(input.title);
  if (!title) throw new Error('title is required');

  validateBlocks(input.blocks);

  const articleId = uuidv4();
  const authorName = cleanString(input.authorName) || await getGptAuthorName(input.authorId);
  const momentType = input.momentType ? validateMomentType(input.momentType) : undefined;
  const articleType = resolveArticleType(input.articleType, momentType);
  const categoryId = await resolveCategoryId(input.categoryId);
  const orderIndex = await getNextOrderIndex(categoryId);
  const now = new Date();
  const excerpt = buildExcerpt(input.summary, input.excerpt, input.blocks);
  const tags = uniqueCleanTags([...(input.tags || []), ...(momentType ? [`moment:${momentType}`] : [])]);

  const materializedBlocks: Array<{
    type: 'text' | 'code' | 'image';
    content: Record<string, unknown>;
    mediaId: string | null;
  }> = [];

  for (const block of input.blocks) {
    if (block.type === 'text') {
      materializedBlocks.push({
        type: 'text',
        content: { content: cleanString(block.content) },
        mediaId: null,
      });
    } else if (block.type === 'code') {
      materializedBlocks.push({
        type: 'code',
        content: {
          code: cleanString(block.content),
          language: cleanString(block.language) || 'text',
          title: cleanString(block.title),
        },
        mediaId: null,
      });
    } else {
      const remoteUrl = cleanString(block.image?.url) || cleanString(block.imageUrl);
      const image = await downloadImage(remoteUrl);
      materializedBlocks.push({
        type: 'image',
        content: {
          url: image.url,
          title: cleanString(block.image?.name) || cleanString(block.title),
          description: cleanString(block.image?.description) || cleanString(block.description) || cleanString(block.content),
          media_id: image.mediaId,
        },
        mediaId: image.mediaId,
      });
    }
  }

  const firstImage = materializedBlocks.find(block => block.type === 'image');
  const coverImage = firstImage ? JSON.stringify(firstImage.content) : null;
  const imageCount = materializedBlocks.filter(block => block.type === 'image').length;

  await query(
    `INSERT INTO articles
     (id, title, author, author_id, published_at, excerpt, type, category_id, order_index,
      status, visible_access_level, full_access_level, cover_image, cover_access_level, likes, shares, comments)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
    [
      articleId,
      title,
      authorName,
      input.authorId,
      now,
      excerpt,
      articleType,
      categoryId,
      orderIndex,
      'published',
      1,
      1,
      coverImage,
      1,
    ]
  );

  for (let i = 0; i < materializedBlocks.length; i++) {
    const block = materializedBlocks[i];
    const blockId = uuidv4();

    await query(
      `INSERT INTO blocks (id, type, content, author, access_level, media_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [blockId, block.type, JSON.stringify(block.content), authorName, 1, block.mediaId]
    );

    await query(
      'INSERT INTO article_blocks (article_id, block_id, `order`) VALUES (?, ?, ?)',
      [articleId, blockId, i]
    );
  }

  await insertTags(articleId, tags);

  return {
    articleId,
    articleType,
    categoryId,
    blockCount: materializedBlocks.length,
    imageCount,
    tags,
  };
}

export function markdownToBlocks(content: string, images: Array<{ url: string; name?: string; description?: string }> = []): GptBlockInput[] {
  const blocks: GptBlockInput[] = cleanString(content)
    .split(/\n\s*\n/)
    .map(part => cleanString(part))
    .filter(Boolean)
    .map(part => ({ type: 'text', content: part }));

  for (const image of images) {
    blocks.push({
      type: 'image',
      image: {
        url: image.url,
        name: image.name,
        description: image.description,
      },
    });
  }

  return blocks;
}
