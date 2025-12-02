/**
 * 数据库回滚脚本 - 删除 galleries 相关表
 * 运行方法: npm run db:rollback:galleries
 */
import { query, testConnection } from '../lib/db';

async function rollbackTables() {
  console.log('🚀 开始删除 galleries 表...\n');

  // 测试连接
  console.log('1️⃣ 测试数据库连接...');
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ 数据库连接失败，请检查配置');
    process.exit(1);
  }

  try {
    // 删除表（注意顺序，先删除有外键的表）
    console.log('\n2️⃣ 删除 gallery_images 表...');
    await query(`DROP TABLE IF EXISTS gallery_images`);
    console.log('✅ gallery_images 表已删除');

    console.log('\n3️⃣ 删除 galleries 表...');
    await query(`DROP TABLE IF EXISTS galleries`);
    console.log('✅ galleries 表已删除');

    console.log('\n🎉 数据库回滚完成！');
    console.log('\n📋 已删除的表：');
    console.log('  - gallery_images');
    console.log('  - galleries');
    console.log('\n💡 现在直接使用 articles 表管理绘画类型文章');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 回滚失败:', error.message);
    process.exit(1);
  }
}

rollbackTables();

