import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * 获取分类的完整路径（从根到当前分类）
 * GET /api/categories/[id]/path
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: categoryId } = await params;

    // 查询分类信息
    const categories = await query(
      `SELECT id, name, parent_id FROM categories WHERE id = ?`,
      [categoryId]
    ) as any[];

    if (!categories || categories.length === 0) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    // 递归构建路径
    const buildPath = async (id: string): Promise<Array<{ id: string; name: string }>> => {
      const cats = await query(
        `SELECT id, name, parent_id FROM categories WHERE id = ?`,
        [id]
      ) as any[];

      if (!cats || cats.length === 0) {
        return [];
      }

      const cat = cats[0];
      
      if (cat.parent_id) {
        const parentPath = await buildPath(cat.parent_id);
        return [...parentPath, { id: cat.id, name: cat.name }];
      } else {
        return [{ id: cat.id, name: cat.name }];
      }
    };

    const path = await buildPath(categoryId);

    return NextResponse.json({
      success: true,
      path,
    });
  } catch (error) {
    console.error('获取分类路径失败:', error);
    return NextResponse.json(
      { success: false, error: '获取分类路径失败' },
      { status: 500 }
    );
  }
}

