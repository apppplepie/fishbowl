/**
 * 数据库迁移脚本：重构 articles 表的时间字段
 * 
 * 改动：
 * 1. 删除 last_modified 字段（用 updated_at 替代）
 * 2. 将 publish_date (DATE) 改为 published_at (DATETIME)
 */

// 加载环境变量
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mysql from 'mysql2/promise';

// 从环境变量读取数据库配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'test',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
};

async function runMigration() {
  let connection = null;

  try {
    console.log('🔄 开始数据库迁移...\n');

    // 创建数据库连接
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功\n');

    // 步骤 1: 添加新的 published_at 字段
    console.log('[1/7] 添加 published_at 字段...');
    try {
      await connection.execute(`
        ALTER TABLE \`articles\` 
        ADD COLUMN \`published_at\` datetime DEFAULT NULL AFTER \`author\`
      `);
      console.log('✅ 成功\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  字段已存在，跳过\n');
      } else {
        throw err;
      }
    }

    // 步骤 2: 迁移数据
    console.log('[2/7] 迁移 publish_date 数据到 published_at...');
    await connection.execute(`
      UPDATE \`articles\` 
      SET \`published_at\` = CONCAT(publish_date, ' 00:00:00')
      WHERE \`publish_date\` IS NOT NULL AND \`published_at\` IS NULL
    `);
    console.log('✅ 成功\n');

    // 步骤 3: 检查是否可以删除 publish_date
    console.log('[3/7] 删除旧的 publish_date 字段...');
    try {
      await connection.execute(`
        ALTER TABLE \`articles\` 
        DROP COLUMN \`publish_date\`
      `);
      console.log('✅ 成功\n');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠️  字段不存在，跳过\n');
      } else {
        throw err;
      }
    }

    // 步骤 4: 删除 last_modified
    console.log('[4/7] 删除冗余的 last_modified 字段...');
    try {
      await connection.execute(`
        ALTER TABLE \`articles\` 
        DROP COLUMN \`last_modified\`
      `);
      console.log('✅ 成功\n');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠️  字段不存在，跳过\n');
      } else {
        throw err;
      }
    }

    // 步骤 5: 删除旧索引
    console.log('[5/7] 删除旧的索引...');
    try {
      await connection.execute(`DROP INDEX \`idx_publish_date\` ON \`articles\``);
      console.log('✅ 成功\n');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠️  索引不存在，跳过\n');
      } else {
        throw err;
      }
    }

    // 步骤 6: 创建新索引
    console.log('[6/7] 创建新的索引...');
    try {
      await connection.execute(`
        ALTER TABLE \`articles\` 
        ADD INDEX \`idx_published_at\` (\`published_at\`)
      `);
      console.log('✅ 成功\n');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  索引已存在，跳过\n');
      } else {
        throw err;
      }
    }

    // 步骤 7: 验证迁移结果
    console.log('[7/7] 验证迁移结果...\n');
    const [columns] = await connection.execute('SHOW COLUMNS FROM articles');
    console.log('📋 articles 表的字段列表：');
    console.table(columns);

    console.log('\n✅ 数据库迁移完成！\n');
    console.log('新的时间字段：');
    console.log('  - published_at (DATETIME) - 发布时间');
    console.log('  - created_at (DATETIME) - 创建时间');
    console.log('  - updated_at (DATETIME) - 最后更新时间\n');

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔒 数据库连接已关闭');
    }
  }
}

// 执行迁移
runMigration();

