import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * 分类路径项（带章节索引）
 */
interface CategoryPathItem {
  id: string;
  name: string;
  depth: number;
  chapter_index: number; // 在同级目录中的排名（用于生成"第X卷"等）
}

/**
 * 获取分类的完整路径（从根到当前分类）
 * GET /api/categories/[id]/path
 * 
 * 返回的每个分类都包含 depth 和 chapter_index，可用于生成章节号
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: categoryId } = await params;

    // 查询分类信息（包含 depth 和 order_index）
    const categories = await query(
      `SELECT id, name, parent_id, depth, order_index FROM categories WHERE id = ?`,
      [categoryId]
    ) as any[];

    if (!categories || categories.length === 0) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    // 递归构建路径，同时计算每个分类在同级目录中的排名
    const buildPath = async (id: string): Promise<CategoryPathItem[]> => {
      const cats = await query(
        `SELECT id, name, parent_id, depth, order_index FROM categories WHERE id = ?`,
        [id]
      ) as any[];

      if (!cats || cats.length === 0) {
        return [];
      }

      const cat = cats[0];
      
      // 计算当前分类在同级目录中的排名（chapter_index）
      // 只统计同一父级下 order_index 小于当前分类的目录数量 + 1
      let chapterIndex = 1;
      if (cat.parent_id) {
        const rankResult = await query(
          `SELECT COUNT(*) + 1 as chapter_rank 
           FROM categories 
           WHERE parent_id = ? AND order_index < ?`,
          [cat.parent_id, cat.order_index]
        ) as any[];
        
        if (rankResult && rankResult.length > 0) {
          chapterIndex = rankResult[0].chapter_rank;
        }
      }

      const currentItem: CategoryPathItem = {
        id: cat.id,
        name: cat.name,
        depth: cat.depth,
        chapter_index: chapterIndex,
      };
      
      if (cat.parent_id) {
        const parentPath = await buildPath(cat.parent_id);
        return [...parentPath, currentItem];
      } else {
        return [currentItem];
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

