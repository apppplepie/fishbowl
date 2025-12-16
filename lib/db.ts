/**
 * MySQL 数据库连接配置
 */
import mysql from 'mysql2/promise';

// 创建连接池
export const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * 执行查询
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

/**
 * 初始化数据库表结构
 */
export async function initDatabase() {
  try {
    // 创建文章表
    await query(`
      CREATE TABLE IF NOT EXISTS articles (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(100) NOT NULL,
        author_id VARCHAR(36),
        published_at DATETIME DEFAULT NULL,
        excerpt TEXT,
        type ENUM('default', 'text', 'image', 'code', 'diary', 'drawing') DEFAULT 'text',
        status ENUM('draft', 'published') DEFAULT 'published',
        likes INT DEFAULT 0,
        shares INT DEFAULT 0,
        comments INT DEFAULT 0,
        category_id VARCHAR(36),
        order_index INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_type (type),
        INDEX idx_published_at (published_at),
        INDEX idx_author_id (author_id),
        INDEX idx_category_id (category_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建块表
    await query(`
      CREATE TABLE IF NOT EXISTS blocks (
        id VARCHAR(36) PRIMARY KEY,
        type ENUM('text', 'image', 'code') NOT NULL,
        content LONGTEXT NOT NULL,
        author VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_author (author)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建文章-块关系表
    await query(`
      CREATE TABLE IF NOT EXISTS article_blocks (
        article_id VARCHAR(36) NOT NULL,
        block_id VARCHAR(36) NOT NULL,
        \`order\` INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (article_id, block_id),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
        INDEX idx_order (article_id, \`order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ 数据库表初始化成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

/**
 * 测试数据库连接
 */
export async function testConnection() {
  try {
    const result = await query<any[]>('SELECT 1 as test');
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    return false;
  }
}

export default pool;

