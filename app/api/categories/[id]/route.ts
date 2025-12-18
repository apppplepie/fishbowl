/**
 * 单个分类 API 路由
 * GET /api/categories/[id] - 获取单个分类详情
 * DELETE /api/categories/[id] - 删除分类及其子树（需要管理员权限）
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET - 获取单个分类详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: categoryId } = await params;

    const categories = await query<any[]>(
      'SELECT id, name, parent_id, order_index, depth, path, created_at, updated_at FROM categories WHERE id = ?',
      [categoryId]
    );

    if (!categories || categories.length === 0) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category: categories[0]
    });

  } catch (error) {
    console.error('获取分类详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取分类详情失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - 删除分类及其子树（需要管理员权限）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: categoryId } = await params;

    // 1. 验证用户登录和管理员权限
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '只有管理员才能删除分类' },
        { status: 403 }
      );
    }

    // 2. 检查分类是否存在
    const categories = await query<any[]>(
      'SELECT id, name, parent_id FROM categories WHERE id = ?',
      [categoryId]
    );

    if (!categories || categories.length === 0) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    const category = categories[0];

    // 3. 防止删除根分类
    if (!category.parent_id) {
      return NextResponse.json(
        { success: false, error: '不能删除根分类' },
        { status: 403 }
      );
    }

    console.log(`🗑️ 管理员 ${currentUser.username} 请求删除分类: ${category.name} (${categoryId})`);

    // 4. 获取所有需要删除的分类ID（包括子分类）
    const allCategoryIds: string[] = [];

    // 递归函数获取所有子分类ID
    const getChildCategoryIds = async (parentId: string) => {
      const children = await query<any[]>(
        'SELECT id FROM categories WHERE parent_id = ?',
        [parentId]
      );

      for (const child of children) {
        allCategoryIds.push(child.id);
        await getChildCategoryIds(child.id); // 递归获取子分类
      }
    };

    // 首先添加当前分类ID
    allCategoryIds.push(categoryId);
    // 然后获取所有子分类ID
    await getChildCategoryIds(categoryId);

    console.log(`📋 找到 ${allCategoryIds.length} 个相关分类需要删除:`, allCategoryIds);

    // 5. 删除所有相关的文章标签关联
    if (allCategoryIds.length > 0) {
      await query(
        `DELETE FROM article_tags WHERE article_id IN (
          SELECT id FROM articles WHERE category_id IN (${allCategoryIds.map(() => '?').join(',')})
        )`,
        allCategoryIds
      );
    }

    // 6. 删除所有相关的文章块关联
    if (allCategoryIds.length > 0) {
      await query(
        `DELETE FROM article_blocks WHERE article_id IN (
          SELECT id FROM articles WHERE category_id IN (${allCategoryIds.map(() => '?').join(',')})
        )`,
        allCategoryIds
      );
    }

    // 7. 删除所有相关的文章（但保留块内容）
    if (allCategoryIds.length > 0) {
      await query(
        `DELETE FROM articles WHERE category_id IN (${allCategoryIds.map(() => '?').join(',')})`,
        allCategoryIds
      );
    }

    // 8. 删除所有相关的标签（如果没有其他文章使用）
    if (allCategoryIds.length > 0) {
      await query(
        `DELETE FROM tags WHERE id NOT IN (
          SELECT DISTINCT tag_id FROM article_tags
        )`
      );
    }

    // 9. 最后删除分类（从叶子节点开始删除）
    // 由于外键约束，我们需要按正确的顺序删除
    for (let i = allCategoryIds.length - 1; i >= 0; i--) {
      await query('DELETE FROM categories WHERE id = ?', [allCategoryIds[i]]);
    }

    console.log(`✅ 成功删除分类 ${category.name} 及其 ${allCategoryIds.length - 1} 个子分类`);

    return NextResponse.json({
      success: true,
      message: `成功删除分类 ${category.name} 及其所有子分类和相关文章`,
      deletedCategories: allCategoryIds.length,
    });

  } catch (error) {
    console.error('删除分类失败:', error);
    return NextResponse.json(
      { success: false, error: '删除分类失败' },
      { status: 500 }
    );
  }
}