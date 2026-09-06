import { query } from '@/lib/db';
import { transaction, type Sql } from './gptDb';
import { level, GptError } from './gptContracts';
import { downloadRemoteImage, storeImage } from './gptMedia';
import { cleanMarkdownForExcerpt } from '@/lib/articleUtils';
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
  access_level?: number;
  media_id?: string;
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
  status?: 'draft' | 'published';
}

export interface CreateGptArticleResult {
  articleId: string;
  articleType: ArticleType;
  categoryId: string;
  blockCount: number;
  imageCount: number;
  tags: string[];
}

const defaultQuery: Sql = query;

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

export async function getGptAuthorName(authorId: string, query: Sql = defaultQuery): Promise<string> {
  const users = await query<any[]>(
    'SELECT username, display_name FROM users WHERE id = ? LIMIT 1',
    [authorId]
  ).catch(() => []);

  const user = users[0];
  return cleanString(user?.username) || cleanString(user?.display_name) || 'chatgpt';
}

async function getNextOrderIndex(categoryId: string, query: Sql): Promise<number> {
  const rows = await query<any[]>(
    'SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order FROM articles WHERE category_id = ?',
    [categoryId]
  );
  return Number(rows[0]?.next_order || 1);
}

async function getDefaultCategoryId(query: Sql): Promise<string> {
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

export async function resolveCategoryId(categoryId?: string | null, query: Sql = defaultQuery): Promise<string> {
  const cleaned = cleanString(categoryId);
  if (cleaned) {
    const existing = await query<any[]>('SELECT id FROM categories WHERE id = ? LIMIT 1', [cleaned]);
    if (existing.length > 0) return existing[0].id;
  }

  return getDefaultCategoryId(query);
}

async function downloadImage(imageUrl: string): Promise<{url: string; mediaId: string | null}> {
  let localUrl = imageUrl;
  if (process.env.GPT_SITE_URL && imageUrl.startsWith('https://')) {
    const parsed = new URL(imageUrl);
    if (parsed.origin === new URL(process.env.GPT_SITE_URL).origin) localUrl = parsed.pathname;
  }
  if (localUrl.startsWith('/') && !localUrl.startsWith('//')) {
    const rows = await query<Array<{id: string; url: string}>>('SELECT id, url FROM media WHERE url = ? LIMIT 1', [localUrl]);
    if (!rows.length) throw new GptError(400, 'Unknown uploaded image URL');
    return {url: rows[0].url, mediaId: rows[0].id};
  }
  const media = await storeImage(await downloadRemoteImage(imageUrl));
  return {url: media.url, mediaId: media.media_id};
}

function buildExcerpt(summary: string | undefined, excerpt: string | null | undefined, blocks: GptBlockInput[]): string {
  const explicit = cleanMarkdownForExcerpt(excerpt || summary || '');
  if (explicit) return explicit.slice(0, 500);

  const firstText = blocks.find(block => block.type === 'text' && cleanString(block.content));
  if (!firstText) return '';
  const plain = cleanMarkdownForExcerpt(firstText.content);
  return plain.length > 150 ? `${plain.slice(0, 150)}...` : plain;
}

export async function insertTags(articleId: string, tags: string[], query: Sql = defaultQuery): Promise<void> {
  for (const tagName of tags) {
    let tagId: string;
    const existing = await query<any[]>('SELECT id FROM tags WHERE name = ? LIMIT 1', [tagName]);

    if (existing.length > 0) {
      tagId = existing[0].id;
    } else {
      tagId = uuidv4();
      await query('INSERT INTO tags (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = name', [tagId, tagName]);
      const canonical = await query<Array<{id: string}>>('SELECT id FROM tags WHERE name = ? LIMIT 1', [tagName]);
      tagId = canonical[0].id;
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
    if (block?.access_level !== undefined) level(block.access_level);
    if (!block || !['text', 'code', 'image'].includes(block.type)) {
      throw new Error(`blocks[${index}].type must be text, code, or image`);
    }
    if ((block.type === 'text' || block.type === 'code') && !cleanString(block.content)) {
      throw new Error(`blocks[${index}].content is required for ${block.type} blocks`);
    }
    if (block.type === 'image') {
      const url = cleanString(block.image?.url) || cleanString(block.imageUrl);
      if (!url && !block.media_id) throw new Error(`blocks[${index}].image.url is required for image blocks`);
    }
  });
}

export async function createGptArticle(input: CreateGptArticleInput, execute?: Sql): Promise<CreateGptArticleResult> {
  const title = cleanString(input.title);
  if (!title) throw new Error('title is required');
  if (title.length > 255) throw new GptError(400, 'title is too long; max 255 characters');
  validateBlocks(input.blocks);
  if (!execute) {
    // Register network/file resources before acquiring a transaction connection.
    const blocks: GptBlockInput[] = [];
    for (const block of input.blocks) {
      if (block.type === 'image' && !block.media_id) {
        const media = await downloadImage(cleanString(block.image?.url) || cleanString(block.imageUrl));
        blocks.push({...block, media_id: media.mediaId!});
      } else blocks.push(block);
    }
    return transaction(sql => createGptArticle({...input, blocks}, sql));
  }
  const query = execute;

  const articleId = uuidv4();
  const authorName = cleanString(input.authorName) || await getGptAuthorName(input.authorId, query);
  const momentType = input.momentType ? validateMomentType(input.momentType) : undefined;
  const articleType = resolveArticleType(input.articleType, momentType);
  const categoryId = await resolveCategoryId(input.categoryId, query);
  const orderIndex = await getNextOrderIndex(categoryId, query);
  const now = new Date();
  const excerpt = buildExcerpt(input.summary, input.excerpt, input.blocks);
  const tags = uniqueCleanTags([...(input.tags || []), ...(momentType ? [`moment:${momentType}`] : [])]);

  const materializedBlocks: Array<{
    type: 'text' | 'code' | 'image';
    content: Record<string, unknown>;
    mediaId: string | null;
    accessLevel: number;
  }> = [];

  for (const block of input.blocks) {
    if (block.type === 'text') {
      materializedBlocks.push({
        type: 'text',
        accessLevel: block.access_level ?? 1,
        content: { content: block.content },
        mediaId: null,
      });
    } else if (block.type === 'code') {
      materializedBlocks.push({
        type: 'code',
        accessLevel: block.access_level ?? 1,
        content: {
          code: block.content,
          language: cleanString(block.language) || 'text',
          title: cleanString(block.title),
        },
        mediaId: null,
      });
    } else {
      const registered = block.media_id
        ? await query<Array<{id: string; url: string}>>('SELECT id, url FROM media WHERE id = ?', [block.media_id])
        : [];
      if (!registered.length) throw new GptError(400, 'Invalid media_id; register images before a transaction');
      const image = { url: registered[0].url, mediaId: registered[0].id };
      materializedBlocks.push({
        type: 'image',
        accessLevel: block.access_level ?? 1,
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
      input.status === 'draft' ? null : now,
      excerpt,
      articleType,
      categoryId,
      orderIndex,
      input.status ?? 'published',
      Math.min(...materializedBlocks.map(b => b.accessLevel)),
      Math.max(...materializedBlocks.map(b => b.accessLevel)),
      coverImage,
      firstImage?.accessLevel ?? 1,
    ]
  );

  for (let i = 0; i < materializedBlocks.length; i++) {
    const block = materializedBlocks[i];
    const blockId = uuidv4();

    await query(
      `INSERT INTO blocks (id, type, content, author, access_level, media_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [blockId, block.type, JSON.stringify(block.content), authorName, block.accessLevel, block.mediaId]
    );

    await query(
      'INSERT INTO article_blocks (article_id, block_id, `order`) VALUES (?, ?, ?)',
      [articleId, blockId, i]
    );
  }

  await insertTags(articleId, tags, query);

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
