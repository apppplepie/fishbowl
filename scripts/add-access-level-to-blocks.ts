// 加载环境变量
import 'dotenv/config';

import { query } from '../lib/db';

/**
 * 为blocks表添加access_level字段
 * 设置所有现有blocks的默认访问等级为1（公开）
 */
async function main() {
  console.log('开始为blocks表添加access_level字段...');

  try {
    // 1. 检查 access_level 字段是否存在
    const columns = await query(`
      SHOW COLUMNS FROM blocks LIKE 'access_level'
    `) as any[];

    if (columns.length === 0) {
      console.log('添加 access_level 字段...');

      // 添加 access_level 字段
      await query(`
        ALTER TABLE blocks
        ADD COLUMN access_level TINYINT DEFAULT 1 COMMENT '内容访问等级：1-公开，2-一般，3-会员，4-成人，5-管理员'
      `);

      console.log('✓ access_level 字段添加成功');
    } else {
      console.log('⊙ access_level 字段已存在');
    }

    // 2. 为现有blocks设置默认访问等级
    console.log('为现有blocks设置默认访问等级...');

    await query(`
      UPDATE blocks
      SET access_level = 1
      WHERE access_level IS NULL
    `);

    console.log('✓ 默认访问等级设置完成');

    // 3. 显示统计信息
    const stats = await query(`
      SELECT access_level, COUNT(*) as count
      FROM blocks
      GROUP BY access_level
      ORDER BY access_level
    `) as any[];

    console.log('\n📊 blocks访问等级分布:');
    stats.forEach((stat: any) => {
      console.log(`  等级${stat.access_level}: ${stat.count}个blocks`);
    });

    console.log('\n✅ blocks表access_level字段添加完成！');
    console.log('\n🔒 访问等级说明:');
    console.log('  等级1: 公开内容（所有人可见）');
    console.log('  等级2: 一般内容');
    console.log('  等级3: 会员内容');
    console.log('  等级4: 成人内容');
    console.log('  等级5: 管理员内容');

  } catch (error) {
    console.error('❌ 添加access_level字段失败:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
