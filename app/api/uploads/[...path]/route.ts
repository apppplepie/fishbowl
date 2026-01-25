/**
 * 静态文件服务 API
 * GET /api/uploads/[...path] - 服务 public/uploads 目录下的文件
 * 
 * 这个路由用于在 Docker 环境中服务通过 volume 挂载的上传文件
 * 因为 Next.js 在生产模式下可能无法直接服务挂载的 volume 文件
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // 在 Next.js 15 中，params 是一个 Promise，需要 await
    const resolvedParams = await params;
    
    // 构建文件路径
    const filePath = path.join(
      process.cwd(),
      'public',
      'uploads',
      ...resolvedParams.path
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

    // 获取文件统计信息（用于生成 ETag）
    const fileStats = await stat(filePath);
    
    // 生成 ETag：基于文件修改时间和大小（高效且唯一）
    // 格式：W/"mtime-size"（弱 ETag，因为基于时间而非内容 hash）
    const etag = `W/"${fileStats.mtime.getTime()}-${fileStats.size}"`;

    // 检查客户端是否发送了 If-None-Match 头
    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch === etag) {
      // 文件未修改，返回 304 Not Modified（不传输文件内容）
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
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

    // 返回文件（包含 ETag 头）
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'ETag': etag,
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

