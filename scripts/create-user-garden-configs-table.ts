// 加载环境变量
import 'dotenv/config';

import { query } from '../lib/db';

/**
 * 创建用户花园配置表（user_garden_configs）
 * 用于存储每个用户的基准线配置
 */
async function main() {
  console.log('开始创建用户花园配置表...\n');

  try {
    // 创建 user_garden_configs 表
    await query(`
      CREATE TABLE IF NOT EXISTS user_garden_configs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        page_id VARCHAR(36) DEFAULT NULL COMMENT '页面ID（可为NULL表示花园主页）',
        baseline_y_ratio DECIMAL(5,4) NOT NULL DEFAULT 0.6 COMMENT '基准线相对高度（0-1）',
        baseline_color VARCHAR(50) NOT NULL DEFAULT 'rgba(0, 0, 0, 0.1)' COMMENT '基准线颜色',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
        UNIQUE KEY uk_user_page (user_id, page_id),
        INDEX idx_user_id (user_id),
        INDEX idx_page_id (page_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ user_garden_configs 表创建成功\n');

    // 验证表结构
    const [columns] = await query<any[]>('SHOW COLUMNS FROM user_garden_configs');
    console.log('📋 user_garden_configs 表的字段列表：');
    console.table(columns);

    console.log('\n✅ 数据库表创建完成！');
  } catch (error: any) {
    console.error('\n❌ 创建表失败:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  }
}

main();

