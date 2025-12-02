/**
 * 数据库迁移脚本 - 修复 blocks.content 字段大小
 * 将 TEXT (64KB) 改为 LONGTEXT (4GB)
 * 运行方法: npm run db:fix:blocks
 */
import { query, testConnection } from '../lib/db';

async function fixBlocksContentSize() {
  console.log('🚀 开始修复 blocks 表...\n');

  // 测试连接
  console.log('1️⃣ 测试数据库连接...');
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ 数据库连接失败，请检查配置');
    process.exit(1);
  }

  try {
    // 修改 blocks.content 字段类型为 LONGTEXT
    console.log('\n2️⃣ 修改 blocks.content 字段类型为 LONGTEXT...');
    await query(`
      ALTER TABLE blocks 
      MODIFY COLUMN content LONGTEXT NOT NULL
    `);
    console.log('✅ blocks.content 字段已修改为 LONGTEXT');

    console.log('\n🎉 数据库修复完成！');
    console.log('\n📋 修改内容：');
    console.log('  - blocks.content: TEXT (64KB) → LONGTEXT (4GB)');
    console.log('\n💡 现在可以存储大图片的 base64 编码了！');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 修复失败:', error.message);
    process.exit(1);
  }
}

fixBlocksContentSize();

