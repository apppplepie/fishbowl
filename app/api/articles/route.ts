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
}

interface CreateArticleRequest {
  title: string;
  author: string;
  excerpt?: string;
  blocks: Block[];
  tags?: string[];
  category_id?: string | null;
  order_index?: number;
  status?: 'draft' | 'published';
  type?: 'text' | 'image' | 'code' | 'drawing';
}

/**
 * POST - 发布文章（需要登录）
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户登录
    const { getCurrentUser } = await import('@/lib/auth');
    const currentUser = getCurrentUser(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
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

    // 2. 插入文章记录（使用当前登录用户作者）
    await query(
      `INSERT INTO articles
       (id, title, author, author_id, published_at, excerpt, type, category_id, order_index, status, likes, shares, comments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
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
        blockContent = {
          url: block.imageUrl || '',
          title: block.title || '',
          description: block.description || '',
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

      // 插入块
      await query(
        `INSERT INTO blocks (id, type, content, author) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE content = VALUES(content)`,
        [
          blockId,
          block.type,
          JSON.stringify(blockContent),
          body.author || '匿名',
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

/**
 * GET - 获取文章列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'published';
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'updated_desc';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 构建查询条件
    let whereClause = 'WHERE status = ?';
    let params: any[] = [status];

    if (category) {
      whereClause += ' AND category_id = ?';
      params.push(category);
    }

    // 构建排序条件
    let orderClause = 'ORDER BY updated_at DESC, published_at DESC';
    if (sort === 'order_desc') {
      orderClause = 'ORDER BY order_index DESC, updated_at DESC';
    } else if (sort === 'order_asc') {
      orderClause = 'ORDER BY order_index ASC, updated_at DESC';
    }

    // 使用字符串拼接而不是参数绑定（LIMIT 和 OFFSET 不支持 ? 占位符）
    const articles = await query<any[]>(
      `SELECT
        id, title, author, published_at, created_at, updated_at,
        excerpt, type, status, likes, shares, comments, category_id, order_index
       FROM articles
       ${whereClause}
       ${orderClause}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    // 获取每篇文章的标签
    for (const article of articles) {
      const tags = await query<any[]>(
        `SELECT t.id, t.name 
         FROM tags t
         JOIN article_tags at ON t.id = at.tag_id
         WHERE at.article_id = ?
         ORDER BY t.name ASC`,
        [article.id]
      );
      article.tags = tags.map((t: any) => t.name);
    }

    return NextResponse.json({
      success: true,
      articles,
      count: articles.length,
    });

  } catch (error: any) {
    console.error('获取文章列表失败:', error);
    return NextResponse.json(
      { error: '获取文章列表失败: ' + error.message },
      { status: 500 }
    );
  }
}

