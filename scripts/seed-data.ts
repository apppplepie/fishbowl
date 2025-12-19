/**
 * 数据库种子数据脚本
 * 插入之前 mock 数据中的两篇文章到数据库
 */
// 加载环境变量
import 'dotenv/config';

import { query } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

async function seedData() {
  console.log('🌱 开始插入种子数据...\n');

  try {
    // 创建测试分类
    console.log('0️⃣ 创建测试分类...');
    await query(
      `INSERT INTO categories (id, name, parent_id, order_index, depth, path)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      ['book_cat_1', 'JavaScript 高级程序设计', 'cat_bookcase', 1, 2, 'cat_bookcase.book_cat_1']
    );

    await query(
      `INSERT INTO categories (id, name, parent_id, order_index, depth, path)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      ['book_cat_2', 'React 实战指南', 'cat_bookcase', 2, 2, 'cat_bookcase.book_cat_2']
    );

    // 创建父分类（如果不存在）
    await query(
      `INSERT INTO categories (id, name, parent_id, order_index, depth, path)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      ['cat_bookcase', '书架', null, 1, 1, 'cat_bookcase']
    );

    console.log('✅ 分类创建成功\n');

    // 删除可能存在的旧文章
    await query('DELETE FROM article_blocks WHERE article_id IN (?, ?)', ['article_1', 'article_2']);
    await query('DELETE FROM articles WHERE id IN (?, ?)', ['article_1', 'article_2']);
    console.log('✅ 清理旧文章数据\n');

    // 检查数据库内容
    console.log('🔍 检查数据库内容...');
    const categories = await query<any[]>('SELECT * FROM categories');
    console.log('分类数量:', categories.length);
    categories.forEach(cat => console.log('分类:', cat.id, cat.name, cat.parent_id));

    const articles = await query<any[]>('SELECT id, title, category_id, order_index FROM articles ORDER BY id');
    console.log('文章数量:', articles.length);
    articles.forEach(article => console.log('文章:', article.id, article.title, article.category_id, article.order_index));

    // 特别检查我们的测试文章
    const testArticles = await query<any[]>('SELECT id, title, category_id, order_index FROM articles WHERE id IN (?, ?)', ['article_1', 'article_2']);
    console.log('测试文章:', testArticles);

    // 检查最后插入的文章
    const lastArticles = await query<any[]>('SELECT id, title, category_id, order_index FROM articles ORDER BY id DESC LIMIT 5');
    console.log('最后5篇文章:', lastArticles);
    // 文章1: 关于写作的一些思考（只有一个文字块）
    const article1Id = 'article_1';
    const block1Id = 'block_1';

    console.log('1️⃣ 插入文章1...');
    // 先删除可能存在的旧数据
    await query('DELETE FROM article_blocks WHERE article_id = ?', [article1Id]);
    await query('DELETE FROM articles WHERE id = ?', [article1Id]);

    await query(
      `INSERT INTO articles
       (id, title, author, published_at, updated_at, excerpt, type, status, likes, shares, comments, category_id, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        article1Id,
        '关于写作的一些思考',
        '张三',
        '2024-01-15 08:30:00',
        '2024-01-15 08:30:00',
        '一篇简单的文章，分享关于写作的思考和感悟。写作不仅是记录，更是与自己对话的过程。',
        'text', // 只有文字块，类型为 text
        'published',
        42,
        15,
        8,
        'book_cat_1', // 书籍分类ID
        1, // order_index
      ]
    );

    await query(
      `INSERT INTO blocks (id, type, content, author) 
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE content = VALUES(content)`,
      [
        block1Id,
        'text',
        JSON.stringify({
          content: '这是一篇简单的文章，只包含一个文字块。在这个文字块中，我想分享一些关于写作的思考。\n\n写作是一种表达，也是一种思考的过程。当我们将想法转化为文字时，我们不仅仅是在记录，更是在整理和深化自己的思维。\n\n每一次写作都是一次与自己对话的机会。通过文字，我们可以更清晰地看到自己的想法，发现其中的逻辑漏洞，或是找到新的灵感。\n\n希望这篇简短的文字能给你带来一些启发。写作的魅力就在于此——简单而深刻。'
        }),
        '张三',
      ]
    );

    await query(
      `INSERT INTO article_blocks (article_id, block_id, \`order\`) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE \`order\` = VALUES(\`order\`)`,
      [article1Id, block1Id, 0]
    );

    console.log('✅ 文章1 插入成功\n');

    // 文章2: 全栈开发入门（8个块：文字+图片+代码）
    const article2Id = 'article_2';
    console.log('2️⃣ 插入文章2...');

    // 先删除可能存在的旧数据
    await query('DELETE FROM article_blocks WHERE article_id = ?', [article2Id]);
    await query('DELETE FROM articles WHERE id = ?', [article2Id]);

    await query(
      `INSERT INTO articles
       (id, title, author, published_at, updated_at, excerpt, type, status, likes, shares, comments, category_id, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        article2Id,
        '全栈开发入门：从前端到后端的完整示例',
        '李四',
        '2024-01-18 09:45:00',
        '2024-01-19 09:45:00',
        '在现代 Web 开发中，掌握多种技术栈是非常重要的。今天我想和大家分享一个完整的全栈开发示例，包括前端展示、后端逻辑和数据库设计。',
        'code', // 有代码块，类型为 code
        'published',
        156,
        67,
        34,
        'book_cat_2', // 书籍分类ID
        1, // order_index
      ]
    );

    const blocks = [
      {
        id: 'block_2',
        type: 'text' as const,
        content: JSON.stringify({
          content: '在现代 Web 开发中，掌握多种技术栈是非常重要的。今天我想和大家分享一个完整的全栈开发示例，包括前端展示、后端逻辑和数据库设计。'
        }),
        order: 0,
      },
      {
        id: 'block_3',
        type: 'image' as const,
        content: JSON.stringify({
          url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
          title: '代码编辑器',
          description: '一个现代化的代码编辑器界面，展示了Web开发的工作环境'
        }),
        order: 1,
      },
      {
        id: 'block_4',
        type: 'text' as const,
        content: JSON.stringify({
          content: '让我们从一个简单的 React 组件开始。这个组件展示了如何使用 useState 和 useEffect 钩子来管理状态和副作用。'
        }),
        order: 2,
      },
      {
        id: 'block_5',
        type: 'code' as const,
        content: JSON.stringify({
          language: 'typescript',
          code: `import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error('获取用户数据失败', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  if (loading) return <div>加载中...</div>;

  return (
    <div className="user-list">
      <h2>用户列表</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            <strong>{user.name}</strong> - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}`,
          title: 'React 用户列表组件'
        }),
        order: 3,
      },
      {
        id: 'block_6',
        type: 'text' as const,
        content: JSON.stringify({
          content: '接下来是后端的 API 实现。我们使用 Next.js 的 API Routes 来创建一个简单的 RESTful 接口。'
        }),
        order: 4,
      },
      {
        id: 'block_7',
        type: 'code' as const,
        content: JSON.stringify({
          language: 'typescript',
          code: `// app/api/users/route.ts
import { NextResponse } from 'next/server';

const users = [
  { id: 1, name: '张三', email: 'zhangsan@example.com' },
  { id: 2, name: '李四', email: 'lisi@example.com' },
  { id: 3, name: '王五', email: 'wangwu@example.com' },
];

export async function GET() {
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newUser = {
    id: users.length + 1,
    ...body,
  };
  
  users.push(newUser);
  return NextResponse.json(newUser, { status: 201 });
}`,
          title: 'Next.js API Route 示例'
        }),
        order: 5,
      },
      {
        id: 'block_8',
        type: 'image' as const,
        content: JSON.stringify({
          url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
          title: 'API 架构图',
          description: '展示前端和后端如何通过 RESTful API 进行通信'
        }),
        order: 6,
      },
      {
        id: 'block_9',
        type: 'text' as const,
        content: JSON.stringify({
          content: '通过这个简单的示例，我们可以看到全栈开发的基本流程：\n\n1. **前端**：使用 React 构建用户界面，通过 hooks 管理状态\n2. **后端**：使用 Next.js API Routes 提供数据接口\n3. **通信**：通过 HTTP 请求进行前后端数据交互\n\n这只是一个入门示例，实际项目中还需要考虑错误处理、数据验证、性能优化等。希望这篇文章能帮助你理解全栈开发的基本概念！🚀'
        }),
        order: 7,
      },
    ];

    for (const block of blocks) {
      await query(
        `INSERT INTO blocks (id, type, content, author) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE content = VALUES(content)`,
        [block.id, block.type, block.content, '李四']
      );

      await query(
        `INSERT INTO article_blocks (article_id, block_id, \`order\`) 
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE \`order\` = VALUES(\`order\`)`,
        [article2Id, block.id, block.order]
      );
    }

    console.log('✅ 文章2 插入成功\n');

    console.log('🎉 种子数据插入完成！');
    console.log('\n📊 数据统计:');
    console.log('  - 文章数量: 2');
    console.log('  - 块数量: 9');
    console.log('  - 文章1: 1个文字块');
    console.log('  - 文章2: 5个文字块 + 2个图片块 + 2个代码块');

  } catch (error) {
    console.error('❌ 插入种子数据失败:', error);
    throw error;
  }
}

// 执行
seedData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

