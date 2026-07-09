/**
 * GPT Actions 图片上传接口
 *
 * POST /api/gpt/upload - 上传图片（Base64 编码方式）
 *
 * 注意：GPT Actions 不支持 multipart/form-data，只能通过 JSON 发送 Base64
 */
import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile, readFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticateGptRequest } from '@/lib/gptAuth';
import { query } from '@/lib/db';
import { generateBlurDataURL } from '@/lib/blur';
import sizeOf from 'image-size';
import crypto from 'crypto';
import { existsSync } from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 最大文件大小：5MB (Base64 编码后会大 33%，所以实际限制约 3.75MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 支持的图片类型
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface GptUploadRequest {
  base64: string;        // Base64 编码的图片，格式：data:image/png;base64,xxxxxx
  filename?: string;     // 可选文件名
  title?: string;        // 可选图片标题
  description?: string;  // 可选图片描述
}

/**
 * 解析 Base64 数据，获取 MIME 类型和二进制 Buffer
 */
function parseBase64Data(base64Str: string): { mimeType: string; buffer: Buffer } {
  // 格式校验: data:image/xxx;base64,xxxxxx
  const match = base64Str.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);

  if (!match) {
    throw new Error('Invalid base64 format. Expected: data:image/xxx;base64,xxxxxx');
  }

  const mimeType = match[1];
  const base64Data = match[2];

  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}. Supported: ${SUPPORTED_MIME_TYPES.join(', ')}`);
  }

  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB. Max: 5MB`);
  }

  return { mimeType, buffer };
}

/**
 * 根据 MIME 类型获取文件扩展名
 */
function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  return map[mimeType] || '.png';
}

export async function POST(request: NextRequest) {
  try {
    // 1. 认证 GPT 请求
    const auth = await authenticateGptRequest(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body: GptUploadRequest = await request.json();

    if (!body.base64) {
      return NextResponse.json(
        { success: false, error: 'base64 field is required' },
        { status: 400 }
      );
    }

    // 3. 解析 Base64 图片
    const { mimeType, buffer } = parseBase64Data(body.base64);
    const ext = getExtension(mimeType);
    const filename = body.filename || `${uuidv4()}${ext}`;

    // 4. 按日期分类存储
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', String(year), month);
    const filePath = path.join(uploadDir, filename);

    // 确保目录存在
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 5. 写入文件
    await writeFile(filePath, buffer);

    // 6. 计算文件哈希和尺寸
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    let width: number | null = null;
    let height: number | null = null;
    let aspectRatio: number | null = null;

    try {
      const dims = sizeOf(buffer);
      width = dims.width || null;
      height = dims.height || null;
      aspectRatio = width && height ? Number((width / height).toFixed(6)) : null;
    } catch {
      // 忽略尺寸计算失败
    }

    // 7. 生成模糊占位图
    let blurDataUrl: string | null = null;
    try {
      blurDataUrl = await generateBlurDataURL(buffer);
    } catch {
      // 忽略模糊图生成失败
    }

    // 8. 写入 media 表（检查重复）
    let mediaId: string;
    const existing = await query<any[]>(
      'SELECT id FROM media WHERE sha256 = ? LIMIT 1',
      [sha256]
    );

    if (existing.length > 0) {
      mediaId = existing[0].id;
      console.log(`[GPT Actions] 图片已存在: ${mediaId}`);
    } else {
      mediaId = uuidv4();
      await query(
        `INSERT INTO media (id, url, mime, width, height, aspect_ratio, size_bytes, sha256, source, blur_data_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'gpt', ?)`,
        [
          mediaId,
          `/uploads/${year}/${month}/${filename}`,
          mimeType,
          width,
          height,
          aspectRatio,
          buffer.length,
          sha256,
          blurDataUrl,
        ]
      );
      console.log(`[GPT Actions] 图片上传成功: ${mediaId} (${mimeType}, ${buffer.length} bytes)`);
    }

    // 9. 返回结果
    const fileUrl = `/uploads/${year}/${month}/${filename}`;
    const fullUrl = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost'}${fileUrl}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fullUrl,
      media_id: mediaId,
      filename,
      mimeType,
      sizeBytes: buffer.length,
      width: width ?? undefined,
      height: height ?? undefined,
      aspect_ratio: aspectRatio ?? undefined,
    });

  } catch (error: any) {
    console.error('[GPT Actions] /api/gpt/upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: error.message?.includes('Invalid') || error.message?.includes('Unsupported') ? 400 : 500 }
    );
  }
}
