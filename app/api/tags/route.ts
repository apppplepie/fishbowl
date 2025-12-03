import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/tags
 * 获取所有标签
 */
export async function GET(request: NextRequest) {
  try {
    const tags = await query<any[]>(
      `SELECT id, name, created_at, updated_at 
       FROM tags 
       ORDER BY name ASC`
    );

    return NextResponse.json({
      success: true,
      tags,
    });
  } catch (error: any) {
    console.error('获取标签失败:', error);
    return NextResponse.json(
      { success: false, error: '获取标签失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tags
 * 创建新标签
 */
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: '标签名称不能为空' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return NextResponse.json(
        { success: false, error: '标签名称不能为空' },
        { status: 400 }
      );
    }

    if (trimmedName.length > 50) {
      return NextResponse.json(
        { success: false, error: '标签名称最多 50 个字符' },
        { status: 400 }
      );
    }

    // 检查标签是否已存在
    const existingTags = await query<any[]>(
      'SELECT id FROM tags WHERE name = ?',
      [trimmedName]
    );

    if (existingTags.length > 0) {
      return NextResponse.json({
        success: true,
        tag: existingTags[0],
        message: '标签已存在',
      });
    }

    // 创建新标签
    const tagId = uuidv4();
    await query(
      'INSERT INTO tags (id, name) VALUES (?, ?)',
      [tagId, trimmedName]
    );

    return NextResponse.json({
      success: true,
      tag: { id: tagId, name: trimmedName },
      message: '标签创建成功',
    });
  } catch (error: any) {
    console.error('创建标签失败:', error);
    return NextResponse.json(
      { success: false, error: '创建标签失败' },
      { status: 500 }
    );
  }
}

