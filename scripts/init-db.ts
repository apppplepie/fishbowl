/**
 * 数据库初始化脚本
 * 运行方法: npx ts-node scripts/init-db.ts
 */
import { testConnection, initDatabase } from '../lib/db';

async function main() {
  console.log('🚀 开始初始化数据库...\n');

  // 测试连接
  console.log('1️⃣ 测试数据库连接...');
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ 数据库连接失败，请检查配置');
    process.exit(1);
  }

  // 初始化表结构
  console.log('\n2️⃣ 创建数据库表...');
  await initDatabase();

  console.log('\n🎉 数据库初始化完成！');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ 初始化失败:', error);
  process.exit(1);
});

