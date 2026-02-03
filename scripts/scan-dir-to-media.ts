/**
 * 扫描本地目录中的图片文件，写入 media 表
 *
 * 适用场景：服务器用 Docker 卷把图片挂到某目录（如 /update），已有一堆图片，
 * 需要把这些文件登记到 media 表，供文章/图库等引用。
 *
 * 环境变量：
 *   MEDIA_SCAN_DIR  要扫描的目录（默认：项目 public/uploads）
 *                    服务器上卷挂到 /update 时，可设 MEDIA_SCAN_DIR=/update
 *   URL_PREFIX      存到 media.url 的前缀（默认：/uploads/）
 *                    最终 url = URL_PREFIX + 相对路径，例如 /uploads/2025/12/xxx.jpg
 *
 * 运行方法:
 *   npm run db:scan:media
 *
 * Docker 卷挂载建议:
 *   - 若宿主机 /update 挂到容器内 public/uploads（如 -v /update:/app/public/uploads），
 *     可直接在容器内执行 npm run db:scan:media，无需设置环境变量。
 *   - 若宿主机 /update 挂到容器内 /update，则执行:
 *     MEDIA_SCAN_DIR=/update npm run db:scan:media
 *     且需保证应用能通过 /uploads/* 访问到该目录（例如 rewrites 或同样挂到 public/uploads）。
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import sizeOf from 'image-size';
import { getConnectionConfig } from '../lib/db-config';

const MEDIA_SCAN_DIR = process.env.MEDIA_SCAN_DIR || path.resolve(__dirname, '../public/uploads');
const URL_PREFIX = (process.env.URL_PREFIX || '/uploads/').replace(/\/*$/, '/'); // 保证末尾一个 /

const IMAGE_EXT = /\.(jpg|jpeg|png|webp|gif|svg)$/i;

/**
 * 递归收集目录下所有图片文件路径（相对 MEDIA_SCAN_DIR）
 */
function collectImageFiles(dir: string, baseDir: string, list: string[]): void {
  if (!fs.existsSync(dir)) {
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(baseDir, full);
    if (e.isDirectory()) {
      collectImageFiles(full, baseDir, list);
    } else if (e.isFile() && IMAGE_EXT.test(e.name)) {
      list.push(rel.split(path.sep).join('/')); // 统一为 /
    }
  }
}

function getMimeFromExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase().slice(1);
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg') return 'image/svg+xml';
  return `image/${ext}`;
}

async function main() {
  console.log('🚀 扫描目录并写入 media 表...\n');
  console.log(`📁 扫描目录: ${MEDIA_SCAN_DIR}`);
  console.log(`🔗 URL 前缀: ${URL_PREFIX}\n`);

  if (!fs.existsSync(MEDIA_SCAN_DIR)) {
    console.error(`❌ 目录不存在: ${MEDIA_SCAN_DIR}`);
    process.exit(1);
  }

  const files: string[] = [];
  collectImageFiles(MEDIA_SCAN_DIR, MEDIA_SCAN_DIR, files);
  console.log(`📋 共发现 ${files.length} 个图片文件\n`);

  if (files.length === 0) {
    console.log('没有可处理的文件，退出。');
    return;
  }

  const conn = await mysql.createConnection(getConnectionConfig());
  console.log('✅ 数据库连接成功\n');

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const relativePath = files[i];
    const fullPath = path.join(MEDIA_SCAN_DIR, relativePath);
    const storedUrl = URL_PREFIX + relativePath;

    try {
      const buffer = fs.readFileSync(fullPath);
      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      const sizeBytes = buffer.length;

      const [existing] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT id FROM media WHERE sha256 = ? LIMIT 1',
        [sha256]
      );

      if (existing.length > 0) {
        skipped++;
        if ((i + 1) % 50 === 0 || i === 0) {
          console.log(`  ♻️  跳过已存在 [${i + 1}/${files.length}] ${relativePath}`);
        }
        continue;
      }

      let mime: string = getMimeFromExt(relativePath);
      let width: number | null = null;
      let height: number | null = null;
      let aspectRatio: string | null = null;
      let orientation: number | null = null;

      try {
        const dimensions = sizeOf(buffer);
        if (dimensions) {
          width = dimensions.width ?? null;
          height = dimensions.height ?? null;
          aspectRatio = width && height ? (width / height).toFixed(6) : null;
          orientation = dimensions.orientation ?? null;
          if (dimensions.type) {
            mime = dimensions.type === 'jpg' ? 'image/jpeg' : `image/${dimensions.type}`;
          }
        }
      } catch {
        // 部分格式（如 svg）可能解析不出尺寸，继续用扩展名 mime
      }

      const mediaId = uuidv4();
      await conn.execute(
        `INSERT INTO media (
          id, url, mime, width, height, aspect_ratio, size_bytes, sha256,
          variants, orientation, source, blur_data_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'local', NULL)`,
        [
          mediaId,
          storedUrl,
          mime,
          width,
          height,
          aspectRatio,
          sizeBytes,
          sha256,
          orientation,
        ]
      );

      inserted++;
      if (inserted <= 20 || (inserted % 100 === 0)) {
        console.log(`  ✅ [${i + 1}/${files.length}] ${storedUrl} (${width ?? '?'}x${height ?? '?'}, ${(sizeBytes / 1024).toFixed(2)}KB)`);
      }
    } catch (err: any) {
      failed++;
      console.error(`  ❌ ${relativePath}: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 扫描入库完成');
  console.log('='.repeat(60));
  console.log(`  新增: ${inserted}  跳过(已存在): ${skipped}  失败: ${failed}`);
  console.log('='.repeat(60));

  await conn.end();
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
