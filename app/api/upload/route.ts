/**
 * 文件上传 API
 * POST /api/upload - 上传图片文件
 */
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST - 上传图片
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '没有文件被上传' },
        { status: 400 }
      );
    }

    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '只支持图片格式：JPEG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    // 检查文件大小（限制 5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件大小不能超过 5MB' },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 获取文件扩展名
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}.${ext}`;

    // 保存文件到 public/uploads 文件夹
    const filepath = join(process.cwd(), 'public', 'uploads', filename);
    await writeFile(filepath, buffer);

    // 返回文件的访问 URL
    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: filename,
      size: file.size,
      type: file.type,
    });

  } catch (error: any) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      { error: '文件上传失败: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取上传文件列表（可选功能）
 */
export async function GET() {
  return NextResponse.json({
    message: '文件上传 API',
    usage: 'POST /api/upload',
    params: {
      file: 'File to upload (multipart/form-data)',
    },
    limits: {
      maxSize: '5MB',
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    },
  });
}

