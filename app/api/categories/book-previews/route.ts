import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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
    firstImageUrl: string | null;
    imageCount: number | null;
    codePreview: string | null;
    codeLanguage: string | null;
    codeBlockCount: number | null;
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
    // 使用窗口函数按分类分组，取每个分类中order_in_category最小的文章
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
          a.order_in_category,
          c.name as category_name,
          -- 获取文章中第一个图片的 URL
          (
            SELECT JSON_UNQUOTE(JSON_EXTRACT(b.content, '$.url'))
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'image'
            ORDER BY ab.\`order\` ASC
            LIMIT 1
          ) as firstImageUrl,
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
          -- 按分类和order_in_category排序，用于选择第一篇文章
          ROW_NUMBER() OVER (PARTITION BY a.category_id ORDER BY a.order_in_category ASC, a.updated_at DESC) as rn
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.status = 'published'
          AND a.category_id IN (${placeholders})
      ) ranked
      WHERE rn = 1
    `, categoryIds) as any[];

    // 构建结果
    const books: BookPreview[] = categories.map(category => {
      const article = articles.find(a => a.category_id === category.id);

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
          orderInCategory: article.order_in_category,
          categoryName: article.category_name,
          firstImageUrl: article.firstImageUrl,
          imageCount: article.image_count,
          codePreview: article.codePreview,
          codeLanguage: article.codeLanguage,
          codeBlockCount: article.codeBlockCount,
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
