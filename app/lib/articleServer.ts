/**
 * Server-side article data fetching utilities
 * Used in RSC (React Server Components) to fetch article data
 */

import { cookies } from 'next/headers';

interface ArticleBlock {
  id: string;
  type: 'text' | 'image' | 'code' | 'placeholder';
  order: number;
  parsedContent?: any;
  access_level?: number;
  original_type?: string;
  required_access_level?: number;
  user_access_level?: number;
  message?: string;
}

interface Article {
  id: string;
  title: string;
  author: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  excerpt: string | null;
  type: string;
  category_id: string | null;
  status: string;
  likes: number;
  shares: number;
  comments: number;
  blocks: ArticleBlock[];
  tags: string[];
}

/**
 * Fetch article data from API (server-side)
 */
export async function fetchArticleData(articleId: string): Promise<Article | null> {
  try {
    // Get cookies to pass authentication
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    // Fetch from internal API route
    // In server components, we can use relative URLs or construct the full URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/articles/${articleId}`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store', // Always fetch fresh data
    });

    if (!response.ok) {
      console.error(`Failed to fetch article ${articleId}: ${response.status}`);
      return null;
    }

    const result = await response.json();

    if (result.success && result.article) {
      // Process blocks data to match ArticleStaticView expectations
      const processedBlocks = result.article.blocks.map((block: any) => {
        if (block.type === 'image' && block.parsedContent?.url) {
          return {
            ...block,
            url: block.parsedContent.url,
            src: block.parsedContent.url,
            alt: block.parsedContent.title || '',
            title: block.parsedContent.title || '',
            description: block.parsedContent.description || '',
          };
        } else if (block.type === 'text' && block.parsedContent?.content) {
          return {
            ...block,
            html: block.parsedContent.content,
            content: block.parsedContent.content,
          };
        } else if (block.type === 'code' && block.parsedContent) {
          return {
            ...block,
            code: block.parsedContent.code || '',
            language: block.parsedContent.language || 'javascript',
            title: block.parsedContent.title || '',
          };
        }
        return block;
      });

      return {
        ...result.article,
        blocks: processedBlocks,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

/**
 * Fetch category path for breadcrumb
 */
export async function fetchCategoryPath(categoryId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/categories/${categoryId}/path`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    if (result.success && result.path) {
      return result.path;
    }

    return [];
  } catch (error) {
    console.error('Error fetching category path:', error);
    return [];
  }
}
