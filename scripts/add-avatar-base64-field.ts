// 加载环境变量
import 'dotenv/config';

import { query } from '../lib/db';

/**
 * 为users表添加avatar_base64字段
 */
async function main() {
  console.log('开始为users表添加avatar_base64字段...');

  try {
    // 检查avatar_base64字段是否已存在
    const columns = await query(`
      SHOW COLUMNS FROM users LIKE 'avatar_base64'
    `) as any[];

    if (columns.length === 0) {
      // 添加avatar_base64字段
      await query(`
        ALTER TABLE users
        ADD COLUMN avatar_base64 MEDIUMTEXT COMMENT 'Base64 PNG avatar'
      `);
      console.log('✓ avatar_base64字段添加成功');
    } else {
      console.log('⊙ avatar_base64字段已存在，跳过');
    }

    // 同时检查avatar_url字段是否存在
    const avatarUrlColumns = await query(`
      SHOW COLUMNS FROM users LIKE 'avatar_url'
    `) as any[];

    if (avatarUrlColumns.length === 0) {
      // 添加avatar_url字段
      await query(`
        ALTER TABLE users
        ADD COLUMN avatar_url VARCHAR(500) COMMENT 'Avatar URL'
      `);
      console.log('✓ avatar_url字段添加成功');
    } else {
      console.log('⊙ avatar_url字段已存在，跳过');
    }

    console.log('\n✅ 字段添加完成！');

  } catch (error) {
    console.error('❌ 添加字段失败:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
