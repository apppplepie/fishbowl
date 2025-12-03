/**
 * 优化的文章列表 API
 * 一次查询返回所有类型文章的预览数据，避免 N+1 查询
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'published';
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 优化查询：使用子查询直接获取预览数据
    const articles = await query<any[]>(
      `SELECT 
        a.id,
        a.title,
        a.author,
        a.author_id,
        a.publish_date,
        a.last_modified,
        a.excerpt,
        a.type,
        a.status,
        a.likes,
        a.shares,
        a.comments,
        -- 图片类型：获取第一个图片的 URL
        CASE 
          WHEN a.type = 'image' THEN (
            SELECT JSON_EXTRACT(b.content, '$.url')
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'image'
            ORDER BY ab.\`order\` ASC
            LIMIT 1
          )
          ELSE NULL
        END as first_image_url,
        -- 绘画类型：获取 order 最大的图片（成图）
        CASE 
          WHEN a.type = 'drawing' THEN (
            SELECT JSON_EXTRACT(b.content, '$.url')
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'image'
            ORDER BY ab.\`order\` DESC
            LIMIT 1
          )
          ELSE NULL
        END as drawing_cover_url,
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
            SELECT JSON_EXTRACT(b.content, '$.code')
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'code'
            ORDER BY ab.\`order\` ASC
            LIMIT 1
          )
          ELSE NULL
        END as code_preview,
        -- 代码类型：获取第一个代码块的语言
        CASE 
          WHEN a.type = 'code' THEN (
            SELECT JSON_EXTRACT(b.content, '$.language')
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'code'
            ORDER BY ab.\`order\` ASC
            LIMIT 1
          )
          ELSE NULL
        END as code_language,
        -- 代码类型：统计代码块数量
        CASE 
          WHEN a.type = 'code' THEN (
            SELECT COUNT(*)
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'code'
          )
          ELSE NULL
        END as code_block_count
       FROM articles a
       WHERE a.status = ?
       ORDER BY a.last_modified DESC, a.publish_date DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [status]
    );

    // 处理 JSON_EXTRACT 返回的带引号字符串
    const processedArticles = articles.map(article => {
      const processed: any = {
        ...article,
      };

      // 处理图片 URL（移除 JSON_EXTRACT 的引号）
      if (article.first_image_url) {
        processed.firstImageUrl = article.first_image_url.replace(/^"|"$/g, '');
        delete processed.first_image_url;
      }
      
      if (article.drawing_cover_url) {
        processed.firstImageUrl = article.drawing_cover_url.replace(/^"|"$/g, '');
        delete processed.drawing_cover_url;
      }

      // 处理图片数量
      if (article.image_count !== null && article.image_count !== undefined) {
        processed.imageCount = article.image_count;
        delete processed.image_count;
      }

      // 处理代码预览
      if (article.code_preview) {
        processed.codePreview = article.code_preview.replace(/^"|"$/g, '');
        delete processed.code_preview;
      }

      if (article.code_language) {
        processed.codeLanguage = article.code_language.replace(/^"|"$/g, '');
        delete processed.code_language;
      }

      if (article.code_block_count !== null && article.code_block_count !== undefined) {
        processed.codeBlockCount = article.code_block_count;
        delete processed.code_block_count;
      }

      return processed;
    });

    // 获取每篇文章的标签
    for (const article of processedArticles) {
      const tags = await query<any[]>(
        `SELECT t.id, t.name 
         FROM tags t
         JOIN article_tags at ON t.id = at.tag_id
         WHERE at.article_id = ?
         ORDER BY t.name ASC`,
        [article.id]
      );
      article.tags = tags.map((t: any) => t.name);
    }

    return NextResponse.json({
      success: true,
      articles: processedArticles,
      count: processedArticles.length,
    });

  } catch (error: any) {
    console.error('获取文章列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取文章列表失败: ' + error.message },
      { status: 500 }
    );
  }
}

