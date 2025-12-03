/**
 * 模拟文章数据
 * 支持纯文字和图文结合两种类型
 */

export type ArticleBlockType = 'text' | 'image';

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface ImageBlock {
  type: 'image';
  imageUrl: string;
  title?: string;
  description?: string;
  author?: string;
}

export type ArticleBlock = TextBlock | ImageBlock;

export interface Article {
  id: string;
  title: string;
  author: string;
  publishDate: string;
  lastModified: string;
  excerpt: string; // 摘要，用于文章列表
  blocks: ArticleBlock[]; // 文章内容块
  likes: number;
  shares: number;
  comments: number;
}

// 文章数据库
export const mockArticles: Record<string, Article> = {
  '1': {
    id: '1',
    title: '探索 Next.js 的服务端渲染：从理论到实践',
    author: '张三',
    publishDate: '2024-01-15',
    lastModified: '2024-01-20',
    excerpt: '深入探讨 Next.js 的服务端渲染（SSR）机制，通过实际案例展示如何优化性能和用户体验...',
    blocks: [
      {
        type: 'text',
        content: `在现代 Web 开发中，服务端渲染（Server-Side Rendering, SSR）已经成为提升用户体验和SEO优化的重要手段。Next.js 作为 React 生态中最流行的全栈框架，提供了开箱即用的 SSR 能力。`,
      },
      {
        type: 'text',
        content: `## 什么是服务端渲染？

服务端渲染是指在服务器端生成完整的 HTML 页面，然后发送给客户端。与传统的客户端渲染（CSR）相比，SSR 有以下几个优势：

1. 更快的首屏加载速度
2. 更好的 SEO 表现
3. 更友好的社交媒体分享预览`,
      },
      {
        type: 'text',
        content: `## Next.js 的 SSR 实现

Next.js 通过 getServerSideProps 函数实现 SSR。这个函数在每次请求时都会在服务器端执行，可以用来获取动态数据：

\`\`\`typescript
export async function getServerSideProps(context) {
  const res = await fetch('https://api.example.com/data');
  const data = await res.json();
  
  return {
    props: { data },
  };
}
\`\`\``,
      },
      {
        type: 'text',
        content: `## 性能优化技巧

在使用 SSR 时，需要注意以下几点来优化性能：

### 1. 数据缓存
使用 Redis 或内存缓存来存储频繁访问的数据，减少数据库查询次数。

### 2. 增量静态再生成（ISR）
对于不需要实时更新的页面，可以使用 ISR 来平衡 SSR 和 SSG 的优势：

\`\`\`typescript
export async function getStaticProps() {
  return {
    props: { data },
    revalidate: 60, // 每60秒重新生成一次
  };
}
\`\`\``,
      },
      {
        type: 'text',
        content: `### 3. 代码分割
Next.js 自动进行代码分割，但我们也可以使用动态导入来进一步优化：

\`\`\`typescript
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(() => import('../components/Heavy'));
\`\`\``,
      },
      {
        type: 'text',
        content: `## 实战案例

让我们通过一个实际案例来看看如何在生产环境中使用 SSR。假设我们要构建一个博客系统，需要在服务端获取文章数据并渲染：

\`\`\`typescript
// pages/blog/[id].tsx
export default function BlogPost({ post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}

export async function getServerSideProps({ params }) {
  const post = await fetchPost(params.id);
  return { props: { post } };
}
\`\`\``,
      },
      {
        type: 'text',
        content: `## 总结

Next.js 的 SSR 为我们提供了强大的功能，但也需要合理使用。在选择渲染策略时，应该根据页面的特点来决定：

- 静态内容 → SSG（静态生成）
- 动态但不频繁更新 → ISR（增量静态再生成）
- 需要实时数据 → SSR（服务端渲染）
- 纯客户端交互 → CSR（客户端渲染）

希望这篇文章能帮助你更好地理解和使用 Next.js 的 SSR 功能。如果你有任何问题，欢迎在评论区留言讨论！`,
      },
    ],
    likes: 128,
    shares: 45,
    comments: 23,
  },

  '2': {
    id: '2',
    title: '城市摄影日志：捕捉光影间的美好瞬间',
    author: '李摄影',
    publishDate: '2024-01-18',
    lastModified: '2024-01-19',
    excerpt: '用镜头记录城市的每一个美好瞬间，从清晨的第一缕阳光到夜晚的璀璨灯火...',
    blocks: [
      {
        type: 'text',
        content: `摄影是一门捕捉瞬间的艺术。在这个快节奏的城市里，每天都有无数美好的画面在我们眼前一闪而过。这次，我想和大家分享我在城市中拍摄的一些作品，以及背后的故事。`,
      },
      {
        type: 'text',
        content: `## 清晨的城市

清晨的城市总是格外宁静。当第一缕阳光洒在高楼大厦上，整个城市就像被镀上了一层金色。这是我最喜欢的拍摄时刻。`,
      },
      {
        type: 'image',
        imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800',
        title: '晨光中的城市',
        description: '清晨6点，从高处俯瞰整个城市。金色的阳光穿过云层，照亮了沉睡的街道。',
        author: '李摄影',
      },
      {
        type: 'text',
        content: `这张照片拍摄于某个周日的清晨。为了捕捉到最美的光线，我提前一个小时就到达了拍摄地点。等待的过程虽然漫长，但当看到这一刻的时候，所有的付出都是值得的。`,
      },
      {
        type: 'text',
        content: `## 街头人文

城市的魅力不仅在于建筑，更在于生活在这里的人们。街头摄影让我有机会记录下这些真实的生活片段。`,
      },
      {
        type: 'image',
        imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800',
        title: '城市夜景',
        description: '夜幕降临，城市亮起万家灯火。从这个角度看去，每一扇窗户都是一个故事。',
        author: '李摄影',
      },
      {
        type: 'text',
        content: `## 建筑之美

现代建筑的线条和光影变化总是能给人带来视觉上的震撼。我特别喜欢在不同的时间、不同的角度去拍摄同一座建筑，会发现完全不同的美。`,
      },
      {
        type: 'image',
        imageUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800',
        title: '现代建筑',
        description: '这座建筑的玻璃幕墙在夕阳下反射出迷人的光芒，形成了独特的光影效果。',
        author: '李摄影',
      },
      {
        type: 'text',
        content: `## 摄影心得

经过这段时间的拍摄，我总结了几点城市摄影的心得：

1. **时间很重要** - 黄金时段（日出日落）的光线最美
2. **角度决定一切** - 同一个场景，换个角度就是全新的画面
3. **等待值得** - 有时候需要耐心等待最佳时机
4. **后期适度** - 后期处理要保持照片的真实感

希望这些作品和心得能给喜欢摄影的朋友一些启发。摄影的乐趣在于发现美、记录美，让我们一起用镜头记录这个美好的世界！`,
      },
    ],
    likes: 256,
    shares: 89,
    comments: 47,
  },
};

// 获取文章列表（用于文章归档页面）
export function getArticleList(): Array<{
  id: string;
  title: string;
  author: string;
  publishDate: string;
  excerpt: string;
  likes: number;
  comments: number;
}> {
  return Object.values(mockArticles).map(article => ({
    id: article.id,
    title: article.title,
    author: article.author,
    publishDate: article.publishDate,
    excerpt: article.excerpt,
    likes: article.likes,
    comments: article.comments,
  }));
}

// 根据 ID 获取文章
export function getArticleById(id: string): Article | null {
  return mockArticles[id] || null;
}

