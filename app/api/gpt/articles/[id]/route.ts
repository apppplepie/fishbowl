/**
 * GPT Actions 单篇文章接口
 *
 * GET /api/gpt/articles/:id - 获取单篇文章详情
 */
import { NextRequest, NextResponse } from 'next/server';
import { authenticateGptRequest } from '@/lib/gptAuth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/gpt/articles/:id - 获取文章详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. 认证 GPT 请求
    const auth = await authenticateGptRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // 2. 查询文章基本信息
    const articles = await query<any[]>(
      `SELECT
        a.id, a.title, a.author, a.author_id, a.published_at, a.created_at, a.updated_at,
        a.excerpt, a.type, a.status, a.likes, a.shares, a.comments,
        a.category_id, c.name as category_name, a.cover_image
       FROM articles a
       LEFT JOIN categories c ON c.id = a.category_id
       WHERE a.id = ?
       LIMIT 1`,
      [id]
    );

    if (articles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    const article = articles[0];

    // 3. 查询文章内容块
    const blocks = await query<any[]>(
      `SELECT
        ab.block_id, ab.order, b.type, b.content, b.author, b.access_level
       FROM article_blocks ab
       JOIN blocks b ON b.id = ab.block_id
       WHERE ab.article_id = ?
       ORDER BY ab.order ASC`,
      [id]
    );

    // 4. 解析块内容
    const parsedBlocks = blocks.map(block => {
      let content: any = {};
      try {
        content = JSON.parse(block.content);
      } catch {
        content = { content: block.content };
      }
      return {
        id: block.block_id,
        type: block.type,
        order: block.order,
        access_level: block.access_level,
        ...content,
      };
    });

    // 5. 查询标签
    const tags = await query<any[]>(
      `SELECT t.name
       FROM article_tags at
       JOIN tags t ON t.id = at.tag_id
       WHERE at.article_id = ?
       ORDER BY t.name ASC`,
      [id]
    );

    // 6. 组装结果
    const baseUrl = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost'}`;

    return NextResponse.json({
      success: true,
      article: {
        id: article.id,
        title: article.title,
        author: article.author,
        authorId: article.author_id,
        publishedAt: article.published_at,
        createdAt: article.created_at,
        updatedAt: article.updated_at,
        excerpt: article.excerpt,
        type: article.type,
        status: article.status,
        likes: article.likes,
        shares: article.shares,
        commentCount: article.comments,
        categoryId: article.category_id,
        categoryName: article.category_name,
        coverImage: article.cover_image ? JSON.parse(article.cover_image) : null,
        tags: tags.map(t => t.name),
        blocks: parsedBlocks,
        url: `${baseUrl}/article/${article.id}`,
      },
    });

  } catch (error: any) {
    console.error('[GPT Actions] GET /api/gpt/articles/:id error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
