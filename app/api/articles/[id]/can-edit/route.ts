/**
 * 检查用户是否可以编辑指定文章
 * GET /api/articles/[id]/can-edit
 * 
 * 权限规则：
 * - 管理员：可以编辑任何文章
 * - 版主：必须是作者才能编辑
 * - 普通用户：不能编辑文章（只能发评论）
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, canEditArticle } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;

    // 1. 验证用户登录
    const currentUser = getCurrentUser(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, canEdit: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 2. 获取文章信息
    const articles = await query<any[]>(
      'SELECT id, author, author_id FROM articles WHERE id = ?',
      [articleId]
    );

    if (!articles || articles.length === 0) {
      return NextResponse.json(
        { success: false, canEdit: false, error: '文章不存在' },
        { status: 404 }
      );
    }

    const article = articles[0];

    // 3. 检查编辑权限
    const canEdit = canEditArticle(
      currentUser,
      article.author,
      article.author_id
    );

    return NextResponse.json({
      success: true,
      canEdit,
      userRole: currentUser.role,
      isAuthor: 
        (article.author && article.author === currentUser.username) ||
        (article.author_id && article.author_id === currentUser.id),
    });

  } catch (error: any) {
    console.error('检查编辑权限失败:', error);
    return NextResponse.json(
      {
        success: false,
        canEdit: false,
        error: '检查编辑权限失败: ' + error.message,
      },
      { status: 500 }
    );
  }
}
