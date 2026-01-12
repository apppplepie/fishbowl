// 加载环境变量
import 'dotenv/config';

import { query } from '../lib/db';

/**
 * 创建花园基准线配置表（garden_baseline_config）
 * 用于存储全局基准线配置
 */
async function main() {
  console.log('开始创建花园基准线配置表...\n');

  try {
    // 创建 garden_baseline_config 表
    await query(`
      CREATE TABLE IF NOT EXISTS garden_baseline_config (
        id VARCHAR(36) PRIMARY KEY,
        baseline_y_ratio DECIMAL(5,4) NOT NULL DEFAULT 0.6 COMMENT '基准线相对高度（0-1，如0.6表示60%高度处）',
        updated_by VARCHAR(36) NOT NULL COMMENT '最后更新者用户ID',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
        INDEX idx_updated_at (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ garden_baseline_config 表创建成功\n');

    // 插入默认配置（如果表为空）
    const existing = await query<any[]>('SELECT COUNT(*) as count FROM garden_baseline_config');
    if (existing[0].count === 0) {
      await query(`
        INSERT INTO garden_baseline_config (id, baseline_y_ratio, updated_by)
        VALUES ('default-baseline-config', 0.6, 'system')
      `);
      console.log('✅ 默认基准线配置已插入（baseline_y_ratio = 0.6）\n');
    } else {
      console.log('ℹ️  基准线配置已存在，跳过默认值插入\n');
    }

    // 验证表结构
    const [columns] = await query<any[]>('SHOW COLUMNS FROM garden_baseline_config');
    console.log('📋 garden_baseline_config 表的字段列表：');
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

