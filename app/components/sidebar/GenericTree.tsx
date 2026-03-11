'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, FolderOpen, Code, Image, ChevronRight } from 'lucide-react';
import { Spin, Empty } from '@/app/components/ui';
import { addChapterNumbers, formatNodeLabel } from '@/app/utils/chapterNumbering';
import { apiGetJson } from '@/lib/apiClient';
import { useChapterLabelCacheOptional } from '@/app/contexts/ChapterLabelContext';
import './sidebar.css';

/** 侧边栏树节点（统一结构，用于渲染） */
export interface SidebarNode {
  key: string;
  label: string;
  type: 'category' | 'article';
  categoryId?: string;
  articleId?: string;
  articleType?: string;
  articleCount?: number;
  children?: SidebarNode[];
}

interface TreeNode {
  id: string;
  name: string;
  parent_id: string | null;
  path?: string;
  depth?: number;
  order_index: number;
  node_type: 'category' | 'article';
  type?: string;
  publish_date?: string;
  children?: TreeNode[];
}

interface Article {
  id: string;
  title: string;
  type: string;
  publish_date: string;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  children?: Category[];
  articles?: Article[];
}

export interface GenericIndexTreeConfig {
  apiEndpoint: string;
  startCategoryId?: string;
  emptyText?: string;
  forceOpenRootKeys?: boolean;
  categoryNavigationPattern?: string;
  articleNavigationPattern?: string;
  stylePrefix?: string;
  showArticleCount?: boolean;
  dataFormat?: 'tree-with-articles' | 'flat-tree';
  findBookRoot?: boolean;
  defaultOpenMode?: 'all' | 'current-article-path' | 'none';
}

interface GenericIndexTreeProps {
  config: GenericIndexTreeConfig;
  currentArticleId?: string;
  onArticleClick?: (articleId: string) => void;
  onCategoryClick?: () => void;
}

const SidebarLoading = () => (
  <div className="sidebar-loading">
    <Spin size="small" />
  </div>
);

function getArticleIcon(type: string) {
  switch (type) {
    case 'code':
      return <Code size={14} />;
    case 'drawing':
    case 'image':
      return <Image size={14} />;
    default:
      return <FileText size={14} />;
  }
}

/** 递归渲染树节点 */
function TreeNodes({
  nodes,
  openKeys,
  setOpenKeys,
  currentArticleId,
  currentPathKeys,
  onCategoryClick,
  onArticleClick,
  categoryNavigationPattern,
  articleNavigationPattern,
  router,
  showArticleCount,
  forceOpenRootKeys,
  rootKeys,
}: {
  nodes: SidebarNode[];
  openKeys: string[];
  setOpenKeys: (keys: string[] | ((prev: string[]) => string[])) => void;
  currentArticleId?: string;
  currentPathKeys?: string[];
  onCategoryClick?: () => void;
  onArticleClick?: (articleId: string) => void;
  categoryNavigationPattern?: string;
  articleNavigationPattern?: string;
  router: ReturnType<typeof useRouter>;
  showArticleCount?: boolean;
  forceOpenRootKeys?: boolean;
  rootKeys: string[];
}) {
  const toggleOpen = (key: string) => {
    setOpenKeys(prev => {
      if (forceOpenRootKeys && rootKeys.includes(key)) return prev;
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      return next;
    });
  };

  const handleCategoryLabelClick = (e: React.MouseEvent, categoryId: string) => {
    e.stopPropagation();
    onCategoryClick?.();
    if (categoryNavigationPattern) {
      router.push(categoryNavigationPattern.replace('{categoryId}', categoryId), { scroll: false });
    }
  };

  const handleArticleClick = (articleId: string) => {
    if (onArticleClick) {
      onArticleClick(articleId);
    } else if (articleNavigationPattern) {
      router.push(articleNavigationPattern.replace('{articleId}', articleId));
    }
  };

  return (
    <>
      {nodes.map(node => {
        if (node.type === 'category') {
          const isOpen = openKeys.includes(node.key);
          const hasChildren = node.children && node.children.length > 0;
          const onCurrentPath = currentPathKeys?.includes(node.key);
          return (
            <div key={node.key} className="sidebar-tree-branch">
              <div
                className={`sidebar-tree-node sidebar-tree-node-category ${hasChildren ? 'has-children' : ''} ${onCurrentPath ? 'on-current-path' : ''}`}
                data-on-current-path={onCurrentPath ? 'true' : undefined}
                role="button"
                tabIndex={0}
                onClick={() => hasChildren && toggleOpen(node.key)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    hasChildren && toggleOpen(node.key);
                  }
                }}
              >
                <span className="sidebar-tree-chevron">
                  {hasChildren ? (
                    <ChevronRight size={14} className={isOpen ? 'expanded' : ''} />
                  ) : (
                    <span className="sidebar-tree-chevron-placeholder" />
                  )}
                </span>
                <span className="sidebar-tree-icon">
                  <FolderOpen size={14} />
                </span>
                <span
                  className="sidebar-tree-label"
                  onClick={e => node.categoryId && handleCategoryLabelClick(e, node.categoryId!)}
                  role="button"
                  tabIndex={0}
                >
                  {node.label}
                  {showArticleCount && (node.articleCount ?? 0) > 0 && (
                    <span className="sidebar-tree-count">({node.articleCount})</span>
                  )}
                </span>
              </div>
              {hasChildren && (
                <div className={`sidebar-tree-children ${isOpen ? 'expanded' : ''}`}>
                  <TreeNodes
                    nodes={node.children!}
                    openKeys={openKeys}
                    setOpenKeys={setOpenKeys}
                    currentArticleId={currentArticleId}
                    currentPathKeys={currentPathKeys}
                    onCategoryClick={onCategoryClick}
                    onArticleClick={onArticleClick}
                    categoryNavigationPattern={categoryNavigationPattern}
                    articleNavigationPattern={articleNavigationPattern}
                    router={router}
                    showArticleCount={showArticleCount}
                    forceOpenRootKeys={forceOpenRootKeys}
                    rootKeys={rootKeys}
                  />
                </div>
              )}
            </div>
          );
        }
        const isActive = currentArticleId === node.articleId;
        return (
          <div
            key={node.key}
            className={`sidebar-tree-node sidebar-tree-node-article ${isActive ? 'active' : ''}`}
            data-article-id={node.articleId}
            data-menu-key={node.key}
            role="button"
            tabIndex={0}
            onClick={() => node.articleId && handleArticleClick(node.articleId)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                node.articleId && handleArticleClick(node.articleId);
              }
            }}
          >
            <span className="sidebar-tree-chevron">
              <span className="sidebar-tree-chevron-placeholder" />
            </span>
            <span className="sidebar-tree-icon">
              {getArticleIcon(node.articleType || 'article')}
            </span>
            <span className="sidebar-tree-label">{node.label}</span>
          </div>
        );
      })}
    </>
  );
}

function categoriesToSidebarNodes(cats: Category[], showArticleCount: boolean): SidebarNode[] {
  return cats.map(cat => {
    const children: SidebarNode[] = [
      ...(cat.children ? categoriesToSidebarNodes(cat.children, showArticleCount) : []),
      ...(cat.articles
        ? cat.articles.map(a => ({
            key: `article-${a.id}`,
            label: a.title,
            type: 'article' as const,
            articleId: a.id,
            articleType: a.type,
          }))
        : []),
    ];
    return {
      key: `category-${cat.id}`,
      label: cat.name,
      type: 'category',
      categoryId: cat.id,
      articleCount: cat.articles?.length ?? 0,
      children: children.length > 0 ? children : undefined,
    };
  });
}

function treeToSidebarNodes(nodes: TreeNode[]): SidebarNode[] {
  return nodes.map(node => {
    if (node.node_type === 'category') {
      const children =
        node.children && node.children.length > 0 ? treeToSidebarNodes(node.children) : undefined;
      const formattedLabel = formatNodeLabel(node as any, {
        showChapterLabel: true,
        showArticleNumber: false,
      });
      return {
        key: `category-${node.id}`,
        label: formattedLabel,
        type: 'category',
        categoryId: node.id,
        children,
      };
    }
    const formattedLabel = formatNodeLabel(node as any, {
      showChapterLabel: false,
      showArticleNumber: false,
    });
    return {
      key: `article-${node.id}`,
      label: formattedLabel,
      type: 'article',
      articleId: node.id,
      articleType: node.type,
    };
  });
}

function GenericIndexTree({
  config,
  currentArticleId,
  onArticleClick,
  onCategoryClick,
}: GenericIndexTreeProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [treeForRender, setTreeForRender] = useState<SidebarNode[]>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const lastProcessedArticleIdRef = useRef<string | undefined>(undefined);
  const dataLoadedRef = useRef(false);
  const chapterLabelCache = useChapterLabelCacheOptional();

  const {
    apiEndpoint,
    startCategoryId,
    emptyText = '暂无内容',
    forceOpenRootKeys = false,
    categoryNavigationPattern,
    articleNavigationPattern,
    stylePrefix = 'generic-index-tree',
    showArticleCount = true,
    dataFormat = 'tree-with-articles',
    findBookRoot = false,
    defaultOpenMode = 'current-article-path',
  } = config;

  const findBookRootId = async (categoryId: string): Promise<string> => {
    try {
      const result = await apiGetJson<{
        success: boolean;
        categories?: Array<{ path?: string; id: string }>;
      }>(`/api/categories/${categoryId}`);
      if (result.success && result.categories?.[0]?.path) {
        const pathParts = result.categories[0].path.split('-');
        if (pathParts.length >= 3) {
          const bookPath = pathParts.slice(0, 3).join('-');
          const bookResult = await apiGetJson<{
            success: boolean;
            categories?: Array<{ id: string }>;
          }>(`/api/categories?path=${encodeURIComponent(bookPath)}`);
          if (bookResult.success && bookResult.categories?.[0]) {
            return bookResult.categories[0].id;
          }
        }
      }
    } catch (e) {
      console.error('findBookRootId', e);
    }
    return categoryId;
  };

  const getRootCategoryKeys = (data: any[]): string[] => {
    if (!forceOpenRootKeys || dataFormat === 'flat-tree') return [];
    return data.filter((c: any) => c.parent_id === null).map((c: any) => `category-${c.id}`);
  };

  const getAllCategoryKeys = (data: any[]): string[] => {
    if (dataFormat === 'flat-tree') {
      return (data as TreeNode[]).filter(n => n.node_type === 'category').map(n => `category-${n.id}`);
    }
    const keys: string[] = [];
    const collect = (cats: Category[]) => {
      cats.forEach(cat => {
        keys.push(`category-${cat.id}`);
        if (cat.children?.length) collect(cat.children);
      });
    };
    collect(data as Category[]);
    return keys;
  };

  const findArticleAncestorKeys = (data: any[], articleId: string): string[] => {
    const ancestorKeys: string[] = [];
    if (dataFormat === 'flat-tree') {
      const flat = data as TreeNode[];
      const article = flat.find(n => n.node_type === 'article' && n.id === articleId);
      if (!article) return ancestorKeys;
      let parentId = article.parent_id;
      while (parentId) {
        const parent = flat.find(n => n.node_type === 'category' && n.id === parentId);
        if (!parent) break;
        ancestorKeys.push(`category-${parent.id}`);
        parentId = parent.parent_id;
      }
    } else {
      const findIn = (cats: Category[], path: string[]): boolean => {
        for (const cat of cats) {
          const currentPath = [...path, `category-${cat.id}`];
          if (cat.articles?.some(a => a.id === articleId)) {
            ancestorKeys.push(...currentPath);
            return true;
          }
          if (cat.children?.length && findIn(cat.children, currentPath)) return true;
        }
        return false;
      };
      findIn(data as Category[], []);
    }
    return ancestorKeys;
  };

  useEffect(() => {
    const loadData = async () => {
      if (findBookRoot && !startCategoryId) {
        setLoading(false);
        return;
      }
      if (dataLoadedRef.current && categories.length > 0) {
        if (currentArticleId) {
          const path = findArticleAncestorKeys(categories, currentArticleId);
          if (path.length > 0) setOpenKeys(path);
        }
        return;
      }
      setLoading(true);
      try {
        let actualCategoryId = startCategoryId;
        if (findBookRoot && startCategoryId) {
          actualCategoryId = await findBookRootId(startCategoryId);
        }
        let apiUrl = apiEndpoint;
        if (actualCategoryId) apiUrl = apiUrl.replace('{id}', actualCategoryId);

        const result = await apiGetJson<{ success: boolean; data?: any }>(apiUrl);
        if (!result.success || !result.data) {
          setLoading(false);
          return;
        }

        let dataToStore: any[];
        let sidebarNodes: SidebarNode[];

        if (dataFormat === 'flat-tree') {
          const flatNodes = result.data.flat as TreeNode[];
          let treeNodes = result.data.tree as TreeNode[];
          treeNodes = addChapterNumbers(treeNodes);
          const labelsToCache: Record<string, string> = {};
          const collectLabels = (nodes: TreeNode[]) => {
            nodes.forEach(n => {
              if (n.node_type === 'category' && (n as any).chapterLabel) {
                labelsToCache[n.id] = (n as any).chapterLabel;
              }
              if (n.children) collectLabels(n.children);
            });
          };
          collectLabels(treeNodes);
          chapterLabelCache.setLabels(labelsToCache);
          dataToStore = flatNodes;
          sidebarNodes = treeToSidebarNodes(treeNodes);
        } else {
          dataToStore = result.data;
          sidebarNodes = categoriesToSidebarNodes(result.data, showArticleCount);
        }

        setCategories(dataToStore);
        setTreeForRender(sidebarNodes);
        dataLoadedRef.current = true;

        let initialOpenKeys: string[] = [];
        if (defaultOpenMode === 'current-article-path' && currentArticleId) {
          initialOpenKeys = findArticleAncestorKeys(dataToStore, currentArticleId);
        } else if (defaultOpenMode === 'all') {
          initialOpenKeys = getAllCategoryKeys(dataToStore);
        } else if (defaultOpenMode === 'none') {
          initialOpenKeys = [];
        } else if (forceOpenRootKeys) {
          initialOpenKeys = getRootCategoryKeys(dataToStore);
        } else {
          if (currentArticleId) {
            initialOpenKeys = findArticleAncestorKeys(dataToStore, currentArticleId);
          }
        }
        setOpenKeys(initialOpenKeys);
      } catch (err) {
        console.error('加载目录失败:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [apiEndpoint, startCategoryId]);

  useEffect(() => {
    if (
      !currentArticleId ||
      currentArticleId === lastProcessedArticleIdRef.current ||
      categories.length === 0
    ) {
      return;
    }
    lastProcessedArticleIdRef.current = currentArticleId;
    const path = findArticleAncestorKeys(categories, currentArticleId);
    if (path.length > 0) setOpenKeys(path);
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-article-id="${currentArticleId}"]`) as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [currentArticleId, categories]);

  const rootKeys = forceOpenRootKeys ? getRootCategoryKeys(categories) : [];
  const currentPathKeys = currentArticleId ? findArticleAncestorKeys(categories, currentArticleId) : [];

  return (
    <div className={`${stylePrefix}-container`}>
      {loading ? (
        <SidebarLoading />
      ) : treeForRender.length > 0 ? (
        <div className="sidebar-tree">
          <TreeNodes
            nodes={treeForRender}
            openKeys={openKeys}
            setOpenKeys={setOpenKeys}
            currentArticleId={currentArticleId}
            currentPathKeys={currentPathKeys}
            onCategoryClick={onCategoryClick}
            onArticleClick={onArticleClick}
            categoryNavigationPattern={categoryNavigationPattern}
            articleNavigationPattern={articleNavigationPattern}
            router={router}
            showArticleCount={showArticleCount}
            forceOpenRootKeys={forceOpenRootKeys}
            rootKeys={rootKeys}
          />
        </div>
      ) : (
        <div className="sidebar-empty">
          <Empty description={emptyText} />
        </div>
      )}
    </div>
  );
}

export default React.memo(GenericIndexTree);
