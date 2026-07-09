/**
 * 文章发布工具函数（复用 GPT Actions 和原有发布逻辑）
 */
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export interface BlockData {
  id?: string;
  type: 'text' | 'image' | 'code';
  content?: string;      // text 类型
  code?: string;         // code 类型
  language?: string;     // code 类型
  imageUrl?: string;     // image 类型
  title?: string;
  description?: string;
  author?: string;
  access_level?: number;
  media_id?: string | null;
  order: number;
}

export interface CreateArticleOptions {
  title: string;
  author: string;
  authorId: string;
  blocks: BlockData[];
  tags?: string[];
  category_id?: string | null;
  excerpt?: string;
  status?: 'draft' | 'published';
}

export interface CreateArticleResult {
  success: boolean;
  articleId?: string;
  error?: string;
}

/**
 * 计算文章可见等级和完整访问等级
 */
function calculateAccessLevels(blocks: BlockData[]): {
  visibleAccessLevel: number;
  fullAccessLevel: number;
} {
  if (blocks.length === 0) {
    return { visibleAccessLevel: 1, fullAccessLevel: 1 };
  }
  const accessLevels = blocks.map(block => block.access_level || 1);
  return {
    visibleAccessLevel: Math.min(...accessLevels),
    fullAccessLevel: Math.max(...accessLevels),
  };
}

/**
 * 清理 Markdown 格式符号，生成纯文本摘要
 * 去掉：标题、粗体、斜体、代码、删除线、链接、图片、引用、列表标记
 */
export function cleanMarkdownForExcerpt(text: unknown): string {
  let result = (typeof text === 'string' ? text : '') || '';

  // 1. 移除图片：![alt](url)
  result = result.replace(/!\[.*?\]\(.*?\)/g, '');

  // 2. 保留链接文字，移除链接标记：[text](url) → text
  result = result.replace(/\[([^\]]*?)\]\(.*?\)/g, '$1');

  // 3. 移除代码块标记 ```
  result = result.replace(/```[\s\S]*?```/g, '');

  // 4. 移除行内代码标记，保留代码内容：`code` → code
  result = result.replace(/`([^`]+)`/g, '$1');

  // 5. 移除标题标记：#  ##  ###  etc.
  result = result.replace(/^#{1,6}\s+/gm, '');

  // 6. 移除引用标记：>
  result = result.replace(/^>\s*/gm, '');

  // 7. 移除无序列表标记：- + *
  result = result.replace(/^[-+*]\s+/gm, '');

  // 8. 移除有序列表标记：1.  2.  etc.
  result = result.replace(/^\d+\.\s+/gm, '');

  // 9. 移除粗体、斜体、删除线标记：** __ * _ ~~
  result = result.replace(/(\*\*|__|\*|_|~~)/g, '');

  // 10. 压缩多个空白为单个空格
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * 根据文章类型自动生成摘要
 */
function generateExcerpt(blocks: BlockData[], articleType: string): string {
  if (articleType === 'drawing') {
    const firstTextBlock = blocks.find(b => b.type === 'text' && b.content);
    if (firstTextBlock?.content) {
      const plain = cleanMarkdownForExcerpt(firstTextBlock.content);
      return plain.length > 150 ? `${plain.slice(0, 150)}...` : plain;
    }
    const imageCount = blocks.filter(b => b.type === 'image').length;
    return `一组绘画作品（${imageCount} 张）`;
  }

  if (articleType === 'image') {
    const firstImageBlock = blocks.find(b => b.type === 'image');
    if (firstImageBlock?.description) return cleanMarkdownForExcerpt(firstImageBlock.description);
    if (firstImageBlock?.title) return cleanMarkdownForExcerpt(firstImageBlock.title);
    return '一组图片分享';
  }

  if (articleType === 'code') {
    const firstTextBlock = blocks.find(b => b.type === 'text' && b.content);
    if (firstTextBlock?.content) {
      const plain = cleanMarkdownForExcerpt(firstTextBlock.content);
      return plain.length > 150 ? `${plain.slice(0, 150)}...` : plain;
    }
    const codeCount = blocks.filter(b => b.type === 'code').length;
    return `包含 ${codeCount} 个代码示例的技术文章`;
  }

  // 默认 text 类型
  const firstTextBlock = blocks.find(b => b.type === 'text' && b.content);
  if (firstTextBlock?.content) {
    const plain = cleanMarkdownForExcerpt(firstTextBlock.content);
    return plain.length > 150 ? `${plain.slice(0, 150)}...` : plain;
  }

  return '';
}

/**
 * 识别文章类型
 */
function detectArticleType(blocks: BlockData[]): 'text' | 'image' | 'code' | 'drawing' {
  const imageBlockCount = blocks.filter(b => b.type === 'image').length;
  const hasCodeBlock = blocks.some(b => b.type === 'code');

  if (imageBlockCount >= 3) return 'drawing';
  if (imageBlockCount > 0) return 'image';
  if (hasCodeBlock) return 'code';
  return 'text';
}

/**
 * 创建文章（核心逻辑，可复用）
 */
export async function createArticle(options: CreateArticleOptions): Promise<CreateArticleResult> {
  const {
    title,
    author,
    authorId,
    blocks,
    tags = [],
    category_id = null,
    excerpt: customExcerpt,
    status = 'published',
  } = options;

  const articleId = uuidv4();
  const now = new Date();

  try {
    // 1. 识别文章类型
    const articleType = detectArticleType(blocks);

    // 2. 生成摘要
    const excerpt = customExcerpt || generateExcerpt(blocks, articleType);

    // 3. 计算访问等级
    const { visibleAccessLevel, fullAccessLevel } = calculateAccessLevels(blocks);

    // 4. 处理封面图片
    let coverImage: any = null;
    let coverAccessLevel = 1;

    const imageBlocks = blocks.filter(b => b.type === 'image');
    if (imageBlocks.length > 0) {
      const lowestAccessImage = imageBlocks.sort(
        (a, b) => (a.access_level || 1) - (b.access_level || 1)
      )[0];

      if (lowestAccessImage?.imageUrl) {
        coverImage = JSON.stringify({
          url: lowestAccessImage.imageUrl,
          title: lowestAccessImage.title || '',
          description: lowestAccessImage.description || '',
        });
        coverAccessLevel = lowestAccessImage.access_level || 1;
      }
    }

    // 5. 插入文章记录
    await query(
      `INSERT INTO articles
       (id, title, author, author_id, published_at, excerpt, type, category_id, order_index, status, visible_access_level, full_access_level, cover_image, cover_access_level, likes, shares, comments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
      [
        articleId,
        title,
        author,
        authorId,
        now,
        excerpt,
        articleType,
        category_id || 'cat_uncategorized',
        0, // order_index - GPT 发布的默认排最后
        status,
        visibleAccessLevel,
        fullAccessLevel,
        coverImage,
        coverAccessLevel,
      ]
    );

    // 6. 插入内容块
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockId = block.id || uuidv4();

      let blockContent: any = {};

      if (block.type === 'text') {
        blockContent = { content: block.content || '' };
      } else if (block.type === 'image') {
        const mediaId = block.media_id ?? null;
        blockContent = {
          url: block.imageUrl || '',
          title: block.title || '',
          description: block.description || '',
          ...(mediaId != null && { media_id: mediaId }),
        };
      } else if (block.type === 'code') {
        blockContent = {
          language: block.language || 'javascript',
          code: block.code || '',
          title: block.title || '',
        };
      }

      // 插入块
      await query(
        `INSERT INTO blocks (id, type, content, author, access_level, media_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE content = VALUES(content), access_level = VALUES(access_level), media_id = VALUES(media_id)`,
        [
          blockId,
          block.type,
          JSON.stringify(blockContent),
          author,
          block.access_level || 1,
          block.media_id || null,
        ]
      );

      // 建立关联
      await query(
        `INSERT INTO article_blocks (article_id, block_id, \`order\`) VALUES (?, ?, ?)`,
        [articleId, blockId, i]
      );
    }

    // 7. 处理标签
    for (const tagName of tags) {
      if (!tagName || typeof tagName !== 'string') continue;

      const trimmedTagName = tagName.trim();
      if (!trimmedTagName) continue;

      let tagId: string;
      const existingTags = await query<any[]>(
        'SELECT id FROM tags WHERE name = ? LIMIT 1',
        [trimmedTagName]
      );

      if (existingTags.length > 0) {
        tagId = existingTags[0].id;
      } else {
        tagId = uuidv4();
        await query(
          'INSERT INTO tags (id, name) VALUES (?, ?)',
          [tagId, trimmedTagName]
        );
      }

      try {
        await query(
          'INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)',
          [articleId, tagId]
        );
      } catch (error: any) {
        if (error.code !== 'ER_DUP_ENTRY') throw error;
      }
    }

    console.log(`[GPT Actions] 文章发布成功: ${title} by ${author} (ID: ${articleId})`);

    return { success: true, articleId };
  } catch (error: any) {
    console.error('[GPT Actions] 文章发布失败:', error);
    return { success: false, error: error.message };
  }
}
