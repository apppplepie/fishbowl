/**
 * 为 media 表添加 blur_data_url 列（如不存在）并回填已有记录的 LQIP
 *
 * 1. 若 media 表没有 blur_data_url 列，则 ALTER TABLE 添加
 * 2. 对 blur_data_url 为空的 media，根据 url 读取图片（本地 public/uploads 或远程），
 *    用 sharp 生成 LQIP base64，写回 media.blur_data_url
 *
 * 运行: npm run db:backfill:blur
 * 或: npx ts-node --project tsconfig.node.json scripts/backfill-media-blur-data-url.ts
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import mysql from 'mysql2/promise';
import fs from 'fs';
import axios from 'axios';
import { getConnectionConfig } from '../lib/db-config';
import { generateBlurDataURL } from '../lib/blur';

const UPLOADS_DIR = path.resolve(__dirname, '../public/uploads');
const BASE_ORIGIN = process.env.BASE_ORIGIN || '';

/**
 * 根据 media.url 获取图片 buffer（本地文件或远程）
 */
async function getImageBuffer(url: string): Promise<Buffer> {
  if (!url || url.trim() === '') {
    throw new Error('empty url');
  }

  // base64 / inline 不在此脚本回填（无原始文件）
  if (url.startsWith('data:image/') || url.startsWith('inline://')) {
    throw new Error('inline/base64 media cannot be backfilled from file');
  }

  // 本地路径：/uploads/xxx 或 含 /uploads/ 的完整 URL 中提取路径
  let relativePath: string | null = null;
  if (url.startsWith('/uploads/')) {
    relativePath = url.replace(/^\/uploads\//, '').trim();
  } else if (url.startsWith('/') && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url)) {
    relativePath = url.replace(/^\//, '').replace(/^uploads\//, '').trim();
  } else if (url.includes('/uploads/')) {
    const idx = url.indexOf('/uploads/');
    relativePath = url.slice(idx + '/uploads/'.length).split('?')[0].trim();
  }

  if (relativePath) {
    const localPath = path.join(UPLOADS_DIR, relativePath);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }
    // 尝试用 BASE_ORIGIN 拉取
    if (BASE_ORIGIN) {
      const remoteUrl = url.startsWith('http') ? url : BASE_ORIGIN + (url.startsWith('/') ? url : '/' + url);
      const res = await axios.get(remoteUrl, { responseType: 'arraybuffer', timeout: 15000 });
      return Buffer.from(res.data);
    }
    throw new Error(`local file not found: ${localPath}`);
  }

  // 纯远程 URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return Buffer.from(res.data);
  }

  throw new Error(`cannot resolve url to file: ${url}`);
}

async function main() {
  console.log('🚀 开始为 media 表添加/回填 blur_data_url...\n');

  const conn = await mysql.createConnection(getConnectionConfig());
  console.log('✅ 数据库连接成功\n');

  try {
    // 1. 检查 blur_data_url 列是否存在
    const [cols] = await conn.execute<mysql.RowDataPacket[]>(
      "SHOW COLUMNS FROM media LIKE 'blur_data_url'"
    );
    if (cols.length === 0) {
      console.log('📋 添加 media.blur_data_url 列...');
      await conn.execute(`
        ALTER TABLE \`media\`
          ADD COLUMN \`blur_data_url\` TEXT COLLATE utf8mb4_unicode_ci COMMENT 'LQIP base64 placeholder' AFTER \`created_at\`
      `);
      console.log('✅ blur_data_url 列已添加\n');
    } else {
      console.log('ℹ️  media.blur_data_url 列已存在\n');
    }

    // 2. 查询需要回填的记录
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id, url FROM media
       WHERE (blur_data_url IS NULL OR blur_data_url = '')
         AND url IS NOT NULL AND url != ''`
    );

    if (rows.length === 0) {
      console.log('✅ 没有需要回填的 media 记录');
      return;
    }

    console.log(`📋 共 ${rows.length} 条 media 需要回填 blur_data_url\n`);

    let ok = 0;
    let fail = 0;

    for (const row of rows) {
      const { id, url } = row;
      try {
        const buffer = await getImageBuffer(url);
        const blurDataUrl = await generateBlurDataURL(buffer);
        await conn.execute('UPDATE media SET blur_data_url = ? WHERE id = ?', [blurDataUrl, id]);
        ok++;
        if (ok % 10 === 0 || ok + fail === rows.length) {
          console.log(`  已处理 ${ok}/${rows.length} (失败 ${fail})`);
        }
      } catch (err: any) {
        fail++;
        console.warn(`  ⚠️  [${id}] ${err?.message || err}`);
      }
    }

    console.log(`\n🎉 完成：成功 ${ok}，失败 ${fail}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
