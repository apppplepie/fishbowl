import type { BookCard } from '@/app/types/card';

/**
 * BookCard的mock数据
 */
export const mockBookCards: BookCard[] = [
  {
    id: 1,
    type: 'book',
    title: 'JavaScript高级程序设计',
    description: '这是一本经典的JavaScript学习书籍，涵盖了JavaScript语言的核心概念和高级特性。适合有一定编程基础的开发者深入学习。',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop&crop=center',
    author: 'Nicholas C. Zakas',
    updatedAt: '2024-12-01T10:00:00Z',
    mainArticleId: 'article-1',
    createdAt: '2023-06-15T08:30:00Z',
    tags: ['JavaScript', '前端开发', '编程']
  },
  {
    id: 2,
    type: 'book',
    title: 'React实战指南',
    description: '从零开始学习React框架的完整指南，包括组件化开发、状态管理、路由等核心概念。通过实际项目案例深入理解React生态系统。',
    coverImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=600&fit=crop&crop=center',
    author: '陈瑜',
    updatedAt: '2024-11-28T15:30:00Z',
    mainArticleId: 'article-2',
    createdAt: '2023-08-20T09:15:00Z',
    tags: ['React', '前端框架', '组件化']
  },
  {
    id: 3,
    type: 'book',
    title: '设计模式之美',
    description: '深入探讨23种经典设计模式在实际项目中的应用，通过生动的代码示例和实际案例，帮助开发者掌握面向对象设计的核心思想。',
    coverImage: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400&h=600&fit=crop&crop=center',
    author: '王争',
    updatedAt: '2024-11-25T12:20:00Z',
    mainArticleId: 'article-3',
    createdAt: '2023-09-10T14:45:00Z',
    tags: ['设计模式', '软件工程', '架构']
  },
  {
    id: 4,
    type: 'book',
    title: 'Node.js微服务架构',
    description: '基于Node.js构建可扩展微服务架构的实用指南，涵盖服务拆分、API网关、容器化部署等关键技术栈。',
    coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=600&fit=crop&crop=center',
    author: '张三',
    updatedAt: '2024-11-20T16:45:00Z',
    mainArticleId: 'article-4',
    createdAt: '2023-10-05T11:20:00Z',
    tags: ['Node.js', '微服务', '后端开发']
  },
  {
    id: 5,
    type: 'book',
    title: 'TypeScript从入门到精通',
    description: 'TypeScript的全面教程，从基础语法到高级特性，再到实际项目应用。让JavaScript开发者平滑过渡到类型化编程。',
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=600&fit=crop&crop=center',
    author: '李四',
    updatedAt: '2024-11-15T13:10:00Z',
    mainArticleId: 'article-5',
    createdAt: '2023-11-12T10:30:00Z',
    tags: ['TypeScript', '类型系统', 'JavaScript']
  },
  {
    id: 6,
    type: 'book',
    title: '算法与数据结构精讲',
    description: '系统讲解常见算法和数据结构，结合LeetCode经典题目，提供完整的解题思路和代码实现。适合算法面试准备。',
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=center',
    author: '王五',
    updatedAt: '2024-11-10T09:25:00Z',
    mainArticleId: 'article-6',
    createdAt: '2023-12-01T08:00:00Z',
    tags: ['算法', '数据结构', '面试']
  }
];

/**
 * 获取单个mock书籍数据
 * @param id 书籍ID
 * @returns BookCard | undefined
 */
export function getMockBookCard(id: number): BookCard | undefined {
  return mockBookCards.find(book => book.id === id);
}

/**
 * 获取指定数量的mock书籍数据
 * @param count 需要获取的数量
 * @returns BookCard[]
 */
export function getMockBookCards(count: number = 6): BookCard[] {
  return mockBookCards.slice(0, count);
}

/**
 * 随机获取一个mock书籍数据
 * @returns BookCard
 */
export function getRandomMockBookCard(): BookCard {
  const randomIndex = Math.floor(Math.random() * mockBookCards.length);
  return mockBookCards[randomIndex];
}
