/**
 * 单篇文章 API 路由
 * GET /api/articles/[id] - 获取单篇文章详情（包括所有块）
 * PUT /api/articles/[id] - 更新文章（需要权限）
 * DELETE /api/articles/[id] - 删除文章（需要权限）
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, canModerate, canEditArticle } from '@/lib/auth';

// 权限检查函数
function checkAccess(userAccessLevel: number, blockAccessLevel: number): boolean {
  return userAccessLevel >= blockAccessLevel;
}

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

    console.log('PUT /api/articles/[id] - Received body:', JSON.stringify(body, null, 2));

    // 1. 验证用户登录
    const currentUser = getCurrentUser(request);
    console.log('PUT /api/articles/[id] - articleId:', articleId, 'currentUser:', currentUser);
    
    if (!currentUser) {
      console.log('PUT /api/articles/[id] - 未登录，Cookie:', request.headers.get('cookie')?.substring(0, 100));
      return NextResponse.json(
        { success: false, error: '请先登录。如果已登录，请刷新页面后重试。' },
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

    // 3. 权限检查：使用统一的权限检查函数
    // - 管理员：可以编辑任何文章
    // - 版主：必须是作者才能编辑
    // - 普通用户：不能编辑文章（只能发评论）
    if (!canEditArticle(currentUser, article.author, article.author_id)) {
      return NextResponse.json(
        { success: false, error: '无权编辑此文章' },
        { status: 403 }
      );
    }

    // 4. 如果涉及分类或顺序调整，需要先处理同级所有节点的顺序（包括分类和文章）
    if (body.category_id !== undefined || body.order_index !== undefined) {
      // 获取当前文章的分类和顺序
      const currentArticle = await query<any[]>(
        'SELECT category_id, order_index FROM articles WHERE id = ?',
        [articleId]
      );

      if (currentArticle.length > 0) {
        const oldCategoryId = currentArticle[0].category_id;
        const oldOrder = currentArticle[0].order_index;
        const newCategoryId = body.category_id !== undefined ? body.category_id : oldCategoryId;
        const newOrder = body.order_index !== undefined ? body.order_index : oldOrder;

        const isSameCategory = oldCategoryId === newCategoryId;

        // 如果是同分类移动且指定了新顺序
        if (isSameCategory && newOrder !== oldOrder && body.order_index !== undefined) {
          // 先将当前文章的顺序设为临时值
          await query(
            'UPDATE articles SET order_index = -1 WHERE id = ?',
            [articleId]
          );

          // 调整所有同级节点的顺序（包括分类和文章）
          if (newOrder < oldOrder) {
            // 向前移动：将 [newOrder, oldOrder) 区间的所有节点都 +1
            // 更新分类
            await query(
              `UPDATE categories 
               SET order_index = order_index + 1 
               WHERE ${newCategoryId ? 'parent_id = ?' : 'parent_id IS NULL'}
               AND order_index >= ? AND order_index < ?`,
              newCategoryId 
                ? [newCategoryId, newOrder, oldOrder]
                : [newOrder, oldOrder]
            );
            // 更新文章
            await query(
              `UPDATE articles 
               SET order_index = order_index + 1 
               WHERE category_id = ? AND order_index >= ? AND order_index < ? AND id != ?`,
              [newCategoryId, newOrder, oldOrder, articleId]
            );
          } else {
            // 向后移动：将 (oldOrder, newOrder] 区间的所有节点都 -1
            // 更新分类
            await query(
              `UPDATE categories 
               SET order_index = order_index - 1 
               WHERE ${newCategoryId ? 'parent_id = ?' : 'parent_id IS NULL'}
               AND order_index > ? AND order_index <= ?`,
              newCategoryId 
                ? [newCategoryId, oldOrder, newOrder]
                : [oldOrder, newOrder]
            );
            // 更新文章
            await query(
              `UPDATE articles 
               SET order_index = order_index - 1 
               WHERE category_id = ? AND order_index > ? AND order_index <= ? AND id != ?`,
              [newCategoryId, oldOrder, newOrder, articleId]
            );
          }
        } else if (!isSameCategory && body.order_index !== undefined) {
          // 不同分类移动：在目标分类中为所有节点（分类和文章）腾出空间
          // 更新分类
          await query(
            `UPDATE categories 
             SET order_index = order_index + 1 
             WHERE ${newCategoryId ? 'parent_id = ?' : 'parent_id IS NULL'}
             AND order_index >= ?`,
            newCategoryId ? [newCategoryId, newOrder] : [newOrder]
          );
          // 更新文章
          await query(
            `UPDATE articles 
             SET order_index = order_index + 1 
             WHERE category_id = ? AND order_index >= ? AND id != ?`,
            [newCategoryId, newOrder, articleId]
          );
        }
      }
    }

    // 5. 构建动态更新字段
    // updated_at会自动更新，不需要手动设置
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    // 如果提供了标题，更新标题
    if (body.title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(body.title);
    }

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

    // 如果提供了 order_index，更新顺序
    if (body.order_index !== undefined) {
      updateFields.push('order_index = ?');
      updateValues.push(body.order_index);
    }

    // 如果提供了 excerpt，更新摘要
    if (body.excerpt !== undefined) {
      updateFields.push('excerpt = ?');
      updateValues.push(body.excerpt);
    }

    // 如果提供了 max_access_level，更新最大访问等级
    if (body.max_access_level !== undefined) {
      updateFields.push('max_access_level = ?');
      updateValues.push(body.max_access_level);
    }

    // 确保至少有一个字段要更新
    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有需要更新的字段' },
        { status: 400 }
      );
    }

    // 6. 更新文章基本信息
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
          `INSERT INTO blocks (id, type, content, author, access_level)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE content = VALUES(content), access_level = VALUES(access_level)`,
          [
            blockId,
            block.type,
            JSON.stringify(blockContent),
            'system', // 编辑时使用系统作为作者
            block.access_level || 1, // 添加 access_level，默认值为1
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

      // 处理封面图片：优先使用前端指定的值，否则自动计算
      let coverImage = body.cover_image || null;
      let coverAccessLevel = body.cover_access_level || 1;

      // 如果前端没有指定封面，则自动计算
      if (coverImage === null || coverImage === undefined) {
        if (body.blocks && body.blocks.length > 0) {
          // 找到所有图片block
          const imageBlocks = body.blocks.filter((block: any) => block.type === 'image');

          if (imageBlocks.length > 0) {
            // 按access_level升序排序，找到权限最低的图片
            const lowestAccessImage = imageBlocks.sort((a: any, b: any) => (a.access_level || 1) - (b.access_level || 1))[0];

            if (lowestAccessImage && lowestAccessImage.imageUrl) {
              coverImage = {
                url: lowestAccessImage.imageUrl,
                title: lowestAccessImage.title || '',
                description: lowestAccessImage.description || ''
              };
              coverAccessLevel = lowestAccessImage.access_level || 1;
            }
          }
        }
      }

      // 更新封面信息
      await query(
        'UPDATE articles SET cover_image = ?, cover_access_level = ? WHERE id = ?',
        [coverImage ? JSON.stringify(coverImage) : null, coverAccessLevel, articleId]
      );
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

    // 3. 权限检查：使用统一的权限检查函数
    // - 管理员：可以删除任何文章
    // - 版主：必须是作者才能删除
    // - 普通用户：必须是作者才能删除
    if (!canEditArticle(currentUser, article.author, article.author_id)) {
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

    // 1. 获取当前用户（用于权限检查）
    const currentUser = getCurrentUser(request);
    const userAccessLevel = currentUser ? (currentUser.max_access_level || 3) : 2; // 登录用户默认3级，游客2级

    // 2. 获取文章基本信息
    const articles = await query<any[]>(
      `SELECT 
        id, title, author, published_at, created_at, updated_at,
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
        b.id, b.type, b.content, b.author, b.created_at, b.access_level,
        ab.\`order\` as \`order\`
       FROM blocks b
       INNER JOIN article_blocks ab ON b.id = ab.block_id
       WHERE ab.article_id = ?
       ORDER BY ab.\`order\` ASC`,
      [articleId]
    );

    // 3. 解析块的 content 并检查权限
    const parsedBlocks = blocks.map(block => {
      try {
        // 权限检查
        if (!checkAccess(userAccessLevel, block.access_level || 1)) {
          // 权限不足，返回占位块
          return {
            id: block.id,
            type: 'placeholder',
            order: block.order,
            original_type: block.type,
            required_access_level: block.access_level || 1,
            user_access_level: userAccessLevel,
            message: `需要等级${block.access_level || 1}及以上权限才能查看此内容`,
          };
        }

        // 权限足够，返回真实内容
        return {
          ...block,
          order: block.order,
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

