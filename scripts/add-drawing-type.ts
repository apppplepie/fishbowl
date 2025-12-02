/**
 * 数据库迁移脚本 - 添加绘画类型功能
 * 运行方法: npx ts-node scripts/add-drawing-type.ts
 */
import { query, testConnection } from '../lib/db';

async function migrateDatabase() {
  console.log('🚀 开始数据库迁移...\n');

  // 测试连接
  console.log('1️⃣ 测试数据库连接...');
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ 数据库连接失败，请检查配置');
    process.exit(1);
  }

  try {
    // 步骤 1: 修改 articles 表，添加 'drawing' 类型
    console.log('\n2️⃣ 修改 articles 表，添加 drawing 类型...');
    await query(`
      ALTER TABLE articles 
      MODIFY COLUMN type ENUM('default', 'text', 'image', 'code', 'diary', 'drawing') DEFAULT 'text'
    `);
    console.log('✅ articles 表更新成功');

    // 步骤 2: 创建 galleries 表
    console.log('\n3️⃣ 创建 galleries 表...');
    await query(`
      CREATE TABLE IF NOT EXISTS galleries (
        id VARCHAR(36) PRIMARY KEY,
        article_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        cover_image_url VARCHAR(500),
        author VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        INDEX idx_article_id (article_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ galleries 表创建成功');

    // 步骤 3: 创建 gallery_images 表
    console.log('\n4️⃣ 创建 gallery_images 表...');
    await query(`
      CREATE TABLE IF NOT EXISTS gallery_images (
        gallery_id VARCHAR(36) NOT NULL,
        block_id VARCHAR(36) NOT NULL,
        \`order\` INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (gallery_id, block_id),
        FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
        FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
        INDEX idx_order (gallery_id, \`order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ gallery_images 表创建成功');

    console.log('\n🎉 数据库迁移完成！');
    console.log('\n📋 已添加的功能：');
    console.log('  - articles.type 新增 "drawing" 类型');
    console.log('  - 新建 galleries 表（图组表）');
    console.log('  - 新建 gallery_images 表（图组-图片关系表）');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 迁移失败:', error.message);
    process.exit(1);
  }
}

migrateDatabase();

