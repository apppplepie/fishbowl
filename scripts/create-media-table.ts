/**
 * 创建 media 表和添加 blocks.media_id 列的迁移脚本
 * 运行方法: npm run db:migrate:create-media
 * 或: npx ts-node --project tsconfig.node.json scripts/create-media-table.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// 先加载 .env，再加载 .env.local（本地覆盖）
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import mysql from 'mysql2/promise';
import { getConnectionConfig } from '../lib/db-config';

async function createMediaTable() {
  console.log('🚀 开始创建 media 表和添加 media_id 列...\n');

  const conn = await mysql.createConnection(getConnectionConfig());
  console.log('✅ 数据库连接成功\n');

  try {
    // 1. 检查 media 表是否存在
    const [tables] = await conn.execute<mysql.RowDataPacket[]>(
      "SHOW TABLES LIKE 'media'"
    );

    if (tables.length === 0) {
      console.log('📋 创建 media 表...');
      await conn.execute(`
        CREATE TABLE \`media\` (
          \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
          \`url\` TEXT NOT NULL COMMENT '原始文件 URL 或 存储 key',
          \`mime\` VARCHAR(100) DEFAULT NULL,
          \`width\` INT DEFAULT NULL,
          \`height\` INT DEFAULT NULL,
          \`aspect_ratio\` DECIMAL(10,6) DEFAULT NULL COMMENT 'width/height',
          \`size_bytes\` BIGINT DEFAULT NULL,
          \`sha256\` VARCHAR(64) DEFAULT NULL,
          \`variants\` JSON DEFAULT NULL COMMENT '{"thumb": "...","small":"...","large":"..."}',
          \`orientation\` SMALLINT DEFAULT NULL COMMENT 'EXIF orientation if available',
          \`source\` VARCHAR(50) DEFAULT NULL COMMENT 'local|cdn|external|base64',
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          \`blur_data_url\` TEXT COLLATE utf8mb4_unicode_ci COMMENT 'LQIP base64 placeholder',
          INDEX \`idx_sha256\` (\`sha256\`(32)),
          INDEX \`idx_mime\` (\`mime\`),
          INDEX \`idx_source\` (\`source\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ media 表创建成功\n');
    } else {
      console.log('ℹ️  media 表已存在，跳过创建\n');
    }

    // 2. 检查 blocks.media_id 列是否存在
    const [columns] = await conn.execute<mysql.RowDataPacket[]>(
      "SHOW COLUMNS FROM blocks LIKE 'media_id'"
    );

    if (columns.length === 0) {
      console.log('📋 添加 blocks.media_id 列...');
      await conn.execute(`
        ALTER TABLE \`blocks\`
          ADD COLUMN \`media_id\` VARCHAR(36) NULL AFTER \`content\`,
          ADD KEY \`idx_media_id\` (\`media_id\`)
      `);
      console.log('✅ blocks.media_id 列添加成功\n');
    } else {
      console.log('ℹ️  blocks.media_id 列已存在，跳过添加\n');
    }

    console.log('🎉 迁移完成！');
    console.log('\n📋 下一步：运行迁移脚本将图片数据迁移到 media 表');
    console.log('   npm run db:migrate:media');
  } catch (error: any) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

createMediaTable().catch((error) => {
  console.error('❌ 未捕获的错误:', error);
  process.exit(1);
});
