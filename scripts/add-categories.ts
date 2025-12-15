/**
 * 数据库迁移脚本：添加分类表
 * 
 * 功能：
 * 1. 创建 categories 表（分类表）
 * 2. 修改 articles 表，添加 category_id 和 order_index 字段
 * 3. 创建默认分类
 */

import { query } from '../lib/db';

async function migrate() {
  try {
    console.log('开始迁移：添加分类表...');

    // 1. 创建 categories 表
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id VARCHAR(36),
        order_index INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
        INDEX idx_parent_id (parent_id),
        INDEX idx_order (order_index)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ categories 表创建成功');

    // 2. 检查并添加 category_id 字段到 articles 表
    try {
      await query(`
        ALTER TABLE articles 
        ADD COLUMN category_id VARCHAR(36),
        ADD FOREIGN KEY (category_id) REFERENCES categories(id),
        ADD INDEX idx_category (category_id)
      `);
      console.log('✓ articles 表添加 category_id 字段');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠ category_id 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 3. 检查并添加 order_index 字段
    try {
      await query(`
        ALTER TABLE articles 
        ADD COLUMN order_index INT DEFAULT 0,
        ADD INDEX idx_order_index (order_index)
      `);
      console.log('✓ articles 表添加 order_index 字段');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠ order_index 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 4. 检查是否已有分类数据
    const result = await query<any[]>('SELECT COUNT(*) as count FROM categories');
    const count = result[0]?.count || 0;
    
    if (count === 0) {
      // 5. 插入默认分类
      const defaultCategories = [
        { id: 'cat_uncategorized', name: '未分类', parent_id: null, order_index: 0 },
        { id: 'cat_drawing', name: '🎨 绘画作品', parent_id: null, order_index: 1 },
        { id: 'cat_drawing_character', name: '角色设计', parent_id: 'cat_drawing', order_index: 1 },
        { id: 'cat_drawing_scene', name: '场景概念', parent_id: 'cat_drawing', order_index: 2 },
        { id: 'cat_drawing_practice', name: '写实练习', parent_id: 'cat_drawing', order_index: 3 },
        { id: 'cat_blog', name: '📝 技术博客', parent_id: null, order_index: 2 },
        { id: 'cat_blog_frontend', name: '前端开发', parent_id: 'cat_blog', order_index: 1 },
        { id: 'cat_blog_backend', name: '后端开发', parent_id: 'cat_blog', order_index: 2 },
        { id: 'cat_life', name: '📖 生活随笔', parent_id: null, order_index: 3 },
      ];

      for (const cat of defaultCategories) {
        await query(
          'INSERT INTO categories (id, name, parent_id, order_index) VALUES (?, ?, ?, ?)',
          [cat.id, cat.name, cat.parent_id, cat.order_index]
        );
      }
      console.log('✓ 默认分类创建成功');
    } else {
      console.log('⚠ 分类已存在，跳过默认分类创建');
    }

    console.log('✅ 迁移完成！');
    process.exit(0);

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

migrate();

