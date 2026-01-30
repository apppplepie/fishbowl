import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';

const PLACEHOLDER_IMG = PLACEHOLDER_IMAGE_URL;

interface BookPreview {
  categoryId: string;
  categoryName: string;
  orderIndex: number;
  firstArticle?: {
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
    coverImage: any | null;
    coverIsPlaceholder: boolean;
    tags: string[];
  };
}

/**
 * GET /api/categories/book-previews
 * 获取书籍分类及其第一篇文章的预览数据
 * 用于书架页面的高效加载
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId') || 'cat_bookcase';

    // 1. 获取当前用户（用于权限检查）
    const currentUser = getCurrentUser(request);
    const userAccessLevel = currentUser ? (currentUser.max_access_level || 3) : 2; // 登录用户默认3级，游客2级

    // 获取指定父分类的直接子分类
    const categories = await query(
      'SELECT id, name, order_index FROM categories WHERE parent_id = ? ORDER BY order_index ASC',
      [parentId]
    ) as any[];

    if (categories.length === 0) {
      return NextResponse.json({
        success: true,
        books: []
      });
    }

    const categoryIds = categories.map(cat => cat.id);
    const placeholders = categoryIds.map(() => '?').join(',');

    // 一次性查询所有分类的第一篇文章
    // 使用窗口函数按分类分组，取每个分类中order_index最小的文章
    const articles = await query(`
      SELECT *
      FROM (
        SELECT
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
          -- 封面图片处理：根据权限返回真实封面或占位符，并带上 media 的 width/height 供瀑布流按比例占位
          CASE
            WHEN a.cover_image IS NOT NULL AND a.cover_access_level <= ? THEN
              JSON_OBJECT(
                'url', JSON_UNQUOTE(JSON_EXTRACT(a.cover_image, '$.url')),
                'title', JSON_UNQUOTE(JSON_EXTRACT(a.cover_image, '$.title')),
                'description', JSON_UNQUOTE(JSON_EXTRACT(a.cover_image, '$.description')),
                'width', m.width,
                'height', m.height,
                'aspect_ratio', m.aspect_ratio
              )
            WHEN a.cover_image IS NOT NULL THEN
              JSON_OBJECT(
                'url', '${PLACEHOLDER_IMG}',
                'title', '内容受限',
                'description', CONCAT('需要', a.cover_access_level, '级权限'),
                'width', m.width,
                'height', m.height,
                'aspect_ratio', m.aspect_ratio
              )
            ELSE NULL
          END as cover_image,
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
          -- 获取文章标签
          (
            SELECT JSON_ARRAYAGG(t.name)
            FROM tags t
            JOIN article_tags at ON t.id = at.tag_id
            WHERE at.article_id = a.id
            ORDER BY t.name ASC
          ) as tags,
          -- 按分类和order_index排序，用于选择第一篇文章
          ROW_NUMBER() OVER (PARTITION BY a.category_id ORDER BY a.order_index ASC, a.updated_at DESC) as rn
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN (
          SELECT article_id, block_id FROM (
            SELECT ab.article_id, ab.block_id,
              ROW_NUMBER() OVER (PARTITION BY ab.article_id ORDER BY ab.\`order\`) as rn
            FROM article_blocks ab
            INNER JOIN blocks b ON b.id = ab.block_id AND b.type = 'image'
          ) t WHERE rn = 1
        ) first_img ON first_img.article_id = a.id
        LEFT JOIN blocks b_cover ON b_cover.id = first_img.block_id
        LEFT JOIN media m ON m.id = b_cover.media_id
        WHERE a.status = 'published'
          AND a.category_id IN (${placeholders})
      ) ranked
      WHERE rn = 1
    `, [userAccessLevel, ...categoryIds]) as any[];

    // 封面权限已在SQL中处理，这里直接使用查询结果
    const processedArticles: any[] = articles;

    // 构建结果
    const books: BookPreview[] = categories.map(category => {
      const article = processedArticles.find(a => a.category_id === category.id);

      const book: BookPreview = {
        categoryId: category.id,
        categoryName: category.name,
        orderIndex: category.order_index || 0,
      };

      if (article) {
        book.firstArticle = {
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
          coverImage: article.cover_image,
          coverIsPlaceholder: article.cover_image && article.cover_image.url === PLACEHOLDER_IMG,
          tags: article.tags || [],
        };
      }

      return book;
    });

    return NextResponse.json({
      success: true,
      books: books.sort((a, b) => a.orderIndex - b.orderIndex)
    });

  } catch (error: any) {
    console.error('获取书籍预览失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: `获取书籍预览失败: ${error.message}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
