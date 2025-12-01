/**
 * 单篇文章 API 路由
 * GET /api/articles/[id] - 获取单篇文章详情（包括所有块）
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET - 获取单篇文章详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;

    // 1. 获取文章基本信息
    const articles = await query<any[]>(
      `SELECT 
        id, title, author, publish_date, last_modified, 
        excerpt, status, likes, shares, comments
       FROM articles 
       WHERE id = ?`,
      [articleId]
    );

    if (!articles || articles.length === 0) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    const article = articles[0];

    // 2. 获取文章的所有块（按 order 排序）
    const blocks = await query<any[]>(
      `SELECT 
        b.id, b.type, b.content, b.author, b.created_at
       FROM blocks b
       INNER JOIN article_blocks ab ON b.id = ab.block_id
       WHERE ab.article_id = ?
       ORDER BY ab.\`order\` ASC`,
      [articleId]
    );

    // 3. 解析块的 content（JSON 字符串 -> 对象）
    const parsedBlocks = blocks.map(block => ({
      ...block,
      parsedContent: JSON.parse(block.content),
    }));

    // 4. 组合返回
    return NextResponse.json({
      success: true,
      article: {
        ...article,
        blocks: parsedBlocks,
      },
    });

  } catch (error: any) {
    console.error('获取文章详情失败:', error);
    return NextResponse.json(
      { error: '获取文章详情失败: ' + error.message },
      { status: 500 }
    );
  }
}

