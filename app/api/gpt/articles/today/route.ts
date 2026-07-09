/**
 * GPT Actions 获取今日发布的文章
 *
 * GET /api/gpt/articles/today - 获取今日所有文章
 */
import { NextRequest, NextResponse } from 'next/server';
import { authenticateGptRequest } from '@/lib/gptAuth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // 2. 获取今日日期
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 3. 查询今日发布的文章
    const articles = await query<any[]>(
      `SELECT
        a.id, a.title, a.author, a.author_id, a.published_at, a.created_at,
        a.excerpt, a.type, a.status, a.likes, a.shares, a.comments,
        a.category_id, c.name as category_name
       FROM articles a
       LEFT JOIN categories c ON c.id = a.category_id
       WHERE DATE(a.published_at) = ?
       ORDER BY a.published_at DESC, a.created_at DESC`,
      [todayStr]
    );

    // 4. 获取标签
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

    // 5. 组装结果
    const baseUrl = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost'}`;
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
      url: `${baseUrl}/article/${article.id}`,
    }));

    // 6. 统计信息
    const stats = {
      total: articlesWithTags.length,
      byType: {
        text: articlesWithTags.filter(a => a.type === 'text').length,
        image: articlesWithTags.filter(a => a.type === 'image').length,
        drawing: articlesWithTags.filter(a => a.type === 'drawing').length,
        code: articlesWithTags.filter(a => a.type === 'code').length,
      },
      totalLikes: articlesWithTags.reduce((sum, a) => sum + (a.likes || 0), 0),
      totalComments: articlesWithTags.reduce((sum, a) => sum + (a.commentCount || 0), 0),
    };

    return NextResponse.json({
      success: true,
      date: todayStr,
      articles: articlesWithTags,
      count: articlesWithTags.length,
      stats,
    });

  } catch (error: any) {
    console.error('[GPT Actions] GET /api/gpt/articles/today error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
