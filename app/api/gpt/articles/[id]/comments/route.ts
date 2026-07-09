/**
 * GPT Actions 评论管理接口
 *
 * GET  /api/gpt/articles/:id/comments - 获取文章评论
 * POST /api/gpt/articles/:id/comments - 发表评论
 */
import { NextRequest, NextResponse } from 'next/server';
import { authenticateGptRequest } from '@/lib/gptAuth';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PostCommentRequest {
  content: string;           // 必填：评论内容
  reply_to?: string;         // 可选：回复的评论 ID
  is_anonymous?: boolean;    // 可选：是否匿名，默认 false
}

/**
 * GET /api/gpt/articles/:id/comments - 获取文章评论列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeReplies = searchParams.get('include_replies') !== 'false';

    // 3. 检查文章是否存在
    const articleCheck = await query<any[]>(
      'SELECT id, title FROM articles WHERE id = ? LIMIT 1',
      [articleId]
    );
    if (articleCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // 4. 查询顶级评论（非回复）
    const whereClause = 'WHERE c.article_id = ? AND c.reply_to IS NULL';
    const queryParams: any[] = [articleId];

    const comments = await query<any[]>(
      `SELECT
        c.id, c.content, c.author, c.author_id, c.created_at, c.updated_at,
        c.likes, c.is_anonymous, c.status
       FROM comments c
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      queryParams
    );

    // 5. 查询回复（如果需要）
    let repliesByParentId: Record<string, any[]> = {};
    if (includeReplies && comments.length > 0) {
      const parentIds = comments.map(c => c.id);
      const placeholders = parentIds.map(() => '?').join(',');
      const replies = await query<any[]>(
        `SELECT
          c.id, c.reply_to, c.content, c.author, c.author_id, c.created_at,
          c.likes, c.is_anonymous, c.status
         FROM comments c
         WHERE c.reply_to IN (${placeholders})
         ORDER BY c.created_at ASC`,
        parentIds
      );
      for (const reply of replies) {
        if (!repliesByParentId[reply.reply_to]) repliesByParentId[reply.reply_to] = [];
        repliesByParentId[reply.reply_to].push({
          id: reply.id,
          content: reply.content,
          author: reply.is_anonymous ? '匿名用户' : reply.author,
          authorId: reply.is_anonymous ? null : reply.author_id,
          createdAt: reply.created_at,
          likes: reply.likes,
          isAnonymous: reply.is_anonymous,
          status: reply.status,
        });
      }
    }

    // 6. 组装结果
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      author: comment.is_anonymous ? '匿名用户' : comment.author,
      authorId: comment.is_anonymous ? null : comment.author_id,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      likes: comment.likes,
      isAnonymous: comment.is_anonymous,
      status: comment.status,
      replies: repliesByParentId[comment.id] || [],
      replyCount: (repliesByParentId[comment.id] || []).length,
    }));

    // 7. 获取总数
    const countResult = await query<any[]>(
      `SELECT COUNT(*) as total FROM comments c ${whereClause}`,
      queryParams
    );

    return NextResponse.json({
      success: true,
      article: {
        id: articleCheck[0].id,
        title: articleCheck[0].title,
      },
      comments: formattedComments,
      count: formattedComments.length,
      total: countResult[0]?.total || 0,
      pagination: {
        limit,
        offset,
        hasMore: offset + formattedComments.length < (countResult[0]?.total || 0),
      },
    });

  } catch (error: any) {
    console.error('[GPT Actions] GET comments error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gpt/articles/:id/comments - 发表评论
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;

    // 1. 认证 GPT 请求
    const auth = await authenticateGptRequest(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // 2. 检查文章是否存在
    const articleCheck = await query<any[]>(
      'SELECT id, title, status FROM articles WHERE id = ? LIMIT 1',
      [articleId]
    );
    if (articleCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // 3. 解析请求体
    const body: PostCommentRequest = await request.json();

    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Comment content is required and cannot be empty' },
        { status: 400 }
      );
    }

    // 4. 检查回复目标是否存在
    if (body.reply_to) {
      const replyCheck = await query<any[]>(
        'SELECT id FROM comments WHERE id = ? AND article_id = ? LIMIT 1',
        [body.reply_to, articleId]
      );
      if (replyCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Reply target comment not found' },
          { status: 404 }
        );
      }
    }

    // 5. 插入评论
    const commentId = uuidv4();
    const now = new Date();

    await query(
      `INSERT INTO comments
       (id, article_id, content, author, author_id, reply_to, is_anonymous, status, likes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        commentId,
        articleId,
        body.content.trim(),
        auth.user.username,
        auth.user.id,
        body.reply_to || null,
        body.is_anonymous ? 1 : 0,
        'approved', // GPT 发表的评论直接通过
        0,
        now,
      ]
    );

    // 6. 更新文章评论计数
    await query(
      'UPDATE articles SET comments = comments + 1 WHERE id = ?',
      [articleId]
    );

    console.log(`[GPT Actions] GPT 发表评论: ${auth.user.username} on article ${articleId}`);

    // 7. 返回结果
    return NextResponse.json({
      success: true,
      commentId,
      articleId,
      articleTitle: articleCheck[0].title,
      content: body.content.trim(),
      author: body.is_anonymous ? '匿名用户' : auth.user.username,
      isAnonymous: body.is_anonymous || false,
      replyTo: body.reply_to || null,
      createdAt: now,
      message: body.reply_to ? 'Reply posted successfully' : 'Comment posted successfully',
    });

  } catch (error: any) {
    console.error('[GPT Actions] POST comments error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
