/**
 * 单篇文章 API 路由
 * GET /api/articles/[id] - 获取单篇文章详情（包括所有块）
 * PUT /api/articles/[id] - 更新文章（需要权限）
 * DELETE /api/articles/[id] - 删除文章（需要权限）
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, canModerate } from '@/lib/auth';

/**
 * PUT - 更新文章（需要权限验证）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;
    const body = await request.json();

    // 1. 验证用户登录
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 2. 获取文章信息（检查文章是否存在和作者）
    const articles = await query(
      'SELECT id, author, author_id FROM articles WHERE id = ?',
      [articleId]
    ) as any[];

    if (!articles || articles.length === 0) {
      return NextResponse.json(
        { success: false, error: '文章不存在' },
        { status: 404 }
      );
    }

    const article = articles[0];

    // 3. 权限检查：作者本人 OR 管理员 OR 版主
    const isAuthor = 
      article.author === currentUser.username || 
      article.author_id === currentUser.id;
    const hasModeratePermission = canModerate(currentUser);

    if (!isAuthor && !hasModeratePermission) {
      return NextResponse.json(
        { success: false, error: '无权编辑此文章' },
        { status: 403 }
      );
    }

    // 4. 验证必填字段
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: '标题不能为空' },
        { status: 400 }
      );
    }

    const currentDate = new Date();

    // 构建动态更新字段
    const updateFields: string[] = ['title = ?', 'last_modified = ?'];
    const updateValues: any[] = [body.title, currentDate];

    // 如果提供了类型，更新类型
    if (body.type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(body.type);
    }

    // 如果提供了 category_id，更新分类
    if (body.category_id !== undefined) {
      updateFields.push('category_id = ?');
      updateValues.push(body.category_id);
    }

    // 更新文章基本信息
    await query(
      `UPDATE articles 
       SET ${updateFields.join(', ')}
       WHERE id = ?`,
      [...updateValues, articleId]
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

    // 如果提供了标签数据，更新标签
    if (body.tags !== undefined && Array.isArray(body.tags)) {
      // 删除旧的文章-标签关联
      await query(
        `DELETE FROM article_tags WHERE article_id = ?`,
        [articleId]
      );

      // 重新插入标签关联
      for (const tagName of body.tags) {
        if (!tagName || typeof tagName !== 'string') continue;
        
        const trimmedTagName = tagName.trim();
        if (!trimmedTagName) continue;

        // 查找或创建标签
        let tagId: string;
        const existingTags = await query<any[]>(
          'SELECT id FROM tags WHERE name = ?',
          [trimmedTagName]
        );

        if (existingTags.length > 0) {
          tagId = existingTags[0].id;
        } else {
          // 创建新标签
          const { v4: uuidv4 } = await import('uuid');
          tagId = uuidv4();
          await query(
            'INSERT INTO tags (id, name) VALUES (?, ?)',
            [tagId, trimmedTagName]
          );
        }

        // 建立文章-标签关联
        try {
          await query(
            'INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)',
            [articleId, tagId]
          );
        } catch (error: any) {
          // 忽略重复关联错误
          if (error.code !== 'ER_DUP_ENTRY') {
            throw error;
          }
        }
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
 * DELETE - 删除文章（需要权限验证）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;

    // 1. 验证用户登录
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 2. 检查文章是否存在并获取作者信息
    const articles = await query<any[]>(
      `SELECT id, title, author, author_id FROM articles WHERE id = ?`,
      [articleId]
    );

    if (!articles || articles.length === 0) {
      return NextResponse.json(
        { success: false, error: '文章不存在' },
        { status: 404 }
      );
    }

    const article = articles[0];

    // 3. 权限检查：作者本人 OR 管理员 OR 版主
    const isAuthor = 
      article.author === currentUser.username || 
      article.author_id === currentUser.id;
    const hasModeratePermission = canModerate(currentUser);

    if (!isAuthor && !hasModeratePermission) {
      return NextResponse.json(
        { success: false, error: '无权删除此文章' },
        { status: 403 }
      );
    }

    // 4. 删除文章（CASCADE 会自动删除关联的 article_blocks）
    await query(
      `DELETE FROM articles WHERE id = ?`,
      [articleId]
    );

    console.log(`文章已删除: ${article.title} (ID: ${articleId}) by ${currentUser.username}`);

    return NextResponse.json({
      success: true,
      message: '文章删除成功',
    });

  } catch (error: any) {
    console.error('删除文章失败:', error);
    return NextResponse.json(
      { success: false, error: '删除文章失败: ' + error.message },
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
        excerpt, type, category_id, status, likes, shares, comments
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
    const parsedBlocks = blocks.map(block => {
      try {
        return {
          ...block,
          order: block.order, // 保留 order 字段
          parsedContent: JSON.parse(block.content),
        };
      } catch (parseError) {
        console.error('解析块内容失败:', block.id, block.content, parseError);
        // 如果解析失败，返回原始内容
        return {
          ...block,
          order: block.order,
          parsedContent: { error: '内容解析失败', raw: block.content },
        };
      }
    });

    // 4. 获取文章的标签
    const tags = await query<any[]>(
      `SELECT t.id, t.name 
       FROM tags t
       JOIN article_tags at ON t.id = at.tag_id
       WHERE at.article_id = ?
       ORDER BY t.name ASC`,
      [articleId]
    );

    // 5. 组合返回
    return NextResponse.json({
      success: true,
      article: {
        ...article,
        blocks: parsedBlocks,
        tags: tags.map((t: any) => t.name),
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

