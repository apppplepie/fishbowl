/**
 * 数据库迁移脚本：添加 type 字段
 */
import { query } from '../lib/db';

async function addTypeField() {
  console.log('🔧 开始添加 type 字段到 articles 表...\n');

  try {
    // 添加 type 字段
    await query(`
      ALTER TABLE articles 
      ADD COLUMN type ENUM('default', 'text', 'image', 'code', 'diary') 
      DEFAULT 'text' 
      AFTER excerpt
    `);

    console.log('✅ type 字段添加成功');
    
  } catch (error: any) {
    // 如果字段已存在，跳过
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  type 字段已存在，跳过添加');
    } else {
      console.error('❌ 添加字段失败:', error.message);
      throw error;
    }
  }

  try {
    // 添加索引
    await query(`
      ALTER TABLE articles 
      ADD INDEX idx_type (type)
    `);

    console.log('✅ type 字段索引创建成功');
    
  } catch (error: any) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  type 字段索引已存在，跳过创建');
    } else {
      console.log('⚠️  创建索引失败（可能已存在）:', error.message);
    }
  }

  console.log('\n🎉 迁移完成！');
}

// 执行
addTypeField()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

