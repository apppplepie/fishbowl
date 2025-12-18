/**
 * 文件上传 API
 * POST /api/upload - 上传图片到 public/uploads
 */
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser, canModerate } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 权限校验：仅管理员或版主可以上传文件
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    if (!canModerate(currentUser)) {
      return NextResponse.json(
        { error: '无权上传文件，仅管理员或版主可操作' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '没有上传文件' },
        { status: 400 }
      );
    }

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '只能上传图片文件' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 生成文件名（UUID + 原始扩展名）
    const ext = path.extname(file.name);
    const filename = `${uuidv4()}${ext}`;

    // 按日期分类存储：public/uploads/2024/12/
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // 构建存储路径
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', String(year), month);
    const filePath = path.join(uploadDir, filename);

    // 确保目录存在
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 保存文件
    await writeFile(filePath, buffer);

    // 返回可访问的 URL
    const fileUrl = `/uploads/${year}/${month}/${filename}`;

    console.log('文件上传成功:', {
      originalName: file.name,
      size: file.size,
      type: file.type,
      url: fileUrl,
    });

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: filename,
      size: file.size,
    });

  } catch (error: any) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      { error: '文件上传失败: ' + error.message },
      { status: 500 }
    );
  }
}
