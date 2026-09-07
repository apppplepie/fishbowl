'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/apiClient';
import { BOOK_ROOT_CATEGORY_ID } from '@/lib/constants';
import {
  getAspectRatioFromArticle,
  getColumnWidthFromContainerWidth,
  getLayoutForCard,
  getSpanForCard,
} from '@/lib/masonry-server-utils';
import MasonryGrid from '@/app/components/layout/MasonryGrid';
import MasonryWall from '@/app/components/layout/MasonryWall';
import ArticleCard from '@/app/components/cards/ArticleCard';
import ImageCard from '@/app/components/cards/ImageCard';
import CodeCard from '@/app/components/cards/CodeCard';
import DiaryCard from '@/app/components/cards/DiaryCard';
import BookCard from '@/app/components/cards/BookCard';
import DrawingGalleryCard from '@/app/components/cards/DrawingGalleryCard';
import DocActionFloat from '@/app/components/float/DocActionFloat';
import BookActionFloat from '@/app/components/float/BookActionFloat';
import ArtPublishFloat from '@/app/components/float/ArtPublishFloat';
import type {
  FeedFetchArgs,
  FeedPage,
  LibraryCardsProps,
  LibraryFloatProps,
  LibraryView,
  LibraryViewKey,
} from './types';

/** 后端偶尔会在出错时返回 HTML 错误页，这里统一挡一下 */
async function readJson(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('接口返回了非 JSON 响应');
  }
  return res.json();
}

/** 与 apiClient 的 X-Container-Width 同源，再塞进 query，避免 GET 缓存把手机布局响应塞给电脑 */
function containerWidthQuery(): string {
  if (typeof window === 'undefined') return '1400';
  return String(Math.min(1400, Math.max(0, window.innerWidth - 48)));
}

/* ------------------------------------------------------------------ 文 */

async function fetchDocs({ offset, limit, categoryId, keyword, signal }: FeedFetchArgs): Promise<FeedPage> {
  const params = new URLSearchParams({
    status: 'published',
    limit: String(limit),
    offset: String(offset),
    cw: containerWidthQuery(),
  });
  if (categoryId) params.set('categoryId', categoryId);
  if (keyword) params.set('search', keyword);

  const data = await readJson(await apiGet(`/api/articles/list?${params.toString()}`, { signal }));
  const cards: any[] = data?.success ? data.articles ?? [] : [];
  return {
    cards,
    hasMore: cards.length === limit,
    nextOffset: offset + cards.length,
    searchedOnServer: true,
  };
}

/** 文 / 书 共用的卡片分发 */
function renderMasonryCard(
  card: any,
  index: number,
  columnWidth: number,
  onClick: () => void,
  bookExtra?: { showDeleteIcon?: boolean; onDeleteSuccess?: () => void }
) {
  const span = getSpanForCard(card, columnWidth);
  const layout = getLayoutForCard(card, columnWidth);
  const common = { card, onClick, priority: index < 6, masonry: true as const, span, layout };

  switch (card.type) {
    case 'image':
    case 'drawing':
      return <ImageCard {...common} />;
    case 'code':
      return <CodeCard {...common} />;
    case 'diary':
      return <DiaryCard {...common} />;
    case 'book':
      return <BookCard {...common} {...bookExtra} />;
    default:
      return <ArticleCard {...common} />;
  }
}

function DocCards({ cards, columns, columnWidth }: LibraryCardsProps) {
  const router = useRouter();
  return (
    <MasonryGrid key={`masonry-${columns}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {cards.map((card, index) => (
        <div
          key={card.id}
          className="masonry-item animate"
          style={{ gridRow: `span ${getSpanForCard(card, columnWidth)}` }}
        >
          {renderMasonryCard(card, index, columnWidth, () => router.push(`/article/${card.id}`))}
        </div>
      ))}
    </MasonryGrid>
  );
}

/* ------------------------------------------------------------------ 书 */

function toBookCard(book: any) {
  const main = book.firstArticle;
  return {
    // 用分类 id 做稳定主键：翻页不会串号，卡片配色也不会跳
    id: `book:${book.categoryId}`,
    type: 'book',
    title: book.categoryName,
    description: main?.excerpt || '暂无简介',
    coverImage: main?.coverImage?.url || '/default-book-cover.jpg',
    author: main?.author || '未知作者',
    updatedAt: main?.updatedAt || main?.publishedAt || main?.createdAt || new Date().toISOString(),
    createdAt: main?.publishedAt || main?.createdAt || new Date().toISOString(),
    mainArticleId: main ? String(main.id) : book.categoryId,
    categoryId: book.categoryId,
  };
}

async function fetchBooks({ offset, limit, categoryId, keyword, signal }: FeedFetchArgs): Promise<FeedPage> {
  const atRoot = !categoryId || categoryId === BOOK_ROOT_CATEGORY_ID;

  if (atRoot) {
    // 书房根目录：一次拿到所有「书」（分类 + 它的第一篇），前端切页
    const data = await readJson(
      await apiGet(`/api/categories/book-previews?parentId=${BOOK_ROOT_CATEGORY_ID}`, { signal })
    );
    const books: any[] = data?.success ? data.books ?? [] : [];
    const end = offset + limit;
    return {
      cards: books.slice(offset, end).map(toBookCard),
      hasMore: end < books.length,
      nextOffset: end,
      searchedOnServer: false,
    };
  }

  // 具体某本书：该分类及其子分类下的全部章节，按 path + order_index 排
  const params = new URLSearchParams({
    status: 'published',
    limit: String(limit),
    offset: String(offset),
    categoryId,
    orderByPath: 'true',
    cw: containerWidthQuery(),
  });
  if (keyword) params.set('search', keyword);

  const data = await readJson(await apiGet(`/api/articles/list?${params.toString()}`, { signal }));
  const cards: any[] = data?.success ? data.articles ?? [] : [];
  return {
    cards,
    hasMore: cards.length === limit,
    nextOffset: offset + cards.length,
    searchedOnServer: true,
  };
}

function BookCards({ cards, columns, columnWidth, deleteMode, reload }: LibraryCardsProps) {
  const router = useRouter();
  const openCard = useCallback(
    (card: any) => router.push(`/book/${card.type === 'book' ? card.mainArticleId : card.id}`),
    [router]
  );

  return (
    <MasonryGrid key={`masonry-${columns}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {cards.map((card, index) => (
        <div
          key={card.id}
          className="masonry-item animate"
          style={{ gridRow: `span ${getSpanForCard(card, columnWidth)}` }}
        >
          {renderMasonryCard(card, index, columnWidth, () => openCard(card), {
            showDeleteIcon: deleteMode,
            onDeleteSuccess: reload,
          })}
        </div>
      ))}
    </MasonryGrid>
  );
}

/* ------------------------------------------------------------------ 画 */

async function fetchArt({ offset, limit, signal }: FeedFetchArgs): Promise<FeedPage> {
  const data = await readJson(
    await apiGet(`/api/articles/drawing?limit=${limit}&offset=${offset}`, { signal })
  );
  const cards: any[] = data?.success ? data.articles ?? [] : [];
  return {
    cards,
    hasMore: cards.length === limit,
    nextOffset: offset + cards.length,
    searchedOnServer: false,
  };
}

function ArtCards({ cards, containerWidth }: LibraryCardsProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 点开时才去补全 blocks，补到的存这里，不动列表本身
  const [blocksById, setBlocksById] = useState<Record<string, any>>({});

  const columnWidth = useMemo(() => getColumnWidthFromContainerWidth(containerWidth), [containerWidth]);

  const openArticle = useCallback(
    async (article: any) => {
      const id = String(article.id);
      setSelectedId(id);
      if (article.blocks?.length || blocksById[id]) return;
      try {
        const data = await readJson(await apiGet(`/api/articles/${article.id}`));
        if (data?.success) setBlocksById((prev) => ({ ...prev, [id]: data.article.blocks }));
      } catch (err) {
        console.error('[library] 获取作品详情失败:', err);
      }
    },
    [blocksById]
  );

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const article = cards.find((c) => String(c.id) === selectedId);
    if (!article) return null;
    const blocks = article.blocks?.length ? article.blocks : blocksById[selectedId];
    return blocks ? { ...article, blocks } : article;
  }, [selectedId, cards, blocksById]);

  return (
    <>
      <MasonryWall>
        {cards.map((article) => {
          const aspect = getAspectRatioFromArticle(article);
          const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 3 / 2;
          return (
            <div
              key={article.id}
              className="masonry-item"
              style={{ gridRowEnd: `span ${article.precomputedSpan ?? 1}` }}
            >
              <DrawingGalleryCard
                article={article}
                coverOnly
                coverWidth={columnWidth}
                coverHeight={columnWidth / ratio}
                onClick={() => openArticle(article)}
              />
            </div>
          );
        })}
      </MasonryWall>

      {/* 弹窗挂到 body，避免被 PageShell / 波浪的堆叠上下文盖住 */}
      {selected &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2000,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
            }}
            onClick={() => setSelectedId(null)}
          >
            <div
              style={{ width: '100%', maxWidth: '900px', position: 'relative', zIndex: 2001 }}
              onClick={(e) => e.stopPropagation()}
            >
              <DrawingGalleryCard
                article={selected}
                onTitleClick={() => router.push(`/article/${selected.id}`)}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/* ------------------------------------------------------------------ 视角注册表 */

function DocFloat({ reload }: LibraryFloatProps) {
  return <DocActionFloat onDiarySuccess={reload} />;
}

function BookFloat({ categoryId }: LibraryFloatProps) {
  return <BookActionFloat categoryId={categoryId} />;
}

function ArtFloat({ reload }: LibraryFloatProps) {
  return <ArtPublishFloat onSuccess={reload} />;
}

export const LIBRARY_VIEWS: Record<LibraryViewKey, LibraryView> = {
  doc: {
    key: 'doc',
    label: '文',
    pageSize: 15,
    filters: true,
    fetchPage: fetchDocs,
    Cards: DocCards,
    Float: DocFloat,
    tree: {
      apiEndpoint: '/api/categories/tree-with-articles',
      emptyText: '暂无目录',
      forceOpenRootKeys: true,
      categoryNavigationPattern: '/library?view=doc&category={categoryId}',
      articleNavigationPattern: '/article/{articleId}',
      stylePrefix: 'library-category',
      showArticleCount: true,
      dataFormat: 'tree-with-articles',
      defaultOpenMode: 'all',
    },
  },
  book: {
    key: 'book',
    label: '书',
    pageSize: 15,
    filters: true,
    fetchPage: fetchBooks,
    Cards: BookCards,
    Float: BookFloat,
    tree: {
      apiEndpoint: '/api/categories/{id}/tree-with-articles',
      startCategoryId: BOOK_ROOT_CATEGORY_ID,
      emptyText: '暂无书籍',
      forceOpenRootKeys: true,
      categoryNavigationPattern: '/library?view=book&category={categoryId}',
      articleNavigationPattern: '/book/{articleId}',
      stylePrefix: 'library-category',
      showArticleCount: false,
      dataFormat: 'flat-tree',
      findBookRoot: false,
      defaultOpenMode: 'all',
    },
  },
  art: {
    key: 'art',
    label: '画',
    pageSize: 20,
    filters: false,
    fetchPage: fetchArt,
    Cards: ArtCards,
    Float: ArtFloat,
  },
};

export const LIBRARY_VIEW_ORDER: LibraryViewKey[] = ['doc', 'book', 'art'];
export const DEFAULT_LIBRARY_VIEW: LibraryViewKey = 'doc';

export function resolveViewKey(raw: string | null | undefined): LibraryViewKey {
  return raw && raw in LIBRARY_VIEWS ? (raw as LibraryViewKey) : DEFAULT_LIBRARY_VIEW;
}
