/**
 * 测试树API返回的数据层级
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

async function testTreeAPI() {
  let connection = null;

  try {
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功\n');

    // 1. 先找一个书籍分类
    const [books] = await connection.execute(`
      SELECT id, name, path, depth, parent_id 
      FROM categories 
      WHERE parent_id = 'cat_bookcase' 
      LIMIT 1
    `);

    if (books.length === 0) {
      console.log('❌ 没有找到书籍分类');
      return;
    }

    const book = books[0];
    console.log('📚 测试书籍：', book);
    console.log('');

    // 2. 查询这本书下的所有分类（模拟API查询）
    const likePattern = `${book.path}%`;
    const [categories] = await connection.execute(`
      SELECT id, name, parent_id, path, depth, order_index
      FROM categories
      WHERE path LIKE ?
      ORDER BY path ASC
    `, [likePattern]);

    console.log(`📋 找到 ${categories.length} 个分类节点：`);
    categories.forEach(cat => {
      const indent = '  '.repeat(cat.depth - book.depth);
      console.log(`${indent}[depth=${cat.depth}] ${cat.name} (path=${cat.path})`);
    });
    console.log('');

    // 3. 查询这本书下的所有文章
    const [articles] = await connection.execute(`
      SELECT a.id, a.title, a.type, a.order_index, a.category_id,
             c.path AS category_path, c.depth AS category_depth
      FROM articles a
      JOIN categories c ON a.category_id = c.id
      WHERE c.path LIKE ? AND a.status = 'published'
      ORDER BY c.path ASC, a.order_index ASC
    `, [likePattern]);

    console.log(`📝 找到 ${articles.length} 个文章：`);
    articles.forEach(article => {
      const indent = '  '.repeat(article.category_depth - book.depth + 1);
      console.log(`${indent}└─ [depth=${article.category_depth + 1}] ${article.title} (category_path=${article.category_path})`);
    });
    console.log('');

    // 4. 统计层级分布
    const depthCounts = {};
    categories.forEach(cat => {
      depthCounts[cat.depth] = (depthCounts[cat.depth] || 0) + 1;
    });
    articles.forEach(article => {
      const articleDepth = article.category_depth + 1;
      depthCounts[articleDepth] = (depthCounts[articleDepth] || 0) + 1;
    });

    console.log('📊 层级分布统计：');
    Object.keys(depthCounts).sort().forEach(depth => {
      console.log(`  Depth ${depth}: ${depthCounts[depth]} 个节点`);
    });

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testTreeAPI();

