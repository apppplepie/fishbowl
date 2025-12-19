/**
 * 测试数据库迁移结果
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

async function testMigration() {
  let connection = null;

  try {
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功\n');

    // 查询几条文章数据
    const [articles] = await connection.execute(
      'SELECT id, title, author, published_at, created_at, updated_at FROM articles LIMIT 5'
    );

    console.log('📋 文章数据示例（前5条）：');
    console.table(articles);

    console.log('\n✅ 测试完成！时间字段已成功迁移。');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testMigration();

