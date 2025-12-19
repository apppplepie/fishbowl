// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const mysql = require('mysql2/promise');

// 从环境变量读取数据库配置
const getConnectionConfig = () => ({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'test',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
});

(async () => {
  const conn = await mysql.createConnection(getConnectionConfig());

  // 检查blocks表中的access_level分布
  const [blockStats] = await conn.execute(`
    SELECT access_level, COUNT(*) as count
    FROM blocks
    GROUP BY access_level
    ORDER BY access_level
  `);

  console.log('内容块权限等级分布:');
  blockStats.forEach(stat => {
    console.log(`等级 ${stat.access_level}: ${stat.count} 个块`);
  });

  // 检查是否有高权限内容
  const [highLevelBlocks] = await conn.execute(`
    SELECT id, type, access_level, author
    FROM blocks
    WHERE access_level > 5
    LIMIT 10
  `);

  console.log('\n高权限内容块 (>5级):');
  highLevelBlocks.forEach(block => {
    console.log(`ID: ${block.id}, 类型: ${block.type}, 等级: ${block.access_level}, 作者: ${block.author}`);
  });

  await conn.end();
})();