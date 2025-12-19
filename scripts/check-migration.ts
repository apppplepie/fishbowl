/**
 * 检查数据库迁移状态
 */

// 加载环境变量
import 'dotenv/config';

import mysql from 'mysql2/promise';
import { getConnectionConfig } from '../lib/db-config';

const config = getConnectionConfig();

async function checkMigration() {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功\n');

    const [columns] = await connection.execute('SHOW COLUMNS FROM articles');
    console.log('📋 articles 表的字段列表：');
    console.table(columns);

  } catch (error: any) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkMigration();

