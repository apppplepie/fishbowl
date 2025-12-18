/**
 * 优化的文章列表 API
 * 一次查询返回所有类型文章的预览数据，避免 N+1 查询
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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
  cover_image: any | null; // 封面图片对象或null
  cover_is_placeholder: boolean; // 是否为占位符封面
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
  coverImage: any | null; // 封面图片对象
  coverIsPlaceholder: boolean; // 是否为占位符封面
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

    // 获取当前用户权限
    const currentUser = getCurrentUser(request);
    const userAccessLevel = currentUser ? (currentUser.max_access_level || 3) : 2; // 登录用户默认3级，游客2级

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

    // 在前面添加封面权限参数
    queryParams.unshift(userAccessLevel, userAccessLevel);

    // 添加ORDER BY的参数（放在最后，确保参数顺序正确）
    // 归档页面始终按updated_at降序排序，无论是否指定categoryId
    queryParams.push(0, 0);

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
        -- 封面图片处理：根据权限返回真实封面或占位符
        CASE
          WHEN a.cover_image IS NOT NULL AND a.cover_access_level <= ? THEN
            JSON_OBJECT(
              'url', JSON_UNQUOTE(JSON_EXTRACT(a.cover_image, '$.url')),
              'title', JSON_UNQUOTE(JSON_EXTRACT(a.cover_image, '$.title')),
              'description', JSON_UNQUOTE(JSON_EXTRACT(a.cover_image, '$.description'))
            )
          WHEN a.cover_image IS NOT NULL THEN
            JSON_OBJECT(
              'url', '/static/covers/locked.svg',
              'title', '内容受限',
              'description', CONCAT('需要', a.cover_access_level, '级权限')
            )
          ELSE NULL
        END as cover_image,
        -- 是否为占位符封面
        CASE
          WHEN a.cover_image IS NOT NULL AND a.cover_access_level > ? THEN true
          ELSE false
        END as cover_is_placeholder,
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
      // 封面数据（已由SQL处理）
      coverImage: article.cover_image,
      coverIsPlaceholder: article.cover_is_placeholder,
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

