/**
 * 数据库迁移脚本 - 将图片块迁移到 media 表
 * 
 * 功能：
 * 1. 从 blocks 表中提取图片 URL（支持远程 URL、相对路径、base64）
 * 2. 计算 sha256、获取宽高和大小
 * 3. 插入 media 表（如已存在相同 sha 则复用）
 * 4. 更新 blocks.media_id
 * 
 * 运行方法: npm run db:migrate:media
 * 或: npx ts-node --project tsconfig.node.json scripts/migrate-to-media.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// 先加载 .env，再加载 .env.local（本地覆盖，含 DB_NAME 等）
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import mysql from 'mysql2/promise';
import axios from 'axios';
import sizeOf from 'image-size';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { getConnectionConfig } from '../lib/db-config';

// 如果 content 中是相对路径，拼接域名（用于远程 URL）
const BASE_ORIGIN = process.env.BASE_ORIGIN || 'https://yourcdn.example.com';

// 本地文件根目录（支持子目录，如 uploads/2025/12、uploads/2026/01）
const UPLOADS_DIR = path.resolve(__dirname, '../public/uploads');

// 批量大小
const BATCH_SIZE = 200;

// 错误日志文件
const ERROR_LOG = path.resolve(__dirname, 'migrate-media-errors.log');

/**
 * 从 blocks.content (JSON) 中提取图片 URL
 */
function extractImageUrl(content: string): string | null {
  if (!content) return null;

  try {
    // 尝试解析 JSON（图片块格式：{ url, title, description }）
    const parsed = JSON.parse(content);
    if (parsed.url) {
      const u = parsed.url.trim();
      // 统一为可解析路径：相对路径补全为 /uploads/...
      if (u && !u.startsWith('http') && !u.startsWith('data:')) {
        if (u.startsWith('/uploads/') || u.startsWith('/')) return u;
        if (u.startsWith('uploads/')) return '/' + u;
        return '/uploads/' + u; // 如 "2025/12/xxx.jpg" -> "/uploads/2025/12/xxx.jpg"
      }
      return u || null;
    }
    // 如果 content 字段直接是 URL（旧格式兼容）
    if (parsed.content && typeof parsed.content === 'string') {
      const urlMatch = parsed.content.match(/(https?:\/\/[^\s'"]+)|(\/uploads\/[^\s'"]+)|(\/[^'"\s]+\.(jpg|jpeg|png|webp|gif))/i);
      if (urlMatch) return urlMatch[0];
    }
  } catch (e) {
    // 如果不是 JSON，尝试直接匹配 URL
    const dataMatch = content.match(/(data:image\/[a-zA-Z+]+;base64,[\s\S]+)/);
    if (dataMatch) return dataMatch[1];

    const urlMatch = content.match(/(https?:\/\/[^\s'"]+)|(\/uploads\/[^\s'"]+)|(\/[^'"\s]+\.(jpg|jpeg|png|webp|gif))/i);
    if (urlMatch) return urlMatch[0];
  }

  return null;
}

/**
 * 从 URL 获取图片 buffer
 */
async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; source: string }> {
  // base64 data URI
  if (url.startsWith('data:image/')) {
    const parts = url.split(',');
    if (parts.length < 2) {
      throw new Error('Invalid base64 data URI');
    }
    const buffer = Buffer.from(parts[1], 'base64');
    return { buffer, source: 'base64' };
  }

  // 本地文件路径：/uploads/2025/12/xxx.jpg、/uploads/2026/01/xxx.png 等（支持任意子目录）
  if (url.startsWith('/uploads/') || (url.startsWith('/') && /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url))) {
    // 去掉开头的 /uploads/ 或 /，得到相对 uploads 的路径，如 2025/12/xxx.jpg
    const relativePath = url.replace(/^\/uploads\//, '').replace(/^\//, '');
    const localPath = path.join(UPLOADS_DIR, relativePath);
    
    // 检查文件是否存在
    if (!fs.existsSync(localPath)) {
      // 如果本地不存在，尝试拼接 BASE_ORIGIN 作为远程 URL
      const remoteUrl = BASE_ORIGIN + url;
      console.log(`  ⚠️  本地文件不存在，尝试远程: ${remoteUrl}`);
      try {
        const res = await axios.get(remoteUrl, { 
          responseType: 'arraybuffer', 
          timeout: 20000 
        });
        return { 
          buffer: Buffer.from(res.data), 
          source: BASE_ORIGIN && url.startsWith(BASE_ORIGIN) ? 'cdn' : 'external' 
        };
      } catch (err) {
        throw new Error(`本地文件不存在且远程获取失败: ${localPath}`);
      }
    }

    const buffer = fs.readFileSync(localPath);
    return { buffer, source: 'local' };
  }

  // 远程 URL
  const res = await axios.get(url, { 
    responseType: 'arraybuffer', 
    timeout: 20000 
  });
  const source = url.startsWith(BASE_ORIGIN) ? 'cdn' : 'external';
  return { buffer: Buffer.from(res.data), source };
}

/**
 * 处理单个 block
 */
async function processBlock(conn: mysql.Connection, block: { id: string; content: string }) {
  const { id, content } = block;

  // 提取图片 URL
  const imageUrl = extractImageUrl(content);
  if (!imageUrl) {
    return { id, ok: false, reason: 'no-image-url' };
  }

  // 获取图片 buffer
  let buffer: Buffer;
  let source: string;
  try {
    const result = await fetchImageBuffer(imageUrl);
    buffer = result.buffer;
    source = result.source;
  } catch (err: any) {
    console.error(`  ❌ 获取图片失败 [${id}]:`, err.message);
    return { id, ok: false, reason: 'fetch-fail', error: err.message, url: imageUrl };
  }

  // 计算 sha256
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  // 获取图片尺寸和 MIME
  let mime: string | null = null;
  let width: number | null = null;
  let height: number | null = null;
  let aspectRatio: string | null = null;
  let orientation: number | null = null;

  try {
    const dimensions = sizeOf(buffer);
    if (dimensions) {
      width = dimensions.width || null;
      height = dimensions.height || null;
      aspectRatio = width && height ? (width / height).toFixed(6) : null;
      
      // image-size 返回的 type 可能是 'jpg', 'png' 等
      if (dimensions.type) {
        mime = `image/${dimensions.type}`;
      }
    }
  } catch (err) {
    // 如果无法解析尺寸，继续处理（可能是非图片文件或损坏）
    console.warn(`  ⚠️  无法获取图片尺寸 [${id}]`);
  }

  // 如果没有从 image-size 获取到 mime，尝试从 URL 推断
  if (!mime) {
    if (imageUrl.startsWith('data:image/')) {
      const mimeMatch = imageUrl.match(/data:image\/([a-zA-Z+]+);/);
      if (mimeMatch) mime = `image/${mimeMatch[1]}`;
    } else {
      const extMatch = imageUrl.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i);
      if (extMatch) {
        const ext = extMatch[1].toLowerCase();
        mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      }
    }
  }

  const sizeBytes = buffer.length;

  try {
    // 检查是否已存在相同 sha256 的 media
    const [existing] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM media WHERE sha256 = ? LIMIT 1',
      [sha256]
    );

    let mediaId: string;

    if (existing.length > 0) {
      // 复用已存在的 media
      mediaId = existing[0].id;
      console.log(`  ♻️  复用已有 media [${id}] -> media_id: ${mediaId}`);
    } else {
      // 创建新的 media 记录
      mediaId = uuidv4();
      
      // 存储 URL：base64 用特殊标记，相对路径拼接 BASE_ORIGIN，远程 URL 保持原样
      let storedUrl: string;
      if (imageUrl.startsWith('data:image/')) {
        storedUrl = `inline://${mediaId}`;
      } else if (imageUrl.startsWith('/')) {
        storedUrl = BASE_ORIGIN + imageUrl;
      } else {
        storedUrl = imageUrl;
      }

      await conn.execute(
        `INSERT INTO media (
          id, url, mime, width, height, aspect_ratio, size_bytes, sha256, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [mediaId, storedUrl, mime, width, height, aspectRatio, sizeBytes, sha256, source]
      );

      console.log(`  ✅ 创建新 media [${id}] -> media_id: ${mediaId} (${width}x${height}, ${(sizeBytes / 1024).toFixed(2)}KB)`);
    }

    // 更新 blocks.media_id
    await conn.execute(
      'UPDATE blocks SET media_id = ? WHERE id = ?',
      [mediaId, id]
    );

    return { id, ok: true, mediaId, reused: existing.length > 0 };
  } catch (err: any) {
    console.error(`  ❌ 数据库操作失败 [${id}]:`, err.message);
    return { id, ok: false, reason: 'db-fail', error: err.message };
  }
}

/**
 * 主函数
 */
async function migrateToMedia() {
  console.log('🚀 开始迁移图片到 media 表...\n');

  // 创建数据库连接
  const conn = await mysql.createConnection(getConnectionConfig());
  console.log('✅ 数据库连接成功\n');

  try {
    // 检查 media 表是否存在
    const [tables] = await conn.execute<mysql.RowDataPacket[]>(
      "SHOW TABLES LIKE 'media'"
    );
    if (tables.length === 0) {
      console.error('❌ media 表不存在，请先创建 media 表！');
      process.exit(1);
    }

    // 检查 blocks.media_id 列是否存在
    const [columns] = await conn.execute<mysql.RowDataPacket[]>(
      "SHOW COLUMNS FROM blocks LIKE 'media_id'"
    );
    if (columns.length === 0) {
      console.error('❌ blocks.media_id 列不存在，请先执行 ALTER TABLE 添加该列！');
      process.exit(1);
    }

    let offset = 0;
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalReused = 0;

    console.log(`📦 批量大小: ${BATCH_SIZE}`);
    console.log(`📁 本地文件目录: ${UPLOADS_DIR}`);
    console.log(`🌐 BASE_ORIGIN: ${BASE_ORIGIN}\n`);

    while (true) {
      // 查询需要处理的 blocks（type='image' 且 media_id 为空）
      // 注意：LIMIT 和 OFFSET 在 MySQL 中不能使用参数化查询，需要直接拼接数字
      // 由于 BATCH_SIZE 和 offset 都是代码中控制的数字，使用模板字符串是安全的
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT id, content FROM blocks 
         WHERE type = 'image' 
         AND (media_id IS NULL OR media_id = '')
         LIMIT ${BATCH_SIZE} OFFSET ${offset}`
      );

      if (rows.length === 0) {
        break;
      }

      console.log(`\n📋 处理批次 [offset: ${offset}, size: ${rows.length}]`);

      for (const row of rows) {
        totalProcessed++;
        const result = await processBlock(conn, {
          id: row.id,
          content: row.content
        });

        if (result.ok) {
          totalSuccess++;
          if (result.reused) {
            totalReused++;
          }
        } else {
          totalFailed++;
          // 记录错误到日志文件
          fs.appendFileSync(
            ERROR_LOG,
            JSON.stringify({ ...result, timestamp: new Date().toISOString() }) + '\n'
          );
        }
      }

      offset += rows.length;

      // 短暂暂停，避免过载
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 迁移完成！');
    console.log('='.repeat(60));
    console.log(`📊 统计信息:`);
    console.log(`   - 总处理数: ${totalProcessed}`);
    console.log(`   - 成功: ${totalSuccess}`);
    console.log(`   - 失败: ${totalFailed}`);
    console.log(`   - 复用已有: ${totalReused}`);
    console.log(`   - 新建: ${totalSuccess - totalReused}`);
    if (totalFailed > 0) {
      console.log(`\n⚠️  失败记录已保存到: ${ERROR_LOG}`);
    }
    console.log('='.repeat(60));
  } catch (error: any) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

// 运行迁移
migrateToMedia().catch((error) => {
  console.error('❌ 未捕获的错误:', error);
  process.exit(1);
});
