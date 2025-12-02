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
  status?: 'draft' | 'published';
}

/**
 * POST - 发布文章
 */
export async function POST(request: NextRequest) {
  try {
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
    
    // 自动识别文章类型（优先级：图片 > 代码 > 文字）
    let articleType: 'text' | 'image' | 'code' = 'text';
    const hasImageBlock = body.blocks.some(b => b.type === 'image');
    const hasCodeBlock = body.blocks.some(b => b.type === 'code');
    
    if (hasImageBlock) {
      articleType = 'image';
    } else if (hasCodeBlock) {
      articleType = 'code';
    }
    
    // 根据文章类型生成摘要
    let excerpt = body.excerpt || '';
    if (!excerpt && body.blocks.length > 0) {
      if (articleType === 'image') {
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

    // 1. 插入文章记录
    await query(
      `INSERT INTO articles 
       (id, title, author, publish_date, last_modified, excerpt, type, status, likes, shares, comments) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
      [
        articleId,
        body.title,
        body.author || '匿名',
        publishDate,
        currentDate,
        excerpt,
        articleType,
        body.status || 'published',
      ]
    );

    // 2. 插入块并建立关联
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
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 使用字符串拼接而不是参数绑定（LIMIT 和 OFFSET 不支持 ? 占位符）
    const articles = await query<any[]>(
      `SELECT 
        id, title, author, publish_date, last_modified, 
        excerpt, type, status, likes, shares, comments
       FROM articles 
       WHERE status = ?
       ORDER BY publish_date DESC, created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [status]
    );

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

