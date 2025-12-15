/**
 * 优化的文章列表 API
 * 一次查询返回所有类型文章的预览数据，避免 N+1 查询
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 类型定义
interface RawArticle {
  id: string;
  title: string;
  author: string;
  author_id: string;
  published_at: Date;
  created_at: Date;
  updated_at: Date;
  excerpt: string | null;
  type: 'text' | 'image' | 'drawing' | 'code';
  status: string;
  likes: number;
  shares: number;
  comments: number;
  category_id: string;
  order_index: number;
  category_name: string;
  category_path: string | null;
  category_depth: number | null;
  firstImageUrl: string | null;
  drawingCoverUrl: string | null;
  image_count: number | null;
  codePreview: string | null;
  codeLanguage: string | null;
  code_block_count: number | null;
  tags: string[] | null;
}

interface ProcessedArticle {
  id: string;
  title: string;
  author: string;
  authorId: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  excerpt: string | null;
  type: 'text' | 'image' | 'drawing' | 'code';
  status: string;
  likes: number;
  shares: number;
  comments: number;
  categoryId: string;
  orderInCategory: number;
  categoryName: string;
  firstImageUrl: string | null;
  imageCount: number | null;
  codePreview: string | null;
  codeLanguage: string | null;
  codeBlockCount: number | null;
  tags: string[];
}

/**
 * 递归获取分类及其所有子分类的ID
 */
async function getCategoryAndChildrenIds(categoryId: string): Promise<string[]> {
  const result: string[] = [categoryId];

  // 递归查询子分类
  const findChildren = async (parentIds: string[]) => {
    const placeholders = parentIds.map(() => '?').join(',');
    const children = await query<any[]>(
      `SELECT id FROM categories WHERE parent_id IN (${placeholders})`,
      parentIds
    );

    if (children.length > 0) {
      const childIds = children.map(child => child.id);
      result.push(...childIds);
      await findChildren(childIds);
    }
  };

  await findChildren([categoryId]);
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 参数验证和清理
    const status = searchParams.get('status') || 'published';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '15', 10), 1), 100); // 限制在1-100之间
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const categoryId = searchParams.get('categoryId');
    const orderByPath = searchParams.get('orderByPath') === 'true';

    // 验证状态参数
    const validStatuses = ['published', 'draft', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `无效的状态参数: ${status}` },
        { status: 400 }
      );
    }

    // 构建查询条件
    let whereClause = 'a.status = ?';
    const queryParams: any[] = [status];

    if (categoryId) {
      // 获取该分类及其所有子分类的ID
      const categoryIds = await getCategoryAndChildrenIds(categoryId);
      console.log('Category IDs for', categoryId, ':', categoryIds);

      if (categoryIds.length > 0) {
        const placeholders = categoryIds.map(() => '?').join(',');
        whereClause += ` AND a.category_id IN (${placeholders})`;
        queryParams.push(...categoryIds);
      } else {
        console.log('No category IDs found for', categoryId);
      }
    }

    // 添加ORDER BY的参数（放在最后，确保参数顺序正确）
    // 当指定categoryId时，优先按该分类内的order_index排序
    // 否则按路径排序
    const orderByCategoryOrder = categoryId ? true : orderByPath;
    queryParams.push(orderByCategoryOrder ? 1 : 0, orderByCategoryOrder ? 1 : 0);

    console.log('WHERE clause:', whereClause);
    console.log('Query params:', queryParams);

    // 优化查询：使用子查询直接获取预览数据
    const articles = await query<RawArticle[]>(
      `SELECT
        a.id,
        a.title,
        a.author,
        a.author_id,
        a.published_at,
        a.created_at,
        a.updated_at,
        a.excerpt,
        a.type,
        a.status,
        a.likes,
        a.shares,
        a.comments,
        a.category_id,
        a.order_index,
        c.name as category_name,
        c.path as category_path,
        c.depth as category_depth,
        -- 获取文章中第一个图片的 URL（所有类型的文章都可以获取）
        (
          SELECT JSON_UNQUOTE(JSON_EXTRACT(b.content, '$.url'))
          FROM blocks b
          JOIN article_blocks ab ON b.id = ab.block_id
          WHERE ab.article_id = a.id AND b.type = 'image'
          ORDER BY ab.\`order\` ASC
          LIMIT 1
        ) as firstImageUrl,
        -- 绘画类型：获取 order 最大的图片（成图）
        CASE
          WHEN a.type = 'drawing' THEN (
            SELECT JSON_UNQUOTE(JSON_EXTRACT(b.content, '$.url'))
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'image'
            ORDER BY ab.\`order\` DESC
            LIMIT 1
          )
          ELSE NULL
        END as drawingCoverUrl,
        -- 绘画类型：统计图片数量
        CASE
          WHEN a.type = 'drawing' THEN (
            SELECT COUNT(*)
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'image'
          )
          ELSE NULL
        END as image_count,
        -- 代码类型：获取第一个代码块的代码
        CASE
          WHEN a.type = 'code' THEN (
            SELECT JSON_UNQUOTE(JSON_EXTRACT(b.content, '$.code'))
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'code'
            ORDER BY ab.\`order\` ASC
            LIMIT 1
          )
          ELSE NULL
        END as codePreview,
        -- 代码类型：获取第一个代码块的语言
        CASE
          WHEN a.type = 'code' THEN (
            SELECT JSON_UNQUOTE(JSON_EXTRACT(b.content, '$.language'))
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'code'
            ORDER BY ab.\`order\` ASC
            LIMIT 1
          )
          ELSE NULL
        END as codeLanguage,
        -- 代码类型：统计代码块数量
        CASE
          WHEN a.type = 'code' THEN (
            SELECT COUNT(*)
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'code'
          )
          ELSE NULL
        END as codeBlockCount,
        -- 获取文章标签（JSON数组格式）
        (
          SELECT JSON_ARRAYAGG(t.name)
          FROM tags t
          JOIN article_tags at ON t.id = at.tag_id
          WHERE at.article_id = a.id
          ORDER BY t.name ASC
        ) as tags
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE ${whereClause}
       ORDER BY
         CASE WHEN ? = 1 THEN a.order_index
              ELSE NULL END ASC,
         CASE WHEN ? = 1 THEN a.id
              ELSE a.updated_at END DESC
       LIMIT ${limit} OFFSET ${offset}`,
      queryParams
    );

    console.log('Query returned', articles.length, 'articles');

    // 处理和清理查询结果
    const processedArticles: ProcessedArticle[] = articles.map((article: RawArticle) => ({
      id: article.id,
      title: article.title,
      author: article.author,
      authorId: article.author_id,
      publishedAt: article.published_at,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
      excerpt: article.excerpt,
      type: article.type,
      status: article.status,
      likes: article.likes,
      shares: article.shares,
      comments: article.comments,
      categoryId: article.category_id,
      orderInCategory: article.order_index,
      categoryName: article.category_name,
      // 预览数据（已由SQL处理）
      firstImageUrl: article.firstImageUrl || article.drawingCoverUrl,
      imageCount: article.image_count,
      codePreview: article.codePreview,
      codeLanguage: article.codeLanguage,
      codeBlockCount: article.code_block_count,
      // 标签（JSON数组）
      tags: article.tags || [],
    }));

    return NextResponse.json({
      success: true,
      articles: processedArticles,
      count: processedArticles.length,
    });

  } catch (error: any) {
    console.error('获取文章列表失败:', error);

    // 更详细的错误处理
    const errorMessage = error?.message || '未知错误';
    const statusCode = error?.code === 'ER_BAD_FIELD_ERROR' ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        error: `获取文章列表失败: ${errorMessage}`,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

