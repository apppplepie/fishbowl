/**
 * 数据库迁移脚本：重构 articles 表的时间字段
 * 
 * 改动：
 * 1. 删除 last_modified 字段（用 updated_at 替代）
 * 2. 将 publish_date (DATE) 改为 published_at (DATETIME)
 */

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'test',
  multipleStatements: true, // 允许执行多条SQL语句
};

async function runMigration() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('🔄 开始数据库迁移...\n');

    // 创建数据库连接
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功\n');

    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, 'refactor-article-dates.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // 分割并执行每条SQL语句
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 准备执行 ${statements.length} 条SQL语句...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          console.log(`[${i + 1}/${statements.length}] 执行中...`);
          await connection.execute(statement);
          console.log(`✅ 成功\n`);
        } catch (err: any) {
          // 忽略某些可预期的错误
          if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            console.log(`⚠️ 字段或索引不存在，跳过\n`);
          } else {
            throw err;
          }
        }
      }
    }

    // 验证迁移结果
    console.log('🔍 验证迁移结果...\n');
    const [columns] = await connection.execute('SHOW COLUMNS FROM articles');
    console.log('📋 articles 表的字段列表：');
    console.table(columns);

    console.log('\n✅ 数据库迁移完成！\n');
    console.log('新的时间字段：');
    console.log('  - published_at (DATETIME) - 发布时间');
    console.log('  - created_at (DATETIME) - 创建时间');
    console.log('  - updated_at (DATETIME) - 最后更新时间\n');

  } catch (error: any) {
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

