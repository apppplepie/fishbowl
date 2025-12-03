import { query } from '../lib/db';

/**
 * 为 articles 表添加 author_id 和 category_id 字段
 * 如果字段已存在则跳过
 */
async function main() {
  console.log('开始为 articles 表添加缺失字段...');

  try {
    // 1. 检查并添加 author_id 字段
    try {
      const authorIdColumns = await query(`
        SHOW COLUMNS FROM articles LIKE 'author_id'
      `) as any[];

      if (authorIdColumns.length === 0) {
        await query(`
          ALTER TABLE articles
          ADD COLUMN author_id VARCHAR(36) AFTER author,
          ADD INDEX idx_author_id (author_id)
        `);
        console.log('✓ articles 表添加 author_id 字段成功');
      } else {
        console.log('⊙ articles 表已有 author_id 字段，跳过');
      }
    } catch (error: any) {
      console.error('添加 author_id 字段失败:', error.message);
    }

    // 2. 检查并添加 category_id 字段
    try {
      const categoryIdColumns = await query(`
        SHOW COLUMNS FROM articles LIKE 'category_id'
      `) as any[];

      if (categoryIdColumns.length === 0) {
        await query(`
          ALTER TABLE articles
          ADD COLUMN category_id VARCHAR(36) AFTER comments,
          ADD INDEX idx_category_id (category_id)
        `);
        console.log('✓ articles 表添加 category_id 字段成功');
      } else {
        console.log('⊙ articles 表已有 category_id 字段，跳过');
      }
    } catch (error: any) {
      console.error('添加 category_id 字段失败:', error.message);
    }

    console.log('\n✅ 字段检查和添加完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 操作失败:', error);
    process.exit(1);
  }
}

main();

