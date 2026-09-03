/**
 * 文章 API 路由
 * POST /api/articles - 发布新文章
 * GET /api/articles - 获取文章列表
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 类型定义
interface Block {
  id?: string;
  type: 'text' | 'image' | 'code';
  content?: string;
  code?: string;
  language?: string;
  imageUrl?: string;
  title?: string;
  description?: string;
  author?: string;
  order: number;
  access_level?: number;
  media_id?: string | null;
  mediaId?: string | null;
}

interface CreateArticleRequest {
  title: string;
  author: string;
  excerpt?: string;
  blocks: Block[];
  tags?: string[];
  category_id?: string | null;
  order_index?: number;
  visible_access_level?: number; // 宽松模式：文章可见的最低权限门槛（所有blocks的最小值）
  full_access_level?: number; // 严格模式：完整阅读所需的权限等级（所有blocks的最大值）
  max_access_level?: number; // 向后兼容，已废弃
  cover_image?: any | null; // 封面图片对象，由前端指定或后端自动计算
  cover_access_level?: number; // 封面访问等级，默认为1
  status?: 'draft' | 'published';
  type?: 'text' | 'image' | 'code' | 'drawing';
}

/**
 * POST - 发布文章（需要登录）
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户登录 & 角色（仅管理员或版主可以发布文章）
    const { getCurrentUser, canModerate } = await import('@/lib/auth');
    const currentUser = getCurrentUser(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    if (!canModerate(currentUser)) {
      return NextResponse.json(
        { success: false, error: '无权发布文章，仅管理员或版主可操作' },
        { status: 403 }
      );
    }

    const body: CreateArticleRequest = await request.json();
    
    // 验证必填字段
    if (!body.title || !body.blocks || body.blocks.length === 0) {
      return NextResponse.json(
        { error: '标题和内容块不能为空' },
        { status: 400 }
      );
    }

    const articleId = uuidv4();
    const currentDate = new Date();
    const publishDate = currentDate.toISOString().split('T')[0];
    
    // 识别文章类型
    let articleType: 'text' | 'image' | 'code' | 'drawing' = body.type || 'text';
    
    // 如果没有指定类型，自动识别
    if (!body.type) {
      const imageBlockCount = body.blocks.filter(b => b.type === 'image').length;
      const hasCodeBlock = body.blocks.some(b => b.type === 'code');
      
      if (imageBlockCount >= 3) {
        articleType = 'drawing';
      } else if (imageBlockCount > 0) {
        articleType = 'image';
      } else if (hasCodeBlock) {
        articleType = 'code';
      }
    }
    
    // 根据文章类型生成摘要
    let excerpt = body.excerpt || '';
    if (!excerpt && body.blocks.length > 0) {
      if (articleType === 'drawing') {
        // 绘画类型：使用第一个文字块
        const firstTextBlock = body.blocks.find(b => b.type === 'text');
        if (firstTextBlock && firstTextBlock.content) {
          excerpt = firstTextBlock.content.substring(0, 150).replace(/\n/g, ' ') + (firstTextBlock.content.length > 150 ? '...' : '');
        } else {
          // imageBlockCount is only defined above, so we need to make sure it's defined here as well.
          const imageBlockCount = body.blocks.filter(b => b.type === 'image').length;
          excerpt = `一组绘画作品（${imageBlockCount} 张）`;
        }
      } else if (articleType === 'image') {
        // 图片类型：使用第一个图片的 description
        const firstImageBlock = body.blocks.find(b => b.type === 'image');
        if (firstImageBlock && firstImageBlock.description) {
          excerpt = firstImageBlock.description;
        } else if (firstImageBlock && firstImageBlock.title) {
          excerpt = firstImageBlock.title;
        } else {
          excerpt = '一组图片分享';
        }
      } else if (articleType === 'code') {
        // 代码类型：使用第一个文字块
        const firstTextBlock = body.blocks.find(b => b.type === 'text');
        if (firstTextBlock && firstTextBlock.content) {
          excerpt = firstTextBlock.content.substring(0, 150).replace(/\n/g, ' ') + (firstTextBlock.content.length > 150 ? '...' : '');
        } else {
          // 如果没有文字块，生成默认描述
          const codeCount = body.blocks.filter(b => b.type === 'code').length;
          excerpt = `包含 ${codeCount} 个代码示例的技术文章`;
        }
      } else {
        // 文字类型：使用第一个文字块
        const firstTextBlock = body.blocks.find(b => b.type === 'text');
        if (firstTextBlock && firstTextBlock.content) {
          excerpt = firstTextBlock.content.substring(0, 150).replace(/\n/g, ' ') + (firstTextBlock.content.length > 150 ? '...' : '');
        }
      }
    }

    // 处理封面图片：优先使用前端指定的值，否则自动计算
    let coverImage = body.cover_image || null;
    let coverAccessLevel = body.cover_access_level || 1;

    // 如果前端没有指定封面，则自动计算
    if (coverImage === null || coverImage === undefined) {
      if (body.blocks && body.blocks.length > 0) {
        // 找到所有图片block
        const imageBlocks = body.blocks.filter(block => block.type === 'image');

        if (imageBlocks.length > 0) {
          // 按access_level升序排序，找到权限最低的图片
          const lowestAccessImage = imageBlocks.sort((a, b) => (a.access_level || 1) - (b.access_level || 1))[0];

          if (lowestAccessImage && lowestAccessImage.imageUrl) {
            coverImage = {
              url: lowestAccessImage.imageUrl,
              title: lowestAccessImage.title || '',
              description: lowestAccessImage.description || ''
            };
            coverAccessLevel = lowestAccessImage.access_level || 1;
          }
        }
      }
    }

    // 计算 visible_access_level（所有 blocks 的最小 access_level）和 full_access_level（所有 blocks 的最大 access_level）
    let visibleAccessLevel = 1;
    let fullAccessLevel = 1;
    if (body.blocks && body.blocks.length > 0) {
      const accessLevels = body.blocks.map((block: any) => block.access_level || 1);
      visibleAccessLevel = Math.min(...accessLevels);
      fullAccessLevel = Math.max(...accessLevels);
    } else {
      // 如果没有 blocks，使用前端传入的值或默认值
      visibleAccessLevel = body.visible_access_level ?? body.max_access_level ?? 1;
      fullAccessLevel = body.full_access_level ?? 1;
    }

    // 2. 插入文章记录（使用当前登录用户作者）
    await query(
      `INSERT INTO articles
       (id, title, author, author_id, published_at, excerpt, type, category_id, order_index, status, visible_access_level, full_access_level, cover_image, cover_access_level, likes, shares, comments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
      [
        articleId,
        body.title,
        currentUser.username,  // 使用登录用户的用户名
        currentUser.id,         // 使用登录用户的ID
        currentDate,            // published_at - 使用完整的datetime
        excerpt,
        articleType,
        body.category_id || 'cat_uncategorized',  // 默认分类
        body.order_index || 0,
        body.status || 'published',
        visibleAccessLevel,  // visible_access_level：所有 blocks 的最小值
        fullAccessLevel,    // full_access_level：所有 blocks 的最大值
        coverImage ? JSON.stringify(coverImage) : null,  // 封面图片JSON
        coverAccessLevel,  // 封面访问等级
      ]
    );

    // 3. 插入块并建立关联
    for (let i = 0; i < body.blocks.length; i++) {
      const block = body.blocks[i];
      const blockId = block.id || uuidv4();

      // 构建块的 content（JSON 格式）
      let blockContent: any = {};
      
      if (block.type === 'text') {
        blockContent = {
          content: block.content || '',
        };
      } else if (block.type === 'image') {
        const mediaId = block.media_id ?? block.mediaId ?? null;
        blockContent = {
          url: block.imageUrl || '',
          title: block.title || '',
          description: block.description || '',
          ...(mediaId != null && { media_id: mediaId }),
        };
        console.log(`API: 处理图片块 ${i}`, {
          blockId,
          hasImageUrl: !!block.imageUrl,
          imageUrlLength: block.imageUrl?.length || 0,
        });
      } else if (block.type === 'code') {
        blockContent = {
          language: block.language || 'javascript',
          code: block.code || '',
          title: block.title || '',
        };
      }

      // 插入块（含 media_id，供列表占位与瀑布流用）
      const mediaId = block.media_id ?? block.mediaId ?? null;
      await query(
        `INSERT INTO blocks (id, type, content, author, access_level, media_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE content = VALUES(content), access_level = VALUES(access_level), media_id = VALUES(media_id)`,
        [
          blockId,
          block.type,
          JSON.stringify(blockContent),
          body.author || '匿名',
          block.access_level || 1,
          mediaId,
        ]
      );

      // 建立文章-块关联
      await query(
        `INSERT INTO article_blocks (article_id, block_id, \`order\`) 
         VALUES (?, ?, ?)`,
        [articleId, blockId, i]
      );
    }

    // 4. 处理标签
    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
      for (const tagName of body.tags) {
        if (!tagName || typeof tagName !== 'string') continue;
        
        const trimmedTagName = tagName.trim();
        if (!trimmedTagName) continue;

        // 查找或创建标签
        let tagId: string;
        const existingTags = await query<any[]>(
          'SELECT id FROM tags WHERE name = ?',
          [trimmedTagName]
        );

        if (existingTags.length > 0) {
          tagId = existingTags[0].id;
        } else {
          // 创建新标签
          tagId = uuidv4();
          await query(
            'INSERT INTO tags (id, name) VALUES (?, ?)',
            [tagId, trimmedTagName]
          );
        }

        // 建立文章-标签关联
        try {
          await query(
            'INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)',
            [articleId, tagId]
          );
        } catch (error: any) {
          // 忽略重复关联错误
          if (error.code !== 'ER_DUP_ENTRY') {
            throw error;
          }
        }
      }
      console.log(`✅ 已关联 ${body.tags.length} 个标签`);
    }
    
    console.log(`✅ 文章发布成功: ${body.title} by ${currentUser.username} (ID: ${articleId})`);

    return NextResponse.json({
      success: true,
      articleId,
      message: '文章发布成功',
    });

  } catch (error: any) {
    console.error('发布文章失败:', error);
    return NextResponse.json(
      { error: '发布文章失败: ' + error.message },
      { status: 500 }
    );
  }
}
