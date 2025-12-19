// 加载环境变量
import 'dotenv/config';

import { query } from '../lib/db';

/**
 * 更新用户表，添加 max_access_level 字段
 * 为现有用户设置适当的权限等级
 */
async function main() {
  console.log('开始更新用户表...');

  try {
    // 1. 检查 max_access_level 字段是否存在
    const columns = await query(`
      SHOW COLUMNS FROM users LIKE 'max_access_level'
    `) as any[];

    if (columns.length === 0) {
      console.log('添加 max_access_level 字段...');

      // 添加 max_access_level 字段
      await query(`
        ALTER TABLE users
        ADD COLUMN max_access_level TINYINT NOT NULL DEFAULT '3' COMMENT '用户最大可访问内容等级'
      `);

      console.log('✓ max_access_level 字段添加成功');
    } else {
      console.log('⊙ max_access_level 字段已存在');
    }

    // 2. 为现有用户设置适当的权限等级
    console.log('更新现有用户的权限等级...');

    // 管理员设为最高权限 (5)
    await query(`
      UPDATE users
      SET max_access_level = 5
      WHERE role = 'admin'
    `);

    // 版主设为较高权限 (4)
    await query(`
      UPDATE users
      SET max_access_level = 4
      WHERE role = 'moderator'
    `);

    // 普通用户设为默认权限 (3)，但不覆盖已设置的值
    await query(`
      UPDATE users
      SET max_access_level = 3
      WHERE role = 'user' AND (max_access_level IS NULL OR max_access_level = 0)
    `);

    console.log('✓ 用户权限等级更新完成');

    // 3. 显示更新结果
    const userStats = await query(`
      SELECT role, max_access_level, COUNT(*) as count
      FROM users
      GROUP BY role, max_access_level
      ORDER BY role, max_access_level
    `) as any[];

    console.log('\n📊 用户权限分布:');
    userStats.forEach((stat: any) => {
      console.log(`  ${stat.role}: 等级${stat.max_access_level} - ${stat.count}人`);
    });

    console.log('\n✅ 用户表更新完成！');
    console.log('\n🔒 权限等级说明:');
    console.log('  等级1(Public): 所有人可访问');
    console.log('  等级2(General): 所有人可访问');
    console.log('  等级3(Member): 会员权限');
    console.log('  等级4(Adult): 成人权限');
    console.log('  等级5(Root): 管理员权限');

  } catch (error) {
    console.error('❌ 更新用户表失败:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});