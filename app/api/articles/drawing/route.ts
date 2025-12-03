/**
 * 绘画作品专用 API
 * 优化：直接在列表查询中返回封面图片，避免 N+1 查询
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 优化查询：使用子查询直接获取封面图片和图片数量
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
        a.likes,
        a.comments,
        a.shares,
        -- 获取 order 最大的图片（最后一张/成图）
        (SELECT JSON_EXTRACT(content, '$.url')
         FROM blocks b
         JOIN article_blocks ab ON b.id = ab.block_id
         WHERE ab.article_id = a.id 
           AND b.type = 'image'
         ORDER BY ab.\`order\` DESC
         LIMIT 1) as cover_image_url,
        -- 统计图片数量
        (SELECT COUNT(*)
         FROM blocks b
         JOIN article_blocks ab ON b.id = ab.block_id
         WHERE ab.article_id = a.id 
           AND b.type = 'image') as image_count
       FROM articles a
       WHERE a.type = 'drawing'
         AND a.status = 'published'
       ORDER BY a.last_modified DESC, a.publish_date DESC
       LIMIT ${limit} OFFSET ${offset}`,
      []
    );

    // 处理 JSON_EXTRACT 返回的带引号字符串
    const processedArticles = articles.map(article => ({
      ...article,
      cover_image_url: article.cover_image_url 
        ? article.cover_image_url.replace(/^"|"$/g, '') // 移除引号
        : null,
      image_count: article.image_count || 0,
    }));

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
    console.error('获取绘画作品失败:', error);
    return NextResponse.json(
      { success: false, error: '获取绘画作品失败: ' + error.message },
      { status: 500 }
    );
  }
}

