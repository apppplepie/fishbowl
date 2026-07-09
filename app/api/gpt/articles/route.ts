/**
 * GPT Actions 文章管理接口
 *
 * GET  /api/gpt/articles - 获取文章列表
 * POST /api/gpt/articles - 发布新文章
 */
import { NextRequest, NextResponse } from 'next/server';
import { authenticateGptRequest } from '@/lib/gptAuth';
import { createGptArticle, GptBlockInput } from '@/lib/gptPublish';
import { query } from '@/lib/db';

// GPT 请求类型定义
interface GptPublishRequest {
  title: string;                     // 必填：文章标题
  blocks?: GptBlockInput[];          // 新版：文章内容块
  content?: GptBlockInput[];         // 旧版兼容：文章内容块
  tags?: string[];                   // 可选：标签列表
  category_id?: string;              // 可选：分类 ID
  summary?: string;                  // 可选：总结
  excerpt?: string;                  // 可选：摘要，不传则自动生成
  article_type?: string;             // 可选：文章类型
  moment_type?: string;              // 可选：语义类型
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/gpt/articles - 获取文章列表
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 认证 GPT 请求
    const auth = await authenticateGptRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'published';
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sort = searchParams.get('sort') || 'date_desc';

    // 3. 构建查询条件
    let whereClause = 'WHERE a.status = ?';
    let params: any[] = [status];

    if (category) {
      whereClause += ' AND a.category_id = ?';
      params.push(category);
    }

    // 4. 排序方式
    let orderClause = 'ORDER BY a.published_at DESC, a.created_at DESC';
    if (sort === 'date_asc') {
      orderClause = 'ORDER BY a.published_at ASC, a.created_at ASC';
    } else if (sort === 'likes') {
      orderClause = 'ORDER BY a.likes DESC';
    } else if (sort === 'comments') {
      orderClause = 'ORDER BY a.comments DESC';
    }

    // 5. 查询文章
    const articles = await query<any[]>(
      `SELECT
        a.id, a.title, a.author, a.author_id, a.published_at, a.created_at,
        a.excerpt, a.type, a.status, a.likes, a.shares, a.comments,
        a.category_id, c.name as category_name
       FROM articles a
       LEFT JOIN categories c ON c.id = a.category_id
       ${whereClause}
       ${orderClause}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    // 6. 获取标签
    const articleIds = articles.map(a => a.id);
    let tagsByArticleId: Record<string, string[]> = {};
    if (articleIds.length > 0) {
      const placeholders = articleIds.map(() => '?').join(',');
      const tagRows = await query<any[]>(
        `SELECT at.article_id, t.name
         FROM article_tags at
         JOIN tags t ON t.id = at.tag_id
         WHERE at.article_id IN (${placeholders})
         ORDER BY at.article_id, t.name ASC`,
        articleIds
      );
      for (const row of tagRows) {
        if (!tagsByArticleId[row.article_id]) tagsByArticleId[row.article_id] = [];
        tagsByArticleId[row.article_id].push(row.name);
      }
    }

    // 7. 组装结果
    const articlesWithTags = articles.map(article => ({
      id: article.id,
      title: article.title,
      author: article.author,
      authorId: article.author_id,
      publishedAt: article.published_at,
      createdAt: article.created_at,
      excerpt: article.excerpt,
      type: article.type,
      status: article.status,
      likes: article.likes,
      shares: article.shares,
      commentCount: article.comments,
      categoryId: article.category_id,
      categoryName: article.category_name,
      tags: tagsByArticleId[article.id] || [],
      url: `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost'}/article/${article.id}`,
    }));

    // 8. 获取总数
    const countResult = await query<any[]>(
      `SELECT COUNT(*) as total FROM articles a ${whereClause}`,
      params
    );

    return NextResponse.json({
      success: true,
      articles: articlesWithTags,
      count: articlesWithTags.length,
      total: countResult[0]?.total || 0,
      pagination: {
        limit,
        offset,
        hasMore: offset + articlesWithTags.length < (countResult[0]?.total || 0),
      },
    });

  } catch (error: any) {
    console.error('[GPT Actions] GET /api/gpt/articles error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gpt/articles - 发布文章
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 认证 GPT 请求
    const auth = await authenticateGptRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body: GptPublishRequest = await request.json();

    // 3. 参数验证
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Article title is required (string)' },
        { status: 400 }
      );
    }

    const inputBlocks = Array.isArray(body.blocks) && body.blocks.length > 0 ? body.blocks : body.content;
    if (!inputBlocks || !Array.isArray(inputBlocks) || inputBlocks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'blocks is required (non-empty array)' },
        { status: 400 }
      );
    }

    // 4. 发布文章
    const result = await createGptArticle({
      title: body.title,
      authorId: auth.authorId!,
      blocks: inputBlocks,
      summary: body.summary,
      tags: body.tags || [],
      categoryId: body.category_id || null,
      excerpt: body.excerpt,
      articleType: body.article_type as any,
      momentType: body.moment_type as any,
    });

    // 5. 返回成功响应
    const articleUrl = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost'}/article/${result.articleId}`;

    return NextResponse.json({
      success: true,
      article_id: result.articleId,
      articleId: result.articleId,
      url: articleUrl,
      title: body.title,
      article_type: result.articleType,
      category_id: result.categoryId,
      tags: result.tags,
      blockCount: result.blockCount,
      imageCount: result.imageCount,
      message: 'Article published successfully',
    });

  } catch (error: any) {
    console.error('[GPT Actions] POST /api/gpt/articles error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: error.message?.includes('required') ? 400 : 500 }
    );
  }
}
