/**
 * 单个分类管理 API
 * GET /api/categories/:id - 获取单个分类
 * PUT /api/categories/:id - 更新分类
 * DELETE /api/categories/:id - 删除分类
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, canModerate } from '@/lib/auth';

/**
 * GET /api/categories/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await query(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    if (!category || (category as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, category: (category as any[])[0] });
  } catch (error) {
    console.error('获取分类失败:', error);
    return NextResponse.json(
      { success: false, error: '获取分类失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/categories/:id
 * 支持部分更新，只更新传递的字段
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 权限校验：仅管理员或版主可以更新分类
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    if (!canModerate(currentUser)) {
      return NextResponse.json(
        { success: false, error: '无权更新分类，仅管理员或版主可操作' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, parent_id, order_index } = body;

    // 构建动态更新 SQL
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (parent_id !== undefined) {
      updates.push('parent_id = ?');
      values.push(parent_id || null);
    }
    if (order_index !== undefined) {
      updates.push('order_index = ?');
      values.push(order_index);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有需要更新的字段' },
        { status: 400 }
      );
    }

    values.push(id);

    await query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({ success: true, message: '分类更新成功' });
  } catch (error) {
    console.error('更新分类失败:', error);
    return NextResponse.json(
      { success: false, error: '更新分类失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/:id
 * 删除分类（仅允许删除空目录：无文章且无子分类）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 权限校验：仅管理员或版主可以删除分类
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    if (!canModerate(currentUser)) {
      return NextResponse.json(
        { success: false, error: '无权删除分类，仅管理员或版主可操作' },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    // 检查是否有文章使用此分类
    const articles = await query<any[]>(
      'SELECT COUNT(*) as count FROM articles WHERE category_id = ?',
      [id]
    );

    if (articles[0].count > 0) {
      return NextResponse.json(
        { success: false, error: '该目录下还有文章，无法删除' },
        { status: 400 }
      );
    }

    // 检查是否有子分类
    const childCategories = await query<any[]>(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
      [id]
    );

    if (childCategories[0].count > 0) {
      return NextResponse.json(
        { success: false, error: '该目录下还有子目录，无法删除' },
        { status: 400 }
      );
    }

    await query('DELETE FROM categories WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: '目录删除成功' });
  } catch (error) {
    console.error('删除分类失败:', error);
    return NextResponse.json(
      { success: false, error: '删除分类失败' },
      { status: 500 }
    );
  }
}

