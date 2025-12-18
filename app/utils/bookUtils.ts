import type { BookCard } from '@/app/types/card';
import type { Block, Article } from '@/app/types/block';

// ID生成计数器，确保每次都生成唯一ID (从10000开始，避免与mock数据冲突)
let globalIdCounter = 10000;

/**
 * 从文章数据中提取书籍信息
 * @param articles 文章列表
 * @returns BookCard数组
 */
export function extractBooksFromArticles(articles: any[]): BookCard[] {
  console.log('开始处理文章，文章数量:', articles.length);

  // 按目录分组文章
  const booksByDirectory: { [key: string]: any[] } = {};

  articles.forEach(article => {
    // 只处理属于书籍子分类的文章（排除cat_bookcase本身）
    const categoryId = article.category_id || 'default';

    // 跳过直接属于cat_bookcase的文章（这些不是书籍简介）
    if (categoryId === 'cat_bookcase') {
      console.log('跳过直接属于cat_bookcase的文章:', article.title);
      return;
    }

    if (!booksByDirectory[categoryId]) {
      booksByDirectory[categoryId] = [];
    }
    booksByDirectory[categoryId].push(article);
  });

  console.log('分组结果:', Object.entries(booksByDirectory).map(([catId, articles]) => ({
    categoryId: catId,
    articleCount: articles.length,
    firstArticle: articles[0]?.title
  })));

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

    // 使用封面图片（如果有的话）
    let coverImage = '/default-book-cover.jpg'; // 默认封面
    if (mainArticle.coverImage && mainArticle.coverImage.url) {
      coverImage = mainArticle.coverImage.url;
    }

    // 创建BookCard - 生成唯一ID (从10000开始，避免与mock数据1-6冲突)
    globalIdCounter += 1;
    const bookCard: BookCard = {
      id: globalIdCounter, // 正数ID: 从10000开始递增
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

  console.log('生成的书籍数量:', books.length);
  console.log('生成的书籍:', books.map(b => ({ id: b.id, title: b.title, mainArticleId: b.mainArticleId })));

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

  // 从blocks生成简介
  const description = generateExcerptFromBlocks(blocks) || '暂无简介';

  // 找到order最小的image block作为封面
  const firstImageBlock = blocks.find((block: Block) => block.type === 'image') as any;
  const coverImage = firstImageBlock?.imageUrl || '/default-book-cover.jpg';

  // 生成唯一ID (从10000开始，避免与mock数据1-6冲突)
  globalIdCounter += 1;
  const bookCard: BookCard = {
    id: globalIdCounter, // 正数ID: 从10000开始递增
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

/**
 * 从blocks内容生成excerpt（简介）
 * 从第一个文字块中提取内容作为简介
 * @param blocks 文章的blocks数组
 * @param maxLength 最大长度，默认200字符
 * @returns 生成的excerpt字符串，如果没有文字块返回空字符串
 */
export function generateExcerptFromBlocks(blocks: Block[], maxLength: number = 200): string {
  if (!blocks || !Array.isArray(blocks)) {
    return '';
  }

  // 找到第一个文字块
  const firstTextBlock = blocks.find((block) => block.type === 'text') as any;

  if (!firstTextBlock?.content) {
    return '';
  }

  // 清理内容：移除多余的换行符，截取合适长度
  let excerpt = firstTextBlock.content
    .replace(/\n\s*\n/g, '\n') // 合并多个空行
    .replace(/^\s+|\s+$/g, '') // 移除首尾空白
    .substring(0, maxLength);

  // 如果内容被截断，添加省略号
  if (firstTextBlock.content.length > maxLength) {
    excerpt += '...';
  }

  return excerpt;
}