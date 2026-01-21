import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// 评论类型定义
interface Comment {
  id: string;
  article_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  status: string;
  created_at: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  notify_user_id: string;
  notification_read: number;
  replies?: Comment[];
}

/**
 * GET /api/articles/[id]/comments - 获取文章的所有评论
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;

    // 获取顶级评论（parent_id 为 NULL）
    const topComments = await query(
      `SELECT c.*, u.username, u.display_name, u.avatar_base64
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.article_id = ? 
         AND c.parent_id IS NULL
         AND c.status = 'visible'
       ORDER BY c.created_at DESC`,
      [articleId]
    ) as Comment[];

    // 获取所有回复
    const allReplies = await query(
      `SELECT c.*, u.username, u.display_name, u.avatar_base64
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.article_id = ?
         AND c.parent_id IS NOT NULL
         AND c.status = 'visible'
       ORDER BY c.created_at ASC`,
      [articleId]
    ) as Comment[];

    // 构建评论树的递归函数
    const buildCommentTree = (parentId: string): Comment[] => {
      return allReplies
        .filter(reply => reply.parent_id === parentId)
        .map(reply => ({
          ...reply,
          replies: buildCommentTree(reply.id),
        }));
    };

    // 为每个顶级评论添加回复树
    const comments: Comment[] = topComments.map(comment => ({
      ...comment,
      replies: buildCommentTree(comment.id),
    }));

    return NextResponse.json({
      success: true,
      comments,
      total: topComments.length,
    });

  } catch (error: any) {
    console.error('获取评论失败:', error);
    return NextResponse.json(
      { success: false, error: '获取评论失败: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/articles/[id]/comments - 发表评论（需要登录）
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;
    const body = await req.json();

    // 1. 验证用户登录
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录才能评论' },
        { status: 401 }
      );
    }

    // 2. 验证必填字段
    if (!body.content || !body.content.trim()) {
      return NextResponse.json(
        { success: false, error: '评论内容不能为空' },
        { status: 400 }
      );
    }

    // 3. 检查文章是否存在并获取作者ID
    const articles = await query(
      'SELECT id, author_id FROM articles WHERE id = ?',
      [articleId]
    ) as any[];

    if (articles.length === 0) {
      return NextResponse.json(
        { success: false, error: '文章不存在' },
        { status: 404 }
      );
    }

    const articleAuthorId = articles[0].author_id;

    // 4. 确定通知用户ID
    let notifyUserId: string | null = null;

    if (body.parent_id) {
      // 如果是回复评论，检查父评论是否存在并获取被回复的用户ID
      const parentComments = await query(
        'SELECT id, user_id FROM comments WHERE id = ? AND article_id = ?',
        [body.parent_id, articleId]
      ) as any[];

      if (parentComments.length === 0) {
        return NextResponse.json(
          { success: false, error: '父评论不存在' },
          { status: 404 }
        );
      }

      // 通知被回复的用户（父评论的作者）
      notifyUserId = parentComments[0].user_id;
    } else {
      // 如果是顶级评论，通知文章作者
      notifyUserId = articleAuthorId;
    }

    // 5. 判断是否是自己回复自己，如果是则默认已读
    const isSelfNotification = notifyUserId === currentUser.id;
    const notificationRead = isSelfNotification ? 1 : 0;

    // 6. 创建评论
    const commentId = uuidv4();
    await query(
      `INSERT INTO comments 
       (id, article_id, user_id, parent_id, content, status, notify_user_id, notification_read) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        commentId,
        articleId,
        currentUser.id,
        body.parent_id || null,
        body.content.trim(),
        'visible',
        notifyUserId,
        notificationRead,
      ]
    );

    // 7. 更新文章评论数
    await query(
      'UPDATE articles SET comments = comments + 1 WHERE id = ?',
      [articleId]
    );

    // 8. 获取刚创建的评论（包含用户信息）
    const newComment = await query(
      `SELECT c.*, u.username, u.display_name, u.avatar_base64
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [commentId]
    ) as any[];

    console.log(`✅ 评论发表成功: ${currentUser.username} → 文章 ${articleId}`);

    return NextResponse.json({
      success: true,
      message: '评论发表成功',
      comment: newComment[0],
    });

  } catch (error: any) {
    console.error('发表评论失败:', error);
    return NextResponse.json(
      { success: false, error: '发表评论失败: ' + error.message },
      { status: 500 }
    );
  }
}

