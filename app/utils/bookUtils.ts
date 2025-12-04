import type { BookCard } from '@/app/types/card';
import type { Block, Article } from '@/app/types/block';

/**
 * 从文章数据中提取书籍信息
 * @param articles 文章列表
 * @returns BookCard数组
 */
export function extractBooksFromArticles(articles: any[]): BookCard[] {
  // 按目录分组文章
  const booksByDirectory: { [key: string]: any[] } = {};

  articles.forEach(article => {
    // 假设文章有category或directory字段表示所属目录
    const directoryName = article.directory || article.category || 'default';

    if (!booksByDirectory[directoryName]) {
      booksByDirectory[directoryName] = [];
    }
    booksByDirectory[directoryName].push(article);
  });

  const books: BookCard[] = [];

  // 为每个目录创建BookCard
  Object.entries(booksByDirectory).forEach(([directoryName, directoryArticles]) => {
    // 找到order最小的文章（主要文章）
    const mainArticle = directoryArticles
      .filter(article => article.blocks && Array.isArray(article.blocks))
      .sort((a, b) => (a.order || 0) - (b.order || 0))[0];

    if (!mainArticle) return;

    // 从blocks中提取信息
    const blocks = mainArticle.blocks || [];
    const sortedBlocks = blocks.sort((a: Block, b: Block) => a.order - b.order);

    // 找到order最小的text block作为简介
    const firstTextBlock = sortedBlocks.find((block: Block) => block.type === 'text') as any;
    const description = firstTextBlock?.content || '暂无简介';

    // 找到order最小的image block作为封面
    const firstImageBlock = sortedBlocks.find((block: Block) => block.type === 'image') as any;
    const coverImage = firstImageBlock?.imageUrl || '/default-book-cover.jpg'; // 默认封面

    // 找到order=0的文章作为主要文章ID
    const orderZeroArticle = directoryArticles.find(article => article.order === 0);
    const mainArticleId = orderZeroArticle?.id || mainArticle.id;

    // 创建BookCard
    const bookCard: BookCard = {
      id: parseInt(`${Date.now()}${Math.random()}`), // 生成唯一ID
      type: 'book',
      title: directoryName, // 目录名作为书名
      description: description,
      coverImage: coverImage,
      author: mainArticle.author || '未知作者',
      updatedAt: mainArticle.updatedAt || mainArticle.createdAt || new Date().toISOString(),
      mainArticleId: mainArticleId.toString(),
      createdAt: mainArticle.createdAt || new Date().toISOString(),
    };

    books.push(bookCard);
  });

  return books;
}

/**
 * 从单个文章数据创建BookCard
 * 用于处理单个目录的文章数据
 */
export function createBookCardFromArticle(article: any, directoryName?: string): BookCard | null {
  if (!article.blocks || !Array.isArray(article.blocks)) {
    return null;
  }

  const blocks = article.blocks.sort((a: Block, b: Block) => a.order - b.order);

  // 找到order最小的text block作为简介
  const firstTextBlock = blocks.find((block: Block) => block.type === 'text') as any;
  const description = firstTextBlock?.content || '暂无简介';

  // 找到order最小的image block作为封面
  const firstImageBlock = blocks.find((block: Block) => block.type === 'image') as any;
  const coverImage = firstImageBlock?.imageUrl || '/default-book-cover.jpg';

  const bookCard: BookCard = {
    id: parseInt(`${Date.now()}${Math.random()}`),
    type: 'book',
    title: directoryName || article.title || '未命名书籍',
    description: description,
    coverImage: coverImage,
    author: article.author || '未知作者',
    updatedAt: article.updatedAt || article.createdAt || new Date().toISOString(),
    mainArticleId: article.id.toString(),
    createdAt: article.createdAt || new Date().toISOString(),
  };

  return bookCard;
}
