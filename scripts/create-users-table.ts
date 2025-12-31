// 加载环境变量
import 'dotenv/config';

import { query } from '../lib/db';
import bcrypt from 'bcryptjs';

/**
 * 创建用户表和相关表
 * - users: 用户基本信息
 * - roles: 角色定义（可选，用于 RBAC）
 * - user_roles: 用户角色关联（可选，用于 RBAC）
 */
async function main() {
  console.log('开始创建用户相关表...');

  try {
    // 1. 创建 users 表
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        avatar_url VARCHAR(500),
        bio TEXT,
        role ENUM('admin', 'moderator', 'user') DEFAULT 'user',
        status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
        email_verified BOOLEAN DEFAULT FALSE,
        max_access_level TINYINT NOT NULL DEFAULT '3' COMMENT '用户最大可访问内容等级',
        last_login_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ users 表创建成功');

    // 2. 创建用户配置表（可选，用于存储用户个性化设置）
    await query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id VARCHAR(36) PRIMARY KEY,
        theme VARCHAR(20) DEFAULT 'light',
        language VARCHAR(10) DEFAULT 'zh-CN',
        notification_enabled BOOLEAN DEFAULT TRUE,
        email_notification BOOLEAN DEFAULT TRUE,
        settings JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ user_settings 表创建成功');

    // 3. 创建评论表
    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(36) PRIMARY KEY,
        article_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        parent_id VARCHAR(36),
        content TEXT NOT NULL,
        like_count INT DEFAULT 0,
        status ENUM('visible', 'hidden', 'deleted') DEFAULT 'visible',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
        INDEX idx_article_id (article_id),
        INDEX idx_user_id (user_id),
        INDEX idx_parent_id (parent_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ comments 表创建成功');

    // 4. 更新 articles 表的 author 字段（如果需要关联到 users 表）
    try {
      // 检查 articles 表是否存在 author_id 字段
      const columns = await query(`
        SHOW COLUMNS FROM articles LIKE 'author_id'
      `) as any[];

      if (columns.length === 0) {
        await query(`
          ALTER TABLE articles
          ADD COLUMN author_id VARCHAR(36),
          ADD CONSTRAINT fk_author
          FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
        `);
        console.log('✓ articles 表添加 author_id 字段');
      } else {
        console.log('⊙ articles 表已有 author_id 字段，跳过');
      }
    } catch (error) {
      console.log('⊙ articles 表可能不存在，跳过添加 author_id');
    }

    // 5. 创建默认管理员账号
    const adminId = 'user_admin_001';
    const adminPassword = await bcrypt.hash('admin123456', 10);

    const existingAdmin = await query(
      'SELECT id FROM users WHERE username = ?',
      ['admin']
    ) as any[];

    if (existingAdmin.length === 0) {
      await query(`
        INSERT INTO users (
          id, username, email, password_hash, display_name,
          role, status, email_verified, max_access_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        adminId,
        'admin',
        'creepender42@outlook.com',
        adminPassword,
        '管理员',
        'admin',
        'active',
        true,
        5  // 管理员最高权限
      ]);

      // 创建管理员的设置
      await query(`
        INSERT INTO user_settings (user_id) VALUES (?)
      `, [adminId]);

      console.log('✓ 默认管理员账号创建成功');
      console.log('  用户名: admin');
      console.log('  密码: admin123456');
      console.log('  ⚠️  请在生产环境中立即修改密码！');
    } else {
      console.log('⊙ 管理员账号已存在，跳过创建');
    }

    // 6. 创建测试用户（可选）
    const testUserId = 'user_test_001';
    const testPassword = await bcrypt.hash('test123456', 10);

    const existingTest = await query(
      'SELECT id FROM users WHERE username = ?',
      ['testuser']
    ) as any[];

    if (existingTest.length === 0) {
      await query(`
        INSERT INTO users (
          id, username, email, password_hash, display_name,
          role, status, email_verified, max_access_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testUserId,
        'testuser',
        'test@fishbowl.com',
        testPassword,
        '测试用户',
        'user',
        'active',
        true,
        3  // 普通用户默认权限
      ]);

      await query(`
        INSERT INTO user_settings (user_id) VALUES (?)
      `, [testUserId]);

      console.log('✓ 测试用户创建成功');
      console.log('  用户名: testuser');
      console.log('  密码: test123456');
    } else {
      console.log('⊙ 测试用户已存在，跳过创建');
    }

    console.log('\n✅ 数据库表创建完成！');
    console.log('\n📊 表结构总览：');
    console.log('  - users: 用户基本信息（包含角色字段）');
    console.log('  - user_settings: 用户个性化设置');
    console.log('  - comments: 评论系统（支持评论和回复）');
    console.log('\n👥 角色系统：');
    console.log('  - admin: 管理员（全部权限）');
    console.log('  - moderator: 版主（管理内容）');
    console.log('  - user: 普通用户（发布内容）');
    console.log('\n💬 评论功能：');
    console.log('  - 支持评论文章');
    console.log('  - 支持回复评论（无限层级）');
    console.log('  - 支持点赞和状态管理');

  } catch (error) {
    console.error('❌ 创建用户表失败:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

