import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/blocks - 获取所有blocks列表（用于引用块）
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 获取当前用户权限
    const currentUser = getCurrentUser(req);
    const userAccessLevel = currentUser ? (currentUser.max_access_level || 3) : 2; // 登录用户默认3级，游客2级

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // 构建搜索条件
    let whereConditions = ['COALESCE(b.access_level, 1) <= ?', "a.status = 'published'"];
    let queryParams: any[] = [userAccessLevel];

    if (search) {
      // 搜索文章标题、作者名，或内容块的文本内容和标题
      whereConditions.push(`(
        a.title LIKE ? OR
        a.author LIKE ? OR
        (b.type = 'text' AND JSON_UNQUOTE(JSON_EXTRACT(b.content, '$.content')) LIKE ?) OR
        (b.type IN ('code', 'image') AND JSON_UNQUOTE(JSON_EXTRACT(b.content, '$.title')) LIKE ?)
      )`);

      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.join(' AND ');

    // 查询用户有权限访问的blocks，按照created_at降序排列
    // 权限不足的内容直接不返回，支持搜索功能
    const blocksData = await query<any[]>(
      `SELECT
        b.id,
        b.type,
        b.content,
        b.created_at,
        a.title as article_title,
        a.author,
        COALESCE(b.access_level, 1) as access_level
       FROM blocks b
       LEFT JOIN article_blocks ab ON b.id = ab.block_id
       LEFT JOIN articles a ON ab.article_id = a.id
       WHERE ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      queryParams
    );

    // 获取总数（同样要考虑权限和搜索条件）
    const countQuery = `
      SELECT COUNT(*) as total
      FROM blocks b
      LEFT JOIN article_blocks ab ON b.id = ab.block_id
      LEFT JOIN articles a ON ab.article_id = a.id
      WHERE ${whereClause}
    `;
    const countResult = await query<any[]>(countQuery, queryParams);
    const total = countResult[0].total;

    // 处理数据：解析content为parsedContent
    const processedBlocks = blocksData.map(block => {
      let parsedContent = null;
      try {
        parsedContent = typeof block.content === 'string' ? JSON.parse(block.content) : block.content;
      } catch {
        parsedContent = block.content;
      }

      return {
        id: block.id,
        type: block.type,
        content: block.content,
        parsedContent,
        title: block.article_title,
        created_at: block.created_at,
        author: block.author,
        article_title: block.article_title || '未关联文章',
        access_level: block.access_level || 1,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        blocks: processedBlocks,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('获取blocks列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取blocks列表失败: ' + error.message },
      { status: 500 }
    );
  }
}
