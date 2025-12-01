import type { Card } from '@/app/types/card';

/**
 * 模拟卡片数据
 * 包含各种类型的卡片示例
 */
export const mockCards: Card[] = [
  // 图片卡片
  {
    id: 1,
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba',
    title: '夕阳下的城市',
    description: '在城市的高处，看日落余晖洒满整个天际',
    likes: 128,
    createdAt: '2024-01-15',
    tags: ['摄影', '风景'],
  },
  
  // 文章卡片 - 纯文字文章（来自数据库）
  {
    id: 'article_1',
    type: 'article',
    title: '关于写作的一些思考',
    excerpt: '一篇简单的文章，分享关于写作的思考和感悟。写作不仅是记录，更是与自己对话的过程。',
    coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800',
    author: '张三',
    readTime: 3,
    views: 420,
    comments: 8,
    createdAt: '2024-01-15',
    tags: ['随笔', '生活'],
  },

  // 文章卡片 - 包含文字、图片、代码的混合文章（来自数据库）
  {
    id: 'article_2',
    type: 'article',
    title: '全栈开发入门：从前端到后端的完整示例',
    excerpt: '通过实际代码示例，带你了解全栈开发的基本流程。包括 React 前端组件、Next.js API 后端接口，以及前后端通信的完整实现。',
    coverImage: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
    author: '李四',
    readTime: 10,
    views: 1560,
    comments: 34,
    createdAt: '2024-01-18',
    tags: ['技术', 'Next.js'],
  },

  // 日记卡片
  {
    id: 3,
    type: 'diary',
    content: '今天天气真好，和朋友去了公园。看到樱花开了，春天真的来了。心情特别好！',
    mood: '😊',
    weather: '☀️',
    location: '北京',
    createdAt: '2024-01-13',
  },

  // 引言卡片
  {
    id: 4,
    type: 'quote',
    quote: '生活不是等待暴风雨过去，而是学会在雨中起舞。',
    author: '维尼修斯·德·莫赖斯',
    backgroundColor: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    createdAt: '2024-01-12',
  },

  // 视频卡片
  {
    id: 5,
    type: 'video',
    videoUrl: 'https://example.com/video.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb',
    title: '如何用 React 构建现代化的 Web 应用',
    duration: '15:32',
    views: 5678,
    createdAt: '2024-01-11',
    tags: ['视频', 'React'],
  },

  // 链接卡片
  {
    id: 6,
    type: 'link',
    url: 'https://react.dev',
    title: 'React 官方文档',
    description: 'React 是用于构建 Web 和原生用户界面的库',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee',
    createdAt: '2024-01-10',
    tags: ['链接', 'React'],
  },

  // 更多图片卡片
  {
    id: 7,
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    title: '山川湖海',
    likes: 256,
    createdAt: '2024-01-09',
    tags: ['摄影'],
  },

  // 更多日记
  {
    id: 8,
    type: 'diary',
    content: '加班到很晚，但项目终于上线了。虽然累，但很有成就感。',
    mood: '💪',
    weather: '🌙',
    createdAt: '2024-01-08',
  },

  // 更多文章
  {
    id: 9,
    type: 'article',
    title: 'TypeScript 类型体操实战指南',
    excerpt: 'TypeScript 的类型系统非常强大，本文将通过实际案例展示如何利用高级类型特性...',
    author: '李四',
    readTime: 12,
    views: 890,
    comments: 23,
    createdAt: '2024-01-07',
    tags: ['技术', 'TypeScript'],
  },

  // 更多引言
  {
    id: 10,
    type: 'quote',
    quote: '代码如诗，优雅而简洁。',
    author: '佚名',
    backgroundColor: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
    createdAt: '2024-01-06',
  },

  // 更多图片
  {
    id: 11,
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538',
    title: '咖啡时光',
    description: '一杯咖啡，一本书，一个下午',
    likes: 89,
    createdAt: '2024-01-05',
    tags: ['生活'],
  },

  // 更多视频
  {
    id: 12,
    type: 'video',
    videoUrl: 'https://example.com/video2.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
    title: 'CSS Grid 布局完全指南',
    duration: '22:15',
    views: 3456,
    createdAt: '2024-01-04',
    tags: ['视频', 'CSS'],
  },
];

