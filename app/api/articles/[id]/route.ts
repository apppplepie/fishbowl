/**
 * 单篇文章 API 路由
 * GET /api/articles/[id] - 获取单篇文章详情（包括所有块）
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * PUT - 更新文章
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;
    const body = await request.json();

    // 验证必填字段
    if (!body.title) {
      return NextResponse.json(
        { error: '标题不能为空' },
        { status: 400 }
      );
    }

    const currentDate = new Date();

    // 如果提供了类型，更新类型
    let updateType = '';
    if (body.type) {
      updateType = `, type = ?`;
    }

    // 更新文章基本信息
    await query(
      `UPDATE articles 
       SET title = ?, last_modified = ?${updateType}
       WHERE id = ?`,
      body.type 
        ? [body.title, currentDate, body.type, articleId]
        : [body.title, currentDate, articleId]
    );

    // 如果提供了块数据，更新块
    if (body.blocks && Array.isArray(body.blocks)) {
      // 删除旧的文章-块关联
      await query(
        `DELETE FROM article_blocks WHERE article_id = ?`,
        [articleId]
      );

      // 重新插入块和关联
      for (let i = 0; i < body.blocks.length; i++) {
        const block = body.blocks[i];
        const blockId = block.id || `block-${Date.now()}-${i}`;

        // 构建块的 content（JSON 格式）
        let blockContent: any = {};
        
        if (block.type === 'text') {
          blockContent = {
            content: block.content || '',
          };
        } else if (block.type === 'image') {
          blockContent = {
            url: block.imageUrl || '',
            title: block.title || '',
            description: block.description || '',
          };
        } else if (block.type === 'code') {
          blockContent = {
            language: block.language || 'javascript',
            code: block.code || '',
            title: block.title || '',
          };
        }

        // 插入或更新块
        await query(
          `INSERT INTO blocks (id, type, content, author) 
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE content = VALUES(content)`,
          [
            blockId,
            block.type,
            JSON.stringify(blockContent),
            'system', // 编辑时使用系统作为作者
          ]
        );

        // 建立文章-块关联
        await query(
          `INSERT INTO article_blocks (article_id, block_id, \`order\`) 
           VALUES (?, ?, ?)`,
          [articleId, blockId, i]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '文章更新成功',
    });

  } catch (error: any) {
    console.error('更新文章失败:', error);
    return NextResponse.json(
      { error: '更新文章失败: ' + error.message },
      { status: 500 }
    );
  }
}

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
        excerpt, type, status, likes, shares, comments
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
        b.id, b.type, b.content, b.author, b.created_at,
        ab.\`order\` as \`order\`
       FROM blocks b
       INNER JOIN article_blocks ab ON b.id = ab.block_id
       WHERE ab.article_id = ?
       ORDER BY ab.\`order\` ASC`,
      [articleId]
    );

    // 3. 解析块的 content（JSON 字符串 -> 对象）
    const parsedBlocks = blocks.map(block => ({
      ...block,
      order: block.order, // 保留 order 字段
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

