/**
 * 静态文件服务 API
 * GET /api/uploads/[...path] - 服务 public/uploads 目录下的文件
 * 
 * 这个路由用于在 Docker 环境中服务通过 volume 挂载的上传文件
 * 因为 Next.js 在生产模式下可能无法直接服务挂载的 volume 文件
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 构建文件路径
    const filePath = path.join(
      process.cwd(),
      'public',
      'uploads',
      ...params.path
    );

    // 安全检查：确保路径在 uploads 目录内
    const resolvedPath = path.resolve(filePath);
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    
    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 403 }
      );
    }

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // 读取文件
    const fileBuffer = await readFile(filePath);
    
    // 获取 MIME 类型
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    // 返回文件
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('文件服务失败:', error);
    return NextResponse.json(
      { error: 'Failed to serve file: ' + error.message },
      { status: 500 }
    );
  }
}

