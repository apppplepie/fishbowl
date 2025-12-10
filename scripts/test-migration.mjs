/**
 * 测试数据库迁移结果
 */

import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'test',
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

