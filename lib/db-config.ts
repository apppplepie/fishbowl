/**
 * 数据库配置模块
 * 统一从环境变量读取数据库配置
 */

export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
  connectionLimit?: number;
  queueLimit?: number;
  waitForConnections?: boolean;
}

/**
 * 获取数据库配置
 * 从环境变量读取，如果没有设置则使用默认值
 */
export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'test',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    connectionLimit: process.env.DB_CONNECTION_LIMIT 
      ? parseInt(process.env.DB_CONNECTION_LIMIT, 10) 
      : 10,
    queueLimit: process.env.DB_QUEUE_LIMIT 
      ? parseInt(process.env.DB_QUEUE_LIMIT, 10) 
      : 0,
    waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS !== 'false',
  };
}

/**
 * 获取数据库连接配置（用于 createConnection）
 * 不包含连接池相关的配置
 */
export function getConnectionConfig() {
  const config = getDatabaseConfig();
  return {
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    port: config.port,
  };
}
