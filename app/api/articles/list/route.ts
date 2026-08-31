/**
 * 优化的文章列表 API
 * 一次查询返回所有类型文章的预览数据，避免 N+1 查询
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import {
  calculateServerSpan,
  charCountToLinesForDiary,
  getColumnWidthFromContainerWidth,
} from '@/lib/masonry-server-utils';
import { buildBlocksFromArticle } from '@/lib/lib-card-layout';
import type { ArticleBlock } from '@/lib/lib-card-layout';

// 类型定义
interface RawArticle {
  id: string;
  title: string;
  author: string;
  author_id: string;
  published_at: Date;
  created_at: Date;
  updated_at: Date;
  excerpt: string | null;
  type: 'text' | 'image' | 'drawing' | 'code' | 'diary';
  status: string;
  likes: number;
  shares: number;
  comments: number;
  category_id: string;
  order_index: number;
  visible_access_level: number | null;
  full_access_level: number | null;
  category_name: string;
  category_path: string | null;
  category_depth: number | null;
  cover_image: any | null; // 封面图片对象或null
  cover_is_placeholder: boolean; // 是否为占位符封面
  tags: string[] | null;
  codePreview?: string | null;
  codeLanguage?: string | null;
  codeBlockCount?: number | null;
}

interface ProcessedArticle {
  id: string;
  title: string;
  author: string;
  authorId: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  excerpt: string | null;
  type: 'text' | 'image' | 'drawing' | 'code' | 'diary';
  status: string;
  likes: number;
  shares: number;
  comments: number;
  categoryId: string;
  orderInCategory: number;
  visibleAccessLevel: number | null;
  fullAccessLevel: number | null;
  categoryName: string;
  coverImage: any | null; // 封面图片对象
  coverIsPlaceholder: boolean; // 是否为占位符封面
  tags: string[];
  codePreview?: string | null;
  codeLanguage?: string | null;
  codeBlockCount?: number | null;
  precomputedSpan?: number; // 服务端预计算的 masonry span
  /** 文章卡 blocks 驱动：仅 type 为 text 时存在 */
  blocks?: ArticleBlock[];
  /** 日记卡：后端按正文字符数算好的行数，用于 span 与 line-clamp */
  layoutHint?: { excerptLines?: number };
}

/**
 * 递归获取分类及其所有子分类的ID
 */
async function getCategoryAndChildrenIds(categoryId: string): Promise<string[]> {
  const result: string[] = [categoryId];
  const findChildren = async (parentIds: string[]) => {
    if (parentIds.length === 0) return;
    const placeholders = parentIds.map(() => '?').join(',');
    const children = await query<any[]>(
      `SELECT id FROM categories WHERE parent_id IN (${placeholders})`,
      parentIds
    );
    if (children.length > 0) {
      const childIds = children.map(c => c.id);
      result.push(...childIds);
      await findChildren(childIds);
    }
  };
  await findChildren([categoryId]);
  return result;
}

/**
 * DFS 排序文章：按分类树顺序 + 分类内 order_index
 */
function sortArticlesByDFS(
  articles: ProcessedArticle[],
  rootCategoryId: string,
  categories: Array<{ id: string; parent_id: string | null; order_index: number }>
): ProcessedArticle[] {
  // 构建分类树映射
  const categoryMap = new Map<string, { id: string; children: string[]; order_index: number }>();
  categories.forEach(cat => {
    categoryMap.set(cat.id, { id: cat.id, children: [], order_index: cat.order_index || 0 });
  });
  categories.forEach(cat => {
    if (cat.parent_id) {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) parent.children.push(cat.id);
    }
  });

  // 按 order_index 排序子分类
  categoryMap.forEach(cat => {
    cat.children.sort((a, b) => {
      const catA = categoryMap.get(a)!;
      const catB = categoryMap.get(b)!;
      return catA.order_index - catB.order_index;
    });
  });

  // DFS 遍历获取分类顺序
  const categoryOrder: string[] = [];
  const dfs = (catId: string) => {
    categoryOrder.push(catId);
    const cat = categoryMap.get(catId);
    if (cat) {
      cat.children.forEach(childId => dfs(childId));
    }
  };
  dfs(rootCategoryId);

  // 按分类顺序和 order_index 排序文章
  const articleMap = new Map<string, ProcessedArticle[]>();
  articles.forEach(article => {
    const catId = article.categoryId;
    if (!articleMap.has(catId)) articleMap.set(catId, []);
    articleMap.get(catId)!.push(article);
  });
  articleMap.forEach(articles => {
    articles.sort((a, b) => a.orderInCategory - b.orderInCategory);
  });

  // 按分类顺序合并文章
  const result: ProcessedArticle[] = [];
  categoryOrder.forEach(catId => {
    const catArticles = articleMap.get(catId);
    if (catArticles) result.push(...catArticles);
  });

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 容器宽度（请求头）：用于与前端一致地算列宽，再算 precomputedSpan
    const containerWidthHeader = request.headers.get('X-Container-Width');
    const containerWidth =
      containerWidthHeader != null ? parseInt(containerWidthHeader, 10) : NaN;
    const columnWidth =
      Number.isFinite(containerWidth) && containerWidth > 0
        ? getColumnWidthFromContainerWidth(containerWidth)
        : undefined;

    // 获取当前用户权限
    const currentUser = getCurrentUser(request);
    const userAccessLevel = currentUser ? (currentUser.max_access_level || 3) : 2; // 登录用户默认3级，游客2级

    // 参数验证和清理
    const status = searchParams.get('status') || 'published';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '15', 10), 1), 100); // 限制在1-100之间
    // 支持 page 参数（用于横向瀑布流）和 offset 参数（用于纵向瀑布流）
    const page = searchParams.get('page');
    const offsetParam = searchParams.get('offset');
    // 如果提供了 page 参数，计算 offset；否则使用 offset 参数
    const offset = page 
      ? (parseInt(page, 10) - 1) * limit 
      : Math.max(parseInt(offsetParam || '0', 10), 0);
    const categoryId = searchParams.get('categoryId');
    const orderByPath = searchParams.get('orderByPath') === 'true';
    const search = (searchParams.get('search') || '').trim();

    // 验证状态参数
    const validStatuses = ['published', 'draft', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `无效的状态参数: ${status}` },
        { status: 400 }
      );
    }

    // 构建查询条件
    let whereClause = 'a.status = ?';
    const queryParams: any[] = [status];

    if (categoryId) {
      // 获取该分类及其所有子分类的ID
      const categoryIds = await getCategoryAndChildrenIds(categoryId);
      console.log('Category IDs for', categoryId, ':', categoryIds);

      if (categoryIds.length > 0) {
        const placeholders = categoryIds.map(() => '?').join(',');
        whereClause += ` AND a.category_id IN (${placeholders})`;
        queryParams.push(...categoryIds);
      } else {
        console.log('No category IDs found for', categoryId);
      }
    }

    if (search) {
      whereClause += ` AND (a.title LIKE ? OR a.excerpt LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // 在前面添加封面权限参数
    queryParams.unshift(userAccessLevel, userAccessLevel, userAccessLevel);

    // 如果 orderByPath=true，需要获取所有文章（不分页），然后排序
    const shouldOrderByPath = orderByPath && categoryId;
    const queryLimit = shouldOrderByPath ? 10000 : limit; // 临时设置大limit，后续会排序
    const queryOffset = shouldOrderByPath ? 0 : offset;

    // 优化查询：使用子查询直接获取预览数据
    const articles = await query<RawArticle[]>(
      `SELECT
        a.id,
        a.title,
        a.author,
        a.author_id,
        a.published_at,
        a.created_at,
        a.updated_at,
        a.excerpt,
        a.type,
        a.status,
        a.likes,
        a.shares,
        a.comments,
        a.category_id,
        a.order_index,
        a.visible_access_level,
        a.full_access_level,
        c.name as category_name,
        c.path as category_path,
        c.depth as category_depth,
        c.order_index as category_order_index,
        -- 封面图片处理：根据权限返回真实封面或占位符，并带上 media 的 width/height 供瀑布流按比例占位
        CASE
          WHEN a.cover_image IS NOT NULL AND a.cover_access_level <= ? THEN
            JSON_OBJECT(
              'url', JSON_UNQUOTE(JSON_EXTRACT(a.cover_image, '$.url')),
              'title', JSON_UNQUOTE(JSON_EXTRACT(a.cover_image, '$.title')),
              'description', JSON_UNQUOTE(JSON_EXTRACT(a.cover_image, '$.description')),
              'width', m.width,
              'height', m.height,
              'aspect_ratio', m.aspect_ratio,
              'blur_data_url', m.blur_data_url
            )
          WHEN a.cover_image IS NOT NULL THEN
            JSON_OBJECT(
              'url', '${PLACEHOLDER_IMAGE_URL}',
              'title', '内容受限',
              'description', CONCAT('需要', a.cover_access_level, '级权限'),
              'width', m.width,
              'height', m.height,
              'aspect_ratio', m.aspect_ratio,
              'blur_data_url', m.blur_data_url
            )
          ELSE NULL
        END as cover_image,
        -- 是否为占位符封面
        CASE
          WHEN a.cover_image IS NOT NULL AND a.cover_access_level > ? THEN true
          ELSE false
        END as cover_is_placeholder,
        -- 获取文章标签（JSON数组格式）
        (
          SELECT JSON_ARRAYAGG(t.name)
          FROM tags t
          JOIN article_tags at ON t.id = at.tag_id
          WHERE at.article_id = a.id
          ORDER BY t.name ASC
        ) as tags,
        -- 代码类型：第一个代码块的代码
        CASE
          WHEN a.type = 'code' THEN (
            SELECT JSON_UNQUOTE(JSON_EXTRACT(b.content, '$.code'))
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id
              AND b.type = 'code'
              AND COALESCE(b.access_level, 1) <= ?
            ORDER BY ab.\`order\` ASC
            LIMIT 1
          )
          ELSE NULL
        END as codePreview,
        CASE
          WHEN a.type = 'code' THEN (
            SELECT JSON_UNQUOTE(JSON_EXTRACT(b.content, '$.language'))
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'code'
            ORDER BY ab.\`order\` ASC
            LIMIT 1
          )
          ELSE NULL
        END as codeLanguage,
        CASE
          WHEN a.type = 'code' THEN (
            SELECT COUNT(*)
            FROM blocks b
            JOIN article_blocks ab ON b.id = ab.block_id
            WHERE ab.article_id = a.id AND b.type = 'code'
          )
          ELSE NULL
        END as codeBlockCount
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN (
         SELECT article_id, block_id FROM (
           SELECT ab.article_id, ab.block_id,
             ROW_NUMBER() OVER (PARTITION BY ab.article_id ORDER BY ab.\`order\`) as rn
           FROM article_blocks ab
           INNER JOIN blocks b ON b.id = ab.block_id AND b.type = 'image'
         ) t WHERE rn = 1
       ) first_img ON first_img.article_id = a.id
       LEFT JOIN blocks b_cover ON b_cover.id = first_img.block_id
       LEFT JOIN media m ON m.id = b_cover.media_id
       WHERE ${whereClause}
       ${shouldOrderByPath ? '' : `ORDER BY a.updated_at DESC LIMIT ${queryLimit} OFFSET ${queryOffset}`}`,
      queryParams
    );

    // 处理和清理查询结果：文章卡用 blocks + precomputedSpan，其余用 calculateServerSpan
    let processedArticles: ProcessedArticle[] = articles.map((article: RawArticle) => {
      const coverImage = article.cover_image;
      const tags = article.tags || [];
      const base = {
        id: article.id,
        title: article.title,
        author: article.author,
        authorId: article.author_id,
        publishedAt: article.published_at,
        createdAt: article.created_at,
        updatedAt: article.updated_at,
        excerpt: article.excerpt,
        type: article.type,
        status: article.status,
        likes: article.likes,
        shares: article.shares,
        comments: article.comments,
        categoryId: article.category_id,
        orderInCategory: article.order_index,
        visibleAccessLevel: article.visible_access_level,
        fullAccessLevel: article.full_access_level,
        categoryName: article.category_name,
        coverImage,
        coverIsPlaceholder: article.cover_is_placeholder,
        tags,
        codePreview: article.codePreview ?? undefined,
        codeLanguage: article.codeLanguage ?? undefined,
        codeBlockCount: article.codeBlockCount ?? undefined,
      };
      if (article.type === 'text') {
        const { blocks, precomputedSpan } = buildBlocksFromArticle(
          {
            id: article.id,
            title: article.title,
            excerpt: article.excerpt ?? undefined,
            tags,
            updatedAt: article.updated_at?.toISOString?.(),
            publishedAt: article.published_at?.toISOString?.(),
            createdAt: article.created_at?.toISOString?.(),
          },
          'desktop'
        );
        return { ...base, blocks, precomputedSpan };
      }
      if (article.type === 'diary') {
        const contentChars = (article.excerpt ?? '').trim().length;
        const excerptLines = charCountToLinesForDiary(contentChars);
        const layoutHint = { excerptLines };
        return {
          ...base,
          layoutHint,
          precomputedSpan: calculateServerSpan(
            {
              ...base,
              type: 'diary',
              layoutHint,
              coverImage,
              cover_image: coverImage,
              mood: (article as any).mood,
              weather: (article as any).weather,
              location: (article as any).location,
            },
            columnWidth
          ),
        };
      }
      return {
        ...base,
        precomputedSpan: calculateServerSpan(
          {
            ...base,
            type: article.type,
            coverImage,
            cover_image: coverImage,
            imageWidth: coverImage?.width,
            imageHeight: coverImage?.height,
          },
          columnWidth
        ),
      };
    });

    // 如果 orderByPath=true，进行 DFS 排序
    if (shouldOrderByPath) {
      const categoryIds = await getCategoryAndChildrenIds(categoryId!);
      const categories = await query<Array<{ id: string; parent_id: string | null; order_index: number }>>(
        `SELECT id, parent_id, order_index FROM categories WHERE id IN (${categoryIds.map(() => '?').join(',')})`,
        categoryIds
      );
      processedArticles = sortArticlesByDFS(processedArticles, categoryId!, categories);
      // 应用分页
      processedArticles = processedArticles.slice(offset, offset + limit);
    }

    return NextResponse.json({
      success: true,
      articles: processedArticles,
      count: processedArticles.length,
    });

  } catch (error: any) {
    console.error('获取文章列表失败:', error);

    // 更详细的错误处理
    const errorMessage = error?.message || '未知错误';
    const statusCode = error?.code === 'ER_BAD_FIELD_ERROR' ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        error: `获取文章列表失败: ${errorMessage}`,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

