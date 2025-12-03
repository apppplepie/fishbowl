import { query } from '../lib/db';

/**
 * 创建标签相关表
 * - tags: 标签表
 * - article_tags: 文章-标签关联表（多对多）
 */
async function main() {
  console.log('开始创建标签相关表...');

  try {
    // 1. 创建 tags 表
    await query(`
      CREATE TABLE IF NOT EXISTS tags (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ tags 表创建成功');

    // 2. 创建 article_tags 关联表（多对多）
    await query(`
      CREATE TABLE IF NOT EXISTS article_tags (
        article_id VARCHAR(36) NOT NULL,
        tag_id VARCHAR(36) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (article_id, tag_id),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        INDEX idx_article_id (article_id),
        INDEX idx_tag_id (tag_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ article_tags 表创建成功');

    // 3. 插入一些常用标签
    const commonTags = [
      '技术',
      '生活',
      '随笔',
      '教程',
      '思考',
      '前端',
      '后端',
      'React',
      'Node.js',
      'TypeScript',
      'JavaScript',
      'CSS',
      'HTML',
      '设计',
      '旅行',
      '摄影',
      '美食',
      '音乐',
      '电影',
      '读书',
    ];

    for (const tagName of commonTags) {
      const tagId = `tag-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      try {
        await query(
          `INSERT INTO tags (id, name) VALUES (?, ?)`,
          [tagId, tagName]
        );
        console.log(`  添加标签: ${tagName}`);
      } catch (error: any) {
        // 如果标签已存在，跳过
        if (error.code !== 'ER_DUP_ENTRY') {
          console.error(`  添加标签失败 ${tagName}:`, error.message);
        }
      }
    }

    console.log('\n✅ 标签系统表创建完成！');
    console.log('已添加', commonTags.length, '个常用标签');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建表失败:', error);
    process.exit(1);
  }
}

main();

