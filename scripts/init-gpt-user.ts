#!/usr/bin/env tsx
/**
 * 初始化 GPT Actions 用户账号
 *
 * 运行方式：
 *   npx tsx scripts/init-gpt-user.ts
 *
 * 会创建：
 *   1. chatgpt 用户（moderator 权限）
 *   2. 生成一个随机 API Key
 *   3. 输出配置到 .env.local
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../lib/db';
import { generateApiKey } from '../lib/gptAuth';
import fs from 'fs';
import path from 'path';

const USERNAME = 'chatgpt';
const EMAIL = 'chatgpt@fishbowl.local';
const DISPLAY_NAME = 'ChatGPT 助手';
const ROLE = 'moderator';

async function main() {
  console.log('🚀 开始初始化 ChatGPT 用户...\n');

  // 1. 检查用户是否已存在
  const existing = await query<any[]>(
    'SELECT id, username FROM users WHERE username = ? OR email = ? LIMIT 1',
    [USERNAME, EMAIL]
  );

  let userId: string;

  if (existing.length > 0) {
    userId = existing[0].id;
    console.log(`✅ 用户已存在: ${USERNAME} (ID: ${userId})\n`);
  } else {
    // 2. 创建新用户
    userId = uuidv4();
    const randomPassword = uuidv4(); // 随机密码，GPT 不需要登录
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    await query(
      `INSERT INTO users
       (id, username, email, password_hash, display_name, role, status, email_verified, max_access_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        USERNAME,
        EMAIL,
        passwordHash,
        DISPLAY_NAME,
        ROLE,
        'active',
        1,
        5 // max_access_level
      ]
    );

    console.log(`✅ 新用户创建成功: ${USERNAME} (ID: ${userId})`);
    console.log(`   邮箱: ${EMAIL}`);
    console.log(`   角色: ${ROLE}\n`);
  }

  // 3. 生成 API Key
  const apiKey = generateApiKey();
  const envLine = `GPT_API_KEYS=${apiKey}:${userId}`;

  console.log('🔑 生成的 API Key 配置:');
  console.log(`   ${envLine}\n`);

  // 4. 更新 .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');

    // 检查是否已有配置
    if (envContent.includes('GPT_API_KEYS=')) {
      // 替换现有配置
      envContent = envContent.replace(
        /GPT_API_KEYS=[^\n]*/g,
        envLine
      );
      console.log('✅ 已更新 .env.local 中的 GPT_API_KEYS 配置');
    } else {
      // 追加配置
      envContent += `\n# GPT Actions API Key 配置\n${envLine}\n`;
      console.log('✅ 已追加配置到 .env.local');
    }
  } else {
    // 创建新文件
    envContent = `# GPT Actions API Key 配置\n${envLine}\n`;
    console.log('✅ 已创建 .env.local');
  }

  fs.writeFileSync(envPath, envContent, 'utf8');

  // 5. 输出使用说明
  console.log('\n📋 使用说明:');
  console.log('   1. 重启 Next.js 开发服务器以加载新的环境变量');
  console.log('   2. 在 GPT Builder 中配置 Action 时使用此 API Key');
  console.log('   3. OpenAPI Schema: https://your-domain.com/api/gpt/openapi.yaml\n');

  console.log('⚠️  安全提示:');
  console.log('   - 请妥善保管此 API Key，不要泄露给他人');
  console.log('   - 不要将 .env.local 提交到 Git 仓库\n');

  console.log('✨ ChatGPT 用户初始化完成！');
}

main().catch(console.error);
