import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const currentUser = getCurrentUser(request);
    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, error: '未认证' },
        { status: 401 }
      );
    }

    const userId = currentUser.id;

    // 获取用户统计数据
    const [articleResult, followerResult, followingResult, commentResult] = await Promise.all([
      // 文章数量
      query<any[]>(
        `SELECT COUNT(*) as count FROM articles WHERE author_id = ? AND deleted_at IS NULL`,
        [userId]
      ),
      // 粉丝数量（被关注数量）- 如果存在 user_follows 表
      query<any[]>(
        `SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?`,
        [userId]
      ).catch(() => [{ count: 0 }]), // 如果表不存在，返回0
      // 关注数量
      query<any[]>(
        `SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?`,
        [userId]
      ).catch(() => [{ count: 0 }]), // 如果表不存在，返回0
      // 评论数量
      query<any[]>(
        `SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND (deleted_at IS NULL OR status != 'deleted')`,
        [userId]
      )
    ]);

    const articleCount = articleResult[0]?.count || 0;
    const followerCount = followerResult[0]?.count || 0;
    const followingCount = followingResult[0]?.count || 0;
    const commentCount = commentResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        articles: articleCount,
        followers: followerCount,
        following: followingCount,
        comments: commentCount,
        // 为保持向后兼容，提供简化的projects字段
        projects: articleCount
      }
    });

  } catch (error: any) {
    console.error('获取用户统计失败:', error);
    return NextResponse.json(
      { success: false, error: '获取统计数据失败: ' + (error.message || '未知错误') },
      { status: 500 }
    );
  }
}
