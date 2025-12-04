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
    // 按category_id分组，每本书籍是一个子分类
    const categoryId = article.category_id || 'default';

    if (!booksByDirectory[categoryId]) {
      booksByDirectory[categoryId] = [];
    }
    booksByDirectory[categoryId].push(article);
  });

  const books: BookCard[] = [];

  // 为每个目录创建BookCard
  Object.entries(booksByDirectory).forEach(([categoryId, directoryArticles]) => {
    // 找到第一篇文章作为主要文章（通常是简介文章）
    const mainArticle = directoryArticles[0];

    if (!mainArticle) return;

    // 使用API返回的预览数据构建书籍信息
    // 使用分类名称作为书名，如果没有则使用第一篇文章的标题
    const bookTitle = mainArticle.category_name || mainArticle.title || `书籍 ${categoryId}`;

    // 使用文章摘要作为书籍简介
    const description = mainArticle.excerpt || '暂无简介';

    // 使用第一张图片作为封面（如果有的话）
    let coverImage = '/default-book-cover.jpg'; // 默认封面
    if (mainArticle.firstImageUrl) {
      coverImage = mainArticle.firstImageUrl;
    }

    // 创建BookCard
    const bookCard: BookCard = {
      id: parseInt(`${Date.now()}${Math.random()}`), // 生成唯一ID
      type: 'book',
      title: bookTitle,
      description: description,
      coverImage: coverImage,
      author: mainArticle.author || '未知作者',
      updatedAt: mainArticle.last_modified || mainArticle.publish_date || new Date().toISOString(),
      mainArticleId: mainArticle.id.toString(),
      createdAt: mainArticle.publish_date || new Date().toISOString(),
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
