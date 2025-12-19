// 加载环境变量
import 'dotenv/config';

import { query } from '../lib/db';

/**
 * 创建点赞表
 */
async function main() {
  console.log('开始创建点赞表...');

  try {
    // 创建文章点赞表
    await query(`
      CREATE TABLE IF NOT EXISTS article_likes (
        id VARCHAR(36) PRIMARY KEY,
        article_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36),
        ip_address VARCHAR(45),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_article_id (article_id),
        INDEX idx_user_id (user_id),
        INDEX idx_ip_address (ip_address),
        UNIQUE KEY unique_user_like (article_id, user_id),
        UNIQUE KEY unique_ip_like (article_id, ip_address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ article_likes 表创建成功');

    // 创建评论点赞表（可选）
    await query(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id VARCHAR(36) PRIMARY KEY,
        comment_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36),
        ip_address VARCHAR(45),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_comment_id (comment_id),
        INDEX idx_user_id (user_id),
        INDEX idx_ip_address (ip_address),
        UNIQUE KEY unique_user_like (comment_id, user_id),
        UNIQUE KEY unique_ip_like (comment_id, ip_address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ comment_likes 表创建成功');

    console.log('\n✅ 点赞表创建完成！');
    console.log('\n📊 表结构：');
    console.log('  - article_likes: 文章点赞记录');
    console.log('  - comment_likes: 评论点赞记录');
    console.log('\n💡 说明：');
    console.log('  - 登录用户：通过 user_id 去重');
    console.log('  - 未登录用户：通过 ip_address 去重');
    console.log('  - 同一用户/IP 只能点赞一次（UNIQUE 约束）');

  } catch (error) {
    console.error('❌ 创建点赞表失败:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

