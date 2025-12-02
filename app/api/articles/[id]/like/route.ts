import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * 获取客户端 IP 地址
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
             req.headers.get('x-real-ip') || 
             'unknown';
  return ip;
}

/**
 * POST /api/articles/[id]/like - 点赞文章（登录和未登录都可以）
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;

    // 1. 检查文章是否存在
    const articles = await query(
      'SELECT id, likes FROM articles WHERE id = ?',
      [articleId]
    ) as any[];

    if (articles.length === 0) {
      return NextResponse.json(
        { success: false, error: '文章不存在' },
        { status: 404 }
      );
    }

    // 2. 获取当前用户（可能未登录）
    const currentUser = getCurrentUser(req);
    const userId = currentUser?.id || null;
    const ipAddress = getClientIP(req);

    // 3. 检查是否已经点赞
    let existingLike;
    
    if (userId) {
      // 登录用户：按 user_id 查询
      existingLike = await query(
        'SELECT id FROM article_likes WHERE article_id = ? AND user_id = ?',
        [articleId, userId]
      ) as any[];
    } else {
      // 未登录用户：按 IP 查询
      existingLike = await query(
        'SELECT id FROM article_likes WHERE article_id = ? AND ip_address = ? AND user_id IS NULL',
        [articleId, ipAddress]
      ) as any[];
    }

    if (existingLike.length > 0) {
      return NextResponse.json(
        { success: false, error: '您已经点赞过了' },
        { status: 400 }
      );
    }

    // 4. 创建点赞记录
    const likeId = uuidv4();
    await query(
      `INSERT INTO article_likes 
       (id, article_id, user_id, ip_address) 
       VALUES (?, ?, ?, ?)`,
      [likeId, articleId, userId, userId ? null : ipAddress]
    );

    // 5. 更新文章点赞数
    await query(
      'UPDATE articles SET likes = likes + 1 WHERE id = ?',
      [articleId]
    );

    // 6. 获取更新后的点赞数
    const updatedArticle = await query(
      'SELECT likes FROM articles WHERE id = ?',
      [articleId]
    ) as any[];

    console.log(`👍 点赞成功: ${userId || ipAddress} → 文章 ${articleId}`);

    return NextResponse.json({
      success: true,
      message: '点赞成功',
      likes: updatedArticle[0].likes,
    });

  } catch (error: any) {
    console.error('点赞失败:', error);
    
    // 处理唯一约束冲突（已点赞）
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: '您已经点赞过了' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: '点赞失败: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/articles/[id]/like - 取消点赞
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;

    // 1. 获取当前用户（可能未登录）
    const currentUser = getCurrentUser(req);
    const userId = currentUser?.id || null;
    const ipAddress = getClientIP(req);

    // 2. 查找点赞记录
    let likeRecord;
    
    if (userId) {
      likeRecord = await query(
        'SELECT id FROM article_likes WHERE article_id = ? AND user_id = ?',
        [articleId, userId]
      ) as any[];
    } else {
      likeRecord = await query(
        'SELECT id FROM article_likes WHERE article_id = ? AND ip_address = ? AND user_id IS NULL',
        [articleId, ipAddress]
      ) as any[];
    }

    if (likeRecord.length === 0) {
      return NextResponse.json(
        { success: false, error: '您还没有点赞' },
        { status: 400 }
      );
    }

    // 3. 删除点赞记录
    await query(
      'DELETE FROM article_likes WHERE id = ?',
      [likeRecord[0].id]
    );

    // 4. 更新文章点赞数
    await query(
      'UPDATE articles SET likes = GREATEST(likes - 1, 0) WHERE id = ?',
      [articleId]
    );

    // 5. 获取更新后的点赞数
    const updatedArticle = await query(
      'SELECT likes FROM articles WHERE id = ?',
      [articleId]
    ) as any[];

    console.log(`👎 取消点赞: ${userId || ipAddress} → 文章 ${articleId}`);

    return NextResponse.json({
      success: true,
      message: '取消点赞成功',
      likes: updatedArticle[0].likes,
    });

  } catch (error: any) {
    console.error('取消点赞失败:', error);
    return NextResponse.json(
      { success: false, error: '取消点赞失败: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/articles/[id]/like - 检查是否已点赞
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;

    const currentUser = getCurrentUser(req);
    const userId = currentUser?.id || null;
    const ipAddress = getClientIP(req);

    let liked = false;

    if (userId) {
      const result = await query(
        'SELECT id FROM article_likes WHERE article_id = ? AND user_id = ?',
        [articleId, userId]
      ) as any[];
      liked = result.length > 0;
    } else {
      const result = await query(
        'SELECT id FROM article_likes WHERE article_id = ? AND ip_address = ? AND user_id IS NULL',
        [articleId, ipAddress]
      ) as any[];
      liked = result.length > 0;
    }

    return NextResponse.json({
      success: true,
      liked,
    });

  } catch (error: any) {
    console.error('检查点赞状态失败:', error);
    return NextResponse.json(
      { success: false, error: '检查点赞状态失败' },
      { status: 500 }
    );
  }
}

