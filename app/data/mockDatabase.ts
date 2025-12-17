/**
 * 模拟数据库结构
 * 基于关系型数据库设计，包含三张表：
 * 1. articles（文章表）
 * 2. blocks（块表）
 * 3. article_blocks（文章-块关系表）
 */

// ============================================
// 类型定义
// ============================================

/**
 * 块类型
 */
export type BlockType = 'text' | 'image' | 'code';

/**
 * 文章状态
 */
export type ArticleStatus = 'draft' | 'published';

/**
 * 块表（存储所有内容块）
 */
export interface Block {
  id: string;
  type: BlockType;
  content: string; // JSON格式存储，根据type解析不同结构
  author: string;
  created_at: string;
  access_level?: number; // 内容访问等级：1-10，默认为1
}

/**
 * 文章表（存储文章基本信息）
 */
export interface Article {
  id: string;
  title: string;
  author: string;
  publish_date: string;
  last_modified: string;
  excerpt: string;
  status: ArticleStatus;
  likes: number;
  shares: number;
  comments: number;
}

/**
 * 文章-块关系表（存储文章和块的关联关系及排序）
 */
export interface ArticleBlock {
  article_id: string;
  block_id: string;
  order: number; // 块在文章中的顺序，从0开始
}

// ============================================
// 块内容的类型定义（用于解析content字段）
// ============================================

/**
 * 文字块内容
 */
export interface TextBlockContent {
  content: string;
}

/**
 * 图片块内容
 */
export interface ImageBlockContent {
  url: string;
  title?: string;
  description?: string;
}

/**
 * 代码块内容
 */
export interface CodeBlockContent {
  language: string;
  code: string;
  title?: string;
}

// ============================================
// 数据库表的模拟数据
// ============================================

/**
 * 块表数据
 */
export const blocksTable: Record<string, Block> = {
  'block_1': {
    id: 'block_1',
    type: 'text',
    content: JSON.stringify({
      content: '这是一篇简单的文章，只包含一个文字块。在这个文字块中，我想分享一些关于写作的思考。\n\n写作是一种表达，也是一种思考的过程。当我们将想法转化为文字时，我们不仅仅是在记录，更是在整理和深化自己的思维。\n\n每一次写作都是一次与自己对话的机会。通过文字，我们可以更清晰地看到自己的想法，发现其中的逻辑漏洞，或是找到新的灵感。\n\n希望这篇简短的文字能给你带来一些启发。写作的魅力就在于此——简单而深刻。'
    } as TextBlockContent),
    author: '张三',
    created_at: '2024-01-15T08:30:00Z',
  },

  'block_2': {
    id: 'block_2',
    type: 'text',
    content: JSON.stringify({
      content: '在现代 Web 开发中，掌握多种技术栈是非常重要的。今天我想和大家分享一个完整的全栈开发示例，包括前端展示、后端逻辑和数据库设计。'
    } as TextBlockContent),
    author: '李四',
    created_at: '2024-01-18T09:00:00Z',
  },

  'block_3': {
    id: 'block_3',
    type: 'image',
    content: JSON.stringify({
      url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
      title: '代码编辑器',
      description: '一个现代化的代码编辑器界面，展示了Web开发的工作环境'
    } as ImageBlockContent),
    author: '李四',
    created_at: '2024-01-18T09:15:00Z',
  },

  'block_4': {
    id: 'block_4',
    type: 'text',
    content: JSON.stringify({
      content: '让我们从一个简单的 React 组件开始。这个组件展示了如何使用 useState 和 useEffect 钩子来管理状态和副作用。'
    } as TextBlockContent),
    author: '李四',
    created_at: '2024-01-18T09:20:00Z',
  },

  'block_5': {
    id: 'block_5',
    type: 'code',
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 模拟 API 调用
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        setUsers(data);
        setLoading(false);
      } catch (err) {
        setError('获取用户数据失败');
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

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
    } as CodeBlockContent),
    author: '李四',
    created_at: '2024-01-18T09:25:00Z',
  },

  'block_6': {
    id: 'block_6',
    type: 'text',
    content: JSON.stringify({
      content: '接下来是后端的 API 实现。我们使用 Next.js 的 API Routes 来创建一个简单的 RESTful 接口。'
    } as TextBlockContent),
    author: '李四',
    created_at: '2024-01-18T09:30:00Z',
  },

  'block_7': {
    id: 'block_7',
    type: 'code',
    content: JSON.stringify({
      language: 'typescript',
      code: `// app/api/users/route.ts
import { NextResponse } from 'next/server';

// 模拟数据库
const users = [
  { id: 1, name: '张三', email: 'zhangsan@example.com' },
  { id: 2, name: '李四', email: 'lisi@example.com' },
  { id: 3, name: '王五', email: 'wangwu@example.com' },
];

export async function GET() {
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newUser = {
    id: users.length + 1,
    name: body.name,
    email: body.email,
  };
  
  users.push(newUser);
  
  return NextResponse.json(newUser, { status: 201 });
}`,
      title: 'Next.js API Route 示例'
    } as CodeBlockContent),
    author: '李四',
    created_at: '2024-01-18T09:35:00Z',
  },

  'block_8': {
    id: 'block_8',
    type: 'image',
    content: JSON.stringify({
      url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
      title: 'API 架构图',
      description: '展示前端和后端如何通过 RESTful API 进行通信'
    } as ImageBlockContent),
    author: '李四',
    created_at: '2024-01-18T09:40:00Z',
  },

  'block_9': {
    id: 'block_9',
    type: 'text',
    content: JSON.stringify({
      content: '通过这个简单的示例，我们可以看到全栈开发的基本流程：\n\n1. **前端**：使用 React 构建用户界面，通过 hooks 管理状态\n2. **后端**：使用 Next.js API Routes 提供数据接口\n3. **通信**：通过 HTTP 请求进行前后端数据交互\n\n这只是一个入门示例，实际项目中还需要考虑：\n- 错误处理和边界情况\n- 数据验证和安全性\n- 性能优化和缓存\n- 单元测试和集成测试\n\n希望这篇文章能帮助你理解全栈开发的基本概念。继续学习，不断实践！🚀'
    } as TextBlockContent),
    author: '李四',
    created_at: '2024-01-18T09:45:00Z',
  },

  // JavaScript高级程序设计 - 书籍内容
  'block_js_intro': {
    id: 'block_js_intro',
    type: 'text',
    content: JSON.stringify({
      content: 'JavaScript作为世界上最流行的编程语言之一，已经成为Web开发不可或缺的一部分。本书系统地介绍了JavaScript的核心概念，包括：\n\n• **语言基础**：变量、数据类型、操作符、控制语句\n• **对象和原型**：理解JavaScript的面向对象特性\n• **函数和作用域**：闭包、this绑定、箭头函数\n• **DOM操作**：事件处理、元素操作、样式修改\n• **异步编程**：回调、Promise、async/await\n• **ES6+特性**：模块化、解构赋值、模板字符串\n\n通过本书的学习，你将掌握JavaScript的高级概念和最佳实践，为成为一名优秀的JavaScript开发者打下坚实的基础。'
    } as TextBlockContent),
    author: 'Nicholas C. Zakas',
    created_at: '2024-12-01T10:00:00Z',
  },

  // React实战指南 - 书籍内容
  'block_react_intro': {
    id: 'block_react_intro',
    type: 'text',
    content: JSON.stringify({
      content: 'React是Facebook开发的前端JavaScript库，用于构建用户界面。它采用了组件化的开发模式，让开发者能够构建可复用的UI组件。\n\n本书将带你学习：\n\n• **JSX语法**：声明式UI描述方式\n• **组件化开发**：函数组件和类组件\n• **状态管理**：useState、useEffect等Hooks\n• **组件通信**：props、Context、Redux\n• **路由管理**：React Router的使用\n• **性能优化**：memo、useMemo、useCallback\n• **测试编写**：Jest和React Testing Library\n\n通过实际项目案例，你将学会如何使用React构建现代化的Web应用。'
    } as TextBlockContent),
    author: '陈瑜',
    created_at: '2024-11-28T15:30:00Z',
  },

  // 设计模式之美 - 书籍内容
  'block_design_patterns_intro': {
    id: 'block_design_patterns_intro',
    type: 'text',
    content: JSON.stringify({
      content: '设计模式是软件开发中解决常见问题的经典方案。本书详细介绍了23种经典设计模式，包括：\n\n**创建型模式：**\n• 工厂方法（Factory Method）\n• 抽象工厂（Abstract Factory）\n• 单例模式（Singleton）\n• 建造者模式（Builder）\n• 原型模式（Prototype）\n\n**结构型模式：**\n• 适配器模式（Adapter）\n• 装饰器模式（Decorator）\n• 代理模式（Proxy）\n• 外观模式（Facade）\n• 桥接模式（Bridge）\n• 组合模式（Composite）\n• 享元模式（Flyweight）\n\n**行为型模式：**\n• 观察者模式（Observer）\n• 模板方法（Template Method）\n• 策略模式（Strategy）\n• 命令模式（Command）\n• 状态模式（State）\n• 责任链模式（Chain of Responsibility）\n• 解释器模式（Interpreter）\n• 中介者模式（Mediator）\n• 访问者模式（Visitor）\n• 备忘录模式（Memento）\n• 迭代器模式（Iterator）\n\n每种模式都配有详细的代码示例和实际应用场景，帮助你掌握面向对象设计的核心思想。'
    } as TextBlockContent),
    author: '王争',
    created_at: '2024-11-25T12:20:00Z',
  },
};

/**
 * 文章表数据
 */
export const articlesTable: Record<string, Article> = {
  'article_1': {
    id: 'article_1',
    title: '关于写作的一些思考',
    author: '张三',
    publish_date: '2024-01-15',
    last_modified: '2024-01-15',
    excerpt: '一篇简单的文章，分享关于写作的思考和感悟。写作不仅是记录，更是与自己对话的过程。',
    status: 'published',
    likes: 42,
    shares: 15,
    comments: 8,
  },

  'article_2': {
    id: 'article_2',
    title: '全栈开发入门：从前端到后端的完整示例',
    author: '李四',
    publish_date: '2024-01-18',
    last_modified: '2024-01-19',
    excerpt: '通过实际代码示例，带你了解全栈开发的基本流程。包括 React 前端组件、Next.js API 后端接口，以及前后端通信的完整实现。',
    status: 'published',
    likes: 156,
    shares: 67,
    comments: 34,
  },

  'article-1': {
    id: 'article-1',
    title: 'JavaScript高级程序设计',
    author: 'Nicholas C. Zakas',
    publish_date: '2024-12-01',
    last_modified: '2024-12-01',
    excerpt: '这是一本经典的JavaScript学习书籍，涵盖了JavaScript语言的核心概念和高级特性。适合有一定编程基础的开发者深入学习。',
    status: 'published',
    likes: 128,
    shares: 45,
    comments: 23,
  },

  'article-2': {
    id: 'article-2',
    title: 'React实战指南',
    author: '陈瑜',
    publish_date: '2024-11-28',
    last_modified: '2024-11-28',
    excerpt: '从零开始学习React框架的完整指南，包括组件化开发、状态管理、路由等核心概念。通过实际项目案例深入理解React生态系统。',
    status: 'published',
    likes: 256,
    shares: 89,
    comments: 67,
  },

  'article-3': {
    id: 'article-3',
    title: '设计模式之美',
    author: '王争',
    publish_date: '2024-11-25',
    last_modified: '2024-11-25',
    excerpt: '深入探讨23种经典设计模式在实际项目中的应用，通过生动的代码示例和实际案例，帮助开发者掌握面向对象设计的核心思想。',
    status: 'published',
    likes: 189,
    shares: 72,
    comments: 45,
  },

  'article-4': {
    id: 'article-4',
    title: 'Node.js微服务架构',
    author: '张三',
    publish_date: '2024-11-20',
    last_modified: '2024-11-20',
    excerpt: '基于Node.js构建可扩展微服务架构的实用指南，涵盖服务拆分、API网关、容器化部署等关键技术栈。',
    status: 'published',
    likes: 134,
    shares: 56,
    comments: 38,
  },

  'article-5': {
    id: 'article-5',
    title: 'TypeScript从入门到精通',
    author: '李四',
    publish_date: '2024-11-15',
    last_modified: '2024-11-15',
    excerpt: 'TypeScript的全面教程，从基础语法到高级特性，再到实际项目应用。让JavaScript开发者平滑过渡到类型化编程。',
    status: 'published',
    likes: 203,
    shares: 81,
    comments: 52,
  },

  'article-6': {
    id: 'article-6',
    title: '算法与数据结构精讲',
    author: '王五',
    publish_date: '2024-11-10',
    last_modified: '2024-11-10',
    excerpt: '系统讲解常见算法和数据结构，结合LeetCode经典题目，提供完整的解题思路和代码实现。适合算法面试准备。',
    status: 'published',
    likes: 312,
    shares: 124,
    comments: 89,
  },
};

/**
 * 文章-块关系表数据
 */
export const articleBlocksTable: ArticleBlock[] = [
  // 文章1：只有一个文字块
  {
    article_id: 'article_1',
    block_id: 'block_1',
    order: 0,
  },

  // 文章2：包含多种类型的块
  {
    article_id: 'article_2',
    block_id: 'block_2',
    order: 0,
  },
  {
    article_id: 'article_2',
    block_id: 'block_3',
    order: 1,
  },
  {
    article_id: 'article_2',
    block_id: 'block_4',
    order: 2,
  },
  {
    article_id: 'article_2',
    block_id: 'block_5',
    order: 3,
  },
  {
    article_id: 'article_2',
    block_id: 'block_6',
    order: 4,
  },
  {
    article_id: 'article_2',
    block_id: 'block_7',
    order: 5,
  },
  {
    article_id: 'article_2',
    block_id: 'block_8',
    order: 6,
  },
  {
    article_id: 'article_2',
    block_id: 'block_9',
    order: 7,
  },

  // 书籍文章：每本书只有一个介绍块
  {
    article_id: 'article-1',
    block_id: 'block_js_intro',
    order: 0,
  },
  {
    article_id: 'article-2',
    block_id: 'block_react_intro',
    order: 0,
  },
  {
    article_id: 'article-3',
    block_id: 'block_design_patterns_intro',
    order: 0,
  },
];

// ============================================
// 辅助函数：模拟数据库查询
// ============================================

/**
 * 根据文章ID获取完整的文章数据（包括所有块）
 */
export function getArticleWithBlocks(articleId: string) {
  const article = articlesTable[articleId];
  if (!article) return null;

  // 获取该文章的所有块关联
  const articleBlocks = articleBlocksTable
    .filter(ab => ab.article_id === articleId)
    .sort((a, b) => a.order - b.order); // 按order排序

  // 获取块的详细数据
  const blocks = articleBlocks.map(ab => {
    const block = blocksTable[ab.block_id];
    return {
      ...block,
      // 解析 content JSON
      parsedContent: JSON.parse(block.content),
    };
  });

  return {
    ...article,
    blocks,
  };
}

/**
 * 获取所有已发布的文章列表（不包括块内容）
 */
export function getPublishedArticles() {
  return Object.values(articlesTable)
    .filter(article => article.status === 'published')
    .sort((a, b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime());
}

/**
 * 根据块ID获取块数据
 */
export function getBlockById(blockId: string) {
  const block = blocksTable[blockId];
  if (!block) return null;

  return {
    ...block,
    parsedContent: JSON.parse(block.content),
  };
}

/**
 * 获取某个用户创建的所有块
 */
export function getBlocksByAuthor(author: string) {
  return Object.values(blocksTable)
    .filter(block => block.author === author)
    .map(block => ({
      ...block,
      parsedContent: JSON.parse(block.content),
    }));
}

