// /app/api/upload/route.ts 或你当前的 upload 路由文件
import { NextRequest, NextResponse } from 'next/server';
import { mkdir, readFile } from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { pipeline } from 'stream/promises';
import { getCurrentUser, canModerate } from '@/lib/auth';
import { query } from '@/lib/db';
import { generateBlurDataURL } from '@/lib/blur';
import sizeOf from 'image-size';
import crypto from 'crypto';

// 保证在 Node runtime（以便使用文件流等 Node 特性）
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 权限校验
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    if (!canModerate(currentUser)) {
      return NextResponse.json({ error: '无权上传文件，仅管理员或版主可操作' }, { status: 403 });
    }

    // 解析 formData（注意：这里仍会返回 File 对象，但我们用 stream()）
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '没有上传文件' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '只能上传图片文件' }, { status: 400 });
    }

    // 生成文件名
    const ext = path.extname((file as any).name || ''); // file.name 在 Web File 上可用
    const filename = `${uuidv4()}${ext || ''}`;

    // 按日期分类存储
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', String(year), month);
    const filePath = path.join(uploadDir, filename);

    // 确保目录存在
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // —— 核心：流式写入文件（避免 arrayBuffer）
    // file.stream() 返回一个 WHATWG ReadableStream（浏览器标准）
    // 在 Node runtime 中可以将它转换为 Node 可读流 via .stream() -> we can use pipeline + createWriteStream
    const readable = (file as any).stream?.(); // Type coercion 因 NextRequest 的 File 类型可能不同
    if (!readable) {
      // 兜底：如果没有 stream 接口，再退回到 arrayBuffer（极少见）
      const bytes = await file.arrayBuffer();
      await import('fs/promises').then(({ writeFile }) => writeFile(filePath, Buffer.from(bytes)));
    } else {
      // readable 是 WHATWG ReadableStream —— 转换为 Node 可读流（Node 18+ 提供 readable stream fromWeb）
      // 如果 Node 提供了 Readable.fromWeb（或 stream/web），则直接用 pipeline
      // Node 18+:
      // import { pipeline } from 'stream/promises';
      // import { Readable } from 'stream';
      const { Readable } = await import('stream');
      const nodeReadable = Readable.fromWeb ? Readable.fromWeb(readable) : Readable.from(readable as any);
      const writeStream = createWriteStream(filePath, { flags: 'w' });

      // 使用 pipeline 保证异常会被捕获并正确关闭流
      await pipeline(nodeReadable, writeStream);
    }

    const fileUrl = `/uploads/${year}/${month}/${filename}`;
    const sizeBytes = (file as any).size ?? 0;

    // 计算尺寸并写入 media 表，供列表占位与瀑布流使用
    let mediaId: string | null = null;
    let width: number | null = null;
    let height: number | null = null;
    let aspectRatio: number | null = null;
    try {
      const buffer = await readFile(filePath);
      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      let dims: { width?: number; height?: number; type?: string } | null = null;
      try {
        dims = sizeOf(buffer);
      } catch {
        dims = null;
      }
      width = dims?.width ?? null;
      height = dims?.height ?? null;
      aspectRatio = width && height ? Number((width / height).toFixed(6)) : null;
      const mime = dims?.type ? `image/${dims.type}` : (file as any).type || null;

      let blurDataUrl: string | null = null;
      try {
        blurDataUrl = await generateBlurDataURL(buffer);
      } catch (blurErr: any) {
        console.warn('LQIP 生成失败，跳过 blur_data_url:', blurErr?.message);
      }

      const existing = await query<{ id: string }[]>(
        'SELECT id FROM media WHERE sha256 = ? LIMIT 1',
        [sha256]
      );
      if (existing.length > 0) {
        mediaId = existing[0].id;
      } else {
        mediaId = uuidv4();
        await query(
          `INSERT INTO media (id, url, mime, width, height, aspect_ratio, size_bytes, sha256, source, blur_data_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local', ?)`,
          [mediaId, fileUrl, mime, width, height, aspectRatio, buffer.length, sha256, blurDataUrl]
        );
      }
    } catch (mediaErr: any) {
      console.warn('media 写入失败，仅返回 url:', mediaErr?.message);
    }

    console.log('文件上传成功:', {
      originalName: (file as any).name,
      size: sizeBytes,
      type: (file as any).type,
      url: fileUrl,
      media_id: mediaId,
    });

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename,
      size: sizeBytes,
      media_id: mediaId ?? undefined,
      width: width ?? undefined,
      height: height ?? undefined,
      aspect_ratio: aspectRatio ?? undefined,
    });
  } catch (error: any) {
    console.error('文件上传失败:', error);
    return NextResponse.json({ error: '文件上传失败: ' + (error?.message || String(error)) }, { status: 500 });
  }
}
