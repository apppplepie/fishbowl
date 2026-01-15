'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button, Input, Modal, Tag, Divider, Space, Breadcrumb, message } from '@/app/components/ui';
import { Select, Dropdown } from 'antd'; // 暂时保留，后续实现
const { Option } = Select;
import { LikeOutlined, ShareAltOutlined, ExclamationCircleOutlined, LeftOutlined, RightOutlined, CameraOutlined } from '@ant-design/icons';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import PageLayout from '@/app/components/PageLayout';
import { useHeader } from '@/app/contexts/HeaderContext';
// import ArticleCategoryModal from '@/app/components/ArticleCategoryModal'; // 功能开发中
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';
import { generateExcerptFromBlocks } from '@/app/utils/bookUtils';
import { useAuth } from '@/app/hooks/useAuth';
import { useCanEditArticle } from '@/app/hooks/useCanEditArticle';
import { useBookStore } from '@/app/stores/useBookStore';
import TextBlock from '@/app/components/blocks/TextBlock';
import PlaceholderBlock from '@/app/components/blocks/PlaceholderBlock';
import type { EditMode } from '@/app/components/float/ArticleEditFloat';

// 重型组件懒加载 - 减少首屏 JS 体积
// 编辑器只有在编辑模式才需要
const BlockEditor = dynamic(() => import('@/app/components/blocks/BlockEditor'), { 
  ssr: false,
  loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>加载编辑器...</div>
});

// 编辑悬浮按钮（包含权限判断）懒加载
const ArticleEditFloat = dynamic(() => import('@/app/components/float/ArticleEditFloat'), { 
  ssr: false 
});

// 评论区（通常很重）懒加载，且非首屏可延迟加载
const CommentSection = dynamic(() => import('@/app/components/CommentSection'), { 
  ssr: false,
  loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>加载评论区...</div>
});

// 图片模态只有点击图片才需要
const ImageCardModal = dynamic(() => import('@/app/components/ImageCardModal'), { 
  ssr: false 
});

// 目录/侧边栏懒加载
const UnifiedNavigator = dynamic(() => import('@/app/components/sidebar/UnifiedNavigator'), { 
  ssr: false 
});

const UnifiedNavigatorButton = dynamic(
  () => import('@/app/components/sidebar/UnifiedNavigator').then(mod => ({ default: mod.UnifiedNavigatorButton })),
  { ssr: false }
) as React.ComponentType<{ onClick?: () => void; expanded?: boolean; onToggle?: () => void }>;

// 代码块和图片块懒加载（非首屏内容）
const CodeBlock = dynamic(() => import('@/app/components/blocks/CodeBlock'), { 
  ssr: false 
});

const ImageBlock = dynamic(() => import('@/app/components/blocks/ImageBlock'), { 
  ssr: false 
});
import {
  getArticleWithBlocks,
  type ImageBlockContent} from '@/app/data/mockDatabase';
import { useChapterLabelCacheOptional } from '@/app/contexts/ChapterLabelContext';
import { getChapterLabel } from '@/app/utils/chapterNumbering';
import { apiGet, apiPutJson, apiDeleteJson, apiPostJson } from '@/lib/apiClient';

/**
 * 书籍详情页面
 * 展示单本书籍的完整内容
 */
export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const articleId = params.id as string;
  const { isMobile } = useResponsive();
  const { currentFishbowlTheme } = useAppTheme();
  const { isLoggedIn, user } = useAuth();
  const { canEdit: canEditArticle } = useCanEditArticle(articleId);
  const { setLeftContent } = useHeader();
  // 从URL参数获取分类信息，优先使用URL参数中的category
  const urlCategory = searchParams.get('category');

  // 使用 BookStore 管理书籍状态
  const {
    bookCategoryId,
    currentArticleId: storeCurrentArticleId,
    navigation,
    loading: navigationLoading,
    initializeBookCategoryId,
    setBookIdFromArticle,
    setCurrentArticle,
    goToNext,
    goToPrev,
    getArticleCategory,
    clearCache,
  } = useBookStore();

  // 使用 Store 的 currentArticleId，如果没有则使用 URL 中的 articleId
  const currentArticleId = storeCurrentArticleId || articleId;

  // 编辑模式状态
  const [editMode, setEditMode] = useState<EditMode>('view');

  // 配置消息提示位置，避免被 header 遮挡（防止重复执行）
  const messageConfigInited = useRef(false);
  useEffect(() => {
    if (messageConfigInited.current) return;
    messageConfigInited.current = true;
    message.config({
      top: 60, // header 45px + 15px 间距
      duration: 2,
      maxCount: 3,
    });
  }, []);

  // 监听编辑模式，防止意外离开页面导致数据丢失
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editMode === 'edit') {
        e.preventDefault();
        e.returnValue = '你还有未保存的更改，确定要离开吗？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editMode]);

  // UI状态（翻页时保持不变）
  const [categoryPath, setCategoryPath] = useState<Array<{ id: string; name: string; depth?: number; chapter_index?: number }>>([]);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageBlockContent | null>(null);
  // const [categoryModalOpen, setCategoryModalOpen] = useState(false); // 功能开发中

  // 内容状态（翻页时更新）
  const [bookId, setBookId] = useState<string | null>(null);
  const [book, setBook] = useState<any>(null);
  const [contentLoadingState, setContentLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading');

  // 文章内容缓存
  const [articleCache, setArticleCache] = useState<Map<string, any>>(new Map());

  // 点赞相关状态（内容状态）
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  // 评论数量状态
  const [commentsCount, setCommentsCount] = useState(0);

  // 目录抽屉状态（移动端）
  const [drawerVisible, setDrawerVisible] = useState(false);

  // 侧边栏展开状态（桌面端）
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // 默认关闭

  // 章节标签缓存
  const chapterLabelCache = useChapterLabelCacheOptional();

  /**
   * 滚动到页面顶部（兼容移动端）
   * 同时处理多个可能的滚动容器，确保在所有设备上都能正常工作
   */
  const scrollToTop = useCallback(() => {
    // 使用 requestAnimationFrame 确保在下一帧执行，DOM 已渲染
    requestAnimationFrame(() => {
      // 方法1: 同时设置多个可能的滚动容器（兼容不同浏览器）
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // 方法2: 使用 window.scrollTo（作为备选）
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // 方法3: 如果页面有固定容器，尝试找到并滚动它
      const scrollableContainers = document.querySelectorAll('[data-content-area]');
      scrollableContainers.forEach(container => {
        if (container instanceof HTMLElement) {
          container.scrollTop = 0;
        }
      });
      
      // 方法4: 延迟执行一次，确保在移动端也能生效
      setTimeout(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, behavior: 'auto' }); // 使用 auto 确保立即执行
      }, 100);
    });
  }, []);

  /**
   * 获取分类路径
   */
  const fetchCategoryPath = async (categoryId: string) => {
    try {
      const response = await apiGet(`/api/categories/${categoryId}/path`, { requiresAuth: false });
      const result = await response.json();

      if (result.success && result.path) {
        setCategoryPath(result.path);
      }
    } catch (error) {
      console.error('获取分类路径失败:', error);
    }
  };

  /**
   * 缓存管理：限制缓存大小
   */
  const manageCacheSize = useCallback(() => {
    if (articleCache.size > 10) {
      // 删除最旧的缓存项
      const firstKey = articleCache.keys().next().value;
      if (firstKey) {
        setArticleCache(prev => {
          const newCache = new Map(prev);
          newCache.delete(firstKey);
          return newCache;
        });
      }
    }
  }, [articleCache.size]);

  /**
   * 轻量级内容获取（只获取文章内容，不重新加载整个页面）
   */
  const fetchArticleContent = useCallback(async (articleId: string): Promise<any> => {
    try {
      // 检查缓存
      if (articleCache.has(articleId)) {
        return articleCache.get(articleId);
      }

      // 从API获取内容
      const response = await apiGet(`/api/articles/${articleId}`);
      const result = await response.json();

      if (response.ok && result.success && result.article) {
        // 处理blocks数据
        const processedBlocks = result.article.blocks
          .map((block: any) => {
            if (block.type === 'image' && block.parsedContent?.url) {
              return {
                ...block,
                imageUrl: block.parsedContent.url,
                title: block.parsedContent.title || block.title || '',
                description: block.parsedContent.description || block.description || '',
              };
            } else if (block.type === 'text' && block.parsedContent?.content) {
              return {
                ...block,
                content: block.parsedContent.content,
              };
            } else if (block.type === 'code' && block.parsedContent) {
              return {
                ...block,
                language: block.parsedContent.language || 'javascript',
                code: block.parsedContent.code || '',
                title: block.parsedContent.title || block.title || '',
              };
            } else if (block.type === 'placeholder') {
              // placeholder块保留，用于显示权限不足的提示
              return block;
            }
            return block;
          });

        const processedArticle = {
          ...result.article,
          blocks: processedBlocks,
        };

        // 添加到缓存
        setArticleCache(prev => new Map(prev).set(articleId, processedArticle));
        manageCacheSize();

        return processedArticle;
      }

      return null;
    } catch (error) {
      console.error('获取文章内容失败:', error);
      return null;
    }
  }, [articleCache, manageCacheSize]);

  /**
   * 虚拟翻页：只更新内容，不重新加载页面
   */
  const virtualNavigate = useCallback(async (targetArticleId: string, targetCategory?: string) => {
    // 显示骨架屏
    setContentLoadingState('loading');

    try {
      // 获取文章内容（优先从缓存读取，如果缓存中有则不会发送请求）
      const articleContent = await fetchArticleContent(targetArticleId);

      if (articleContent) {
        // 更新内容状态
        setBook(articleContent);
        setIsLiked(false); // 重置点赞状态
        setLikesCount(articleContent.likes || 0);
        setCommentsCount(articleContent.comments || 0);
        setContentLoadingState('loaded');

        // 更新 BookStore 的当前文章（会自动计算导航信息）
        setCurrentArticle(targetArticleId);

        // 只在 bookCategoryId 未设置且文章有 category_id 时才设置（避免重复请求）
        // 注意：翻页时 bookCategoryId 应该已经设置，所以这里通常不会执行
        const storeState = useBookStore.getState();
        if (!storeState.bookCategoryId && articleContent.category_id) {
          await setBookIdFromArticle(articleContent);
        }

        // 更新URL（使用传入的 targetCategory 或已设置的 bookCategoryId，避免额外查找）
        const finalCategory = targetCategory || useBookStore.getState().bookCategoryId;
        const newUrl = finalCategory ? `/book/${targetArticleId}?category=${finalCategory}` : `/book/${targetArticleId}`;
        window.history.replaceState({}, '', newUrl);

        // 滚动到顶部（延迟执行，确保内容已渲染）
        setTimeout(() => {
          scrollToTop();
        }, 50);

        console.log('虚拟翻页成功:', targetArticleId);
      } else {
        setContentLoadingState('error');
        message.error('加载文章失败');
      }
    } catch (error) {
      console.error('虚拟翻页失败:', error);
      setContentLoadingState('error');
      message.error('加载文章失败');
    }
  }, [fetchArticleContent, setCurrentArticle, setBookIdFromArticle]);

  /**
   * 加载书籍数据（完整加载，用于初始页面）
   */
  const loadBook = async (id: string) => {
    try {
      // 先尝试从 API 加载
      const response = await apiGet(`/api/articles/${id}`);
      const result = await response.json();

      if (response.ok && result.success && result.article) {
        // 处理blocks数据，为编辑器准备正确的属性
        const processedBlocks = result.article.blocks
          .map((block: any) => {
            if (block.type === 'image' && block.parsedContent?.url) {
              return {
                ...block,
                imageUrl: block.parsedContent.url,
                title: block.parsedContent.title || block.title || '',
                description: block.parsedContent.description || block.description || '',
              };
            } else if (block.type === 'text' && block.parsedContent?.content) {
              // 为文字块设置content属性，确保编辑器能正确显示文本
              return {
                ...block,
                content: block.parsedContent.content,
              };
            } else if (block.type === 'code' && block.parsedContent) {
              // 为代码块设置language和code属性
              return {
                ...block,
                language: block.parsedContent.language || 'javascript',
                code: block.parsedContent.code || '',
                title: block.parsedContent.title || block.title || '',
              };
            } else if (block.type === 'placeholder') {
              // placeholder块保留，用于显示权限不足的提示
              return block;
            }
            return block;
          });

        const processedArticle = {
          ...result.article,
          blocks: processedBlocks,
        };

        setBook(processedArticle);
        setContentLoadingState('loaded');
        setIsLiked(false); // 暂时设为 false
        setLikesCount(result.article.likes || 0);
        setCommentsCount(result.article.comments || 0);

        // 添加到缓存
        setArticleCache(prev => new Map(prev).set(id, processedArticle));
        manageCacheSize();

        // 初始化 BookStore
        // 注意：先设置当前文章ID，这样 loadArticleListCache 中的 calculateNavigation 才能正确计算
        setCurrentArticle(id);
        
        // 然后初始化书籍分类ID（会加载缓存并触发 calculateNavigation）
        const categoryId = await initializeBookCategoryId(id, urlCategory);
        
        // 如果初始化失败，从文章数据中获取（也会加载缓存并触发 calculateNavigation）
        if (!categoryId) {
          await setBookIdFromArticle(result.article);
        }

        // 设置书籍分类ID和书籍ID（用于其他逻辑）
        const finalCategoryId = bookCategoryId || urlCategory || result.article.category_id;
        if (finalCategoryId) {
          console.log('书籍分类ID:', finalCategoryId, urlCategory ? '(来自URL)' : '(来自文章数据)');
          setBookId(finalCategoryId); // 设置用于其他逻辑的书籍ID
          await fetchCategoryPath(finalCategoryId);
        } else {
          console.log('书籍没有分类ID');
        }
      } else {
        // 如果 API 失败，尝试从 mock 数据加载
        const mockBook = getArticleWithBlocks(id);
        if (mockBook) {
          setBook(mockBook);
          setContentLoadingState('loaded');
          setIsLiked(false);
          setLikesCount(mockBook.likes || 0);
          setCommentsCount(mockBook.comments || 0);
          // 先设置当前文章，再初始化（如果有分类信息）
          setCurrentArticle(id);
          await initializeBookCategoryId(id, urlCategory);

          // 添加到缓存
          setArticleCache(prev => new Map(prev).set(id, mockBook));
          manageCacheSize();

          // 获取分类路径（暂时使用默认分类）
          await fetchCategoryPath('cat_bookcase');
        } else {
          message.error('书籍不存在');
          router.push('/bookcase');
        }
      }
    } catch (error) {
      console.error('加载书籍失败:', error);
      // 如果网络错误，尝试从 mock 数据加载
      const mockBook = getArticleWithBlocks(id);
      if (mockBook) {
        setBook(mockBook);
        setContentLoadingState('loaded');
        setIsLiked(false);
        setLikesCount(mockBook.likes || 0);
        setCommentsCount(mockBook.comments || 0);
        // 先设置当前文章，再初始化（如果有分类信息）
        setCurrentArticle(id);
        await initializeBookCategoryId(id, urlCategory);

        // 添加到缓存
        setArticleCache(prev => new Map(prev).set(id, mockBook));
        manageCacheSize();

        // 获取分类路径（暂时使用默认分类）
        await fetchCategoryPath('cat_bookcase');
      } else {
        message.error('加载书籍失败');
        router.push('/bookcase');
      }
    }
  };


  // 初始化加载
  useEffect(() => {
    if (articleId) {
      loadBook(articleId);
    }
  }, [articleId]);

  // 监听文章ID变化，滚动到顶部（处理从目录点击文章的情况）
  useEffect(() => {
    if (articleId) {
      // 延迟执行，确保页面内容已加载
      const timer = setTimeout(() => {
        scrollToTop();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [articleId, scrollToTop]);

  // 预加载下一篇文章（只在导航信息变化且缓存中没有时预加载）
  useEffect(() => {
    if (navigation && navigation.nextArticleId && !articleCache.has(navigation.nextArticleId)) {
      // 后台预加载下一篇文章（如果缓存中没有）
      // 注意：fetchArticleContent 内部会检查缓存，所以这里即使调用也不会重复请求
      fetchArticleContent(navigation.nextArticleId).catch(error => {
        console.log('预加载失败:', error); // 不显示错误，只记录日志
      });
    }
  }, [navigation?.nextArticleId, articleCache, fetchArticleContent]);

  // 点赞处理
  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);
    try {
      const result = isLiked 
        ? await apiDeleteJson<{ success: boolean; likes?: number; error?: string }>(`/api/articles/${articleId}/like`)
        : await apiPostJson<{ success: boolean; likes?: number; error?: string }>(`/api/articles/${articleId}/like`);

      if (result.success) {
        setIsLiked(!isLiked);
        setLikesCount(result.likes || (isLiked ? likesCount - 1 : likesCount + 1));
        message.success(isLiked ? '已取消点赞' : '点赞成功');
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error: any) {
      console.error('点赞操作失败:', error);
      // 401错误会被apiClient自动处理，这里只处理其他错误
      if (!error.message?.includes('401')) {
        message.error('操作失败');
      }
    } finally {
      setIsLiking(false);
    }
  };

  // 分享处理
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      message.success('链接已复制到剪贴板');
    }).catch(() => {
      // 降级处理
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success('链接已复制到剪贴板');
    });
  };

  // 保存为图片处理
  const handleExportAsImage = async () => {
    try {
      message.loading({ content: '正在准备导出...', key: 'export' });
      const imageData = await exportPageAsLongImage();
      message.success({ content: '图片已保存！', key: 'export' });

      // 创建下载链接
      const link = document.createElement('a');
      link.download = `${book?.title || '书籍'}.png`;
      link.href = imageData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('导出图片失败:', error);
      message.error({ content: '导出失败，请重试', key: 'export' });
    }
  };

  // 处理书籍目录中的文章点击 - 编辑模式下需要确认
  const handleArticleClick = (newArticleId: string) => {
    if (editMode === 'edit') {
      Modal.confirm({
        title: '确认离开当前书籍？',
        icon: <ExclamationCircleOutlined />,
        content: '你还有未保存的更改，确定要放弃这些更改并跳转到其他文章吗？',
        okText: '确定离开',
        cancelText: '继续编辑',
        okType: 'danger',
        onOk() {
          setEditMode('view');
          router.push(`/book/${newArticleId}`);
        },
      });
    } else {
      router.push(`/book/${newArticleId}`);
    }
  };

  // 编辑模式处理
  const handleEditModeChange = (mode: EditMode) => {
    setEditMode(mode);
  };

  // 保存编辑
  const handleSave = async () => {
    if (!book) return;

    try {
      // 根据当前blocks重新生成excerpt
      const updatedExcerpt = generateExcerptFromBlocks(book.blocks) || '暂无简介';

      const updateData = {
        title: book.title,
        author: book.author,
        excerpt: updatedExcerpt, // 使用重新生成的excerpt
        category_id: book.category_id,
        blocks: book.blocks,
        tags: book.tags,
        // 封面图片由后端自动计算，无需前端提供
      };

      console.log('Book save - Sending data:', JSON.stringify(updateData, null, 2));

      const result = await apiPutJson<{ success: boolean; error?: string }>(`/api/articles/${articleId}`, updateData);

      if (result.success) {
        message.success('保存成功');
        setEditMode('view');

        // 清除相关书籍的缓存，因为文章内容可能发生变化
        const articleCategoryId = getArticleCategory(articleId);
        if (articleCategoryId) {
          clearCache(articleCategoryId);
          console.log('已清除文章所属书籍的缓存:', articleCategoryId);
        }

        // 重新加载数据
        loadBook(articleId);
      } else {
        message.error(result.error || '保存失败');
      }
    } catch (error: any) {
      console.error('保存失败:', error);
      // 401错误会被apiClient自动处理，这里只处理其他错误
      if (!error.message?.includes('401')) {
        message.error('保存失败');
      }
    }
  };

  // 删除处理
  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '删除后无法恢复，确定要删除这本书籍吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await apiDeleteJson<{ success: boolean; error?: string }>(`/api/articles/${articleId}`);

          if (result.success) {
            message.success('删除成功');

            // 清除相关书籍的缓存，因为文章被删除了
            const articleCategoryId = getArticleCategory(articleId);
            if (articleCategoryId) {
              clearCache(articleCategoryId);
              console.log('已清除文章所属书籍的缓存:', articleCategoryId);
            }

            router.push('/bookcase');
          } else {
            message.error(result.error || '删除失败');
          }
        } catch (error: any) {
          console.error('删除失败:', error);
          // 401错误会被apiClient自动处理，这里只处理其他错误
          if (!error.message?.includes('401')) {
            message.error('删除失败');
          }
        }
      },
    });
  };

  // 图片点击处理 - 使用 useCallback 固定引用
  const handleImageClick = useCallback((imageContent: ImageBlockContent) => {
    setSelectedImage(imageContent);
    setIsImageModalVisible(true);
  }, []);

  // 打开目录抽屉的函数（移动端）- 使用 useCallback 固定引用
  const openCategoryDrawer = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  // 切换侧边栏展开/收起（桌面端）- 使用 useCallback 固定引用
  const toggleSidebar = useCallback(() => {
    setSidebarExpanded((prev) => !prev);
  }, []);

  // 使用 useMemo 缓存 leftContent，避免每次渲染都创建新元素
  const leftContentElement = useMemo(
    () => (
      <UnifiedNavigatorButton 
        onClick={openCategoryDrawer} 
        expanded={sidebarExpanded}
        onToggle={toggleSidebar}
      />
    ),
    [openCategoryDrawer, sidebarExpanded, toggleSidebar]
  );

  // 设置 Header 的 leftContent
  useEffect(() => {
    setLeftContent(leftContentElement);

    return () => {
      setLeftContent(null);
    };
  }, [setLeftContent, leftContentElement]);

  // 显示加载状态（所有 Hook 必须在早期返回之前）
  if (!book || contentLoadingState === 'loading') {
    return null;
  }

  if (contentLoadingState === 'error') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60vh',
        fontSize: '16px',
        color: '#999'
      }}>
        加载失败，请刷新重试
      </div>
    );
  }

  // 导出页面为长图
  const exportPageAsLongImage = async (): Promise<string> => {
    // 1. 进入导出模式
    const exportState = enterExportMode();

    try {
      // 2. 等待页面稳定
      await waitForLayoutStable();

      // 3. 离屏渲染
      const contentClone = cloneReadableContent();
      const hiddenRoot = createHiddenRoot();
      mount(contentClone, hiddenRoot);

      // 4. 测量内容尺寸
      const size = measureContentSize(hiddenRoot);

      // 5. 渲染为图片
      const imageData = await renderToImage(hiddenRoot, size);

      // 6. 清理现场
      cleanup(hiddenRoot, exportState);

      return imageData;
    } catch (error) {
      // 确保清理现场
      exitExportMode(exportState);
      throw error;
    }
  };

  // 进入导出模式
  const enterExportMode = () => {
    const originalState = {
      bodyCursor: document.body.style.cursor,
      bodyUserSelect: document.body.style.userSelect,
      animationsDisabled: false,
    };

    // 隐藏编辑器UI和浮动按钮
    const editorElements = document.querySelectorAll('[data-editor-ui]');
    editorElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    // 隐藏所有浮动按钮
    const floatButtons = document.querySelectorAll('.ant-float-btn, .ant-float-btn-group');
    floatButtons.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    // 禁用光标
    document.body.style.cursor = 'default';

    // 禁用文字选择高亮
    document.body.style.userSelect = 'none';

    // 禁用动画
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
    `;
    document.head.appendChild(style);
    originalState.animationsDisabled = true;

    return originalState;
  };

  // 退出导出模式
  const exitExportMode = (originalState: any) => {
    // 恢复编辑器UI和浮动按钮
    const editorElements = document.querySelectorAll('[data-editor-ui]');
    editorElements.forEach(el => {
      (el as HTMLElement).style.display = '';
    });

    const floatButtons = document.querySelectorAll('.ant-float-btn, .ant-float-btn-group');
    floatButtons.forEach(el => {
      (el as HTMLElement).style.display = '';
    });

    // 恢复光标
    document.body.style.cursor = originalState.bodyCursor;

    // 恢复文字选择
    document.body.style.userSelect = originalState.bodyUserSelect;

    // 恢复动画
    if (originalState.animationsDisabled) {
      const styleElements = document.querySelectorAll('style');
      styleElements.forEach(el => {
        if (el.textContent?.includes('animation: none')) {
          el.remove();
        }
      });
    }
  };

  // 等待页面布局稳定
  const waitForLayoutStable = (): Promise<void> => {
    return new Promise((resolve) => {
      let stableFrames = 0;
      const requiredStableFrames = 10; // 等待10帧
      let lastHeight = 0;
      let rafId: number | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      let isResolved = false;

      const cleanup = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      const checkStability = () => {
        // 如果已经 resolve，不再继续执行
        if (isResolved) {
          return;
        }

        const currentHeight = document.documentElement.scrollHeight;

        if (currentHeight === lastHeight) {
          stableFrames++;
          if (stableFrames >= requiredStableFrames) {
            isResolved = true;
            cleanup();
            resolve();
            return;
          }
        } else {
          stableFrames = 0;
          lastHeight = currentHeight;
        }

        // 保存 rafId 以便清理
        rafId = requestAnimationFrame(checkStability);
      };

      // 延迟开始检查，给初始渲染一些时间
      timeoutId = setTimeout(() => {
        if (isResolved) {
          return;
        }
        lastHeight = document.documentElement.scrollHeight;
        rafId = requestAnimationFrame(checkStability);
      }, 100);
    });
  };

  // 克隆可读内容
  const cloneReadableContent = (): HTMLElement => {
    // 找到主要内容区域
    const contentElement = document.querySelector('[data-content-area]') as HTMLElement;
    if (!contentElement) {
      throw new Error('找不到内容区域');
    }

    // 深度克隆内容
    const clone = contentElement.cloneNode(true) as HTMLElement;

    // 移除不需要的元素
    const elementsToRemove = clone.querySelectorAll('[data-export-hide], .ant-float-btn, .ant-float-btn-group');
    elementsToRemove.forEach(el => el.remove());

    return clone;
  };

  // 创建隐藏根容器
  const createHiddenRoot = (): HTMLElement => {
    const root = document.createElement('div');
    root.style.position = 'absolute';
    root.style.left = '-9999px';
    root.style.top = '-9999px';
    root.style.width = '800px'; // 固定宽度
    root.style.backgroundColor = '#ffffff';
    root.style.fontFamily = 'Arial, sans-serif';
    root.style.lineHeight = '1.6';
    root.style.color = '#333';
    root.style.padding = '20px';
    root.style.boxSizing = 'border-box';
    root.style.pointerEvents = 'none';

    // 设置字体大小和颜色以确保可读性
    root.style.fontSize = '16px';

    document.body.appendChild(root);
    return root;
  };

  // 挂载克隆内容到隐藏容器
  const mount = (contentClone: HTMLElement, hiddenRoot: HTMLElement) => {
    hiddenRoot.appendChild(contentClone);
  };

  // 测量内容尺寸
  const measureContentSize = (hiddenRoot: HTMLElement) => {
    const rect = hiddenRoot.getBoundingClientRect();
    return {
      width: 800, // 固定宽度
      height: rect.height,
    };
  };

  // 渲染为图片
  const renderToImage = async (hiddenRoot: HTMLElement, size: { width: number; height: number }): Promise<string> => {
    try {
      // 使用html2canvas库进行渲染
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(hiddenRoot, {
        width: size.width,
        height: size.height,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });

      return canvas.toDataURL('image/png', 0.95);
    } catch (error) {
      console.error('html2canvas渲染失败:', error);
      throw new Error('图片渲染失败');
    }
  };

  // 清理现场
  const cleanup = (hiddenRoot: HTMLElement, exportState: any) => {
    // 移除隐藏容器
    if (hiddenRoot && hiddenRoot.parentNode) {
      hiddenRoot.parentNode.removeChild(hiddenRoot);
    }

    // 退出导出模式
    exitExportMode(exportState);
  };

  return (
    <>
      {/* 统一的章节导航组件（自动适配移动端/桌面端） */}
      <UnifiedNavigator
        treeConfig={{
          apiEndpoint: '/api/categories/{id}/tree-with-articles',
          startCategoryId: 'cat_bookcase',
          emptyText: '暂无内容',
          forceOpenRootKeys: false,
          categoryNavigationPattern: '/bookcase?category={categoryId}',
          articleNavigationPattern: '/book/{articleId}',
          stylePrefix: 'chapter-index-sidebar',
          showArticleCount: false,
          dataFormat: 'flat-tree',
          findBookRoot: false,
          defaultOpenMode: 'current-article-path',
        }}
        currentArticleId={storeCurrentArticleId || articleId}
        onArticleClick={handleArticleClick}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />


      <div style={{ 
        transform: isMobile ? 'translateX(0)' : (sidebarExpanded ? 'translateX(280px)' : 'translateX(0)'),
        transition: 'transform 0.3s ease',
        willChange: 'transform'
      }}>
        <PageLayout
          theme={currentFishbowlTheme}
          box1Content={
            <div style={{ padding: '16px 24px' }}>
              {/* 面包屑导航 */}
              <Breadcrumb
                items={[
                  // 书橱
                  {
                    title: (
                      <a
                        style={{
                          color: 'white',
                          textDecoration: 'none',
                          backgroundColor: 'transparent',
                          border: 'none',
                          padding: 0,
                          transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
                        onClick={() => router.push('/bookcase')}
                      >
                        书橱
                      </a>
                    ),
                  },
                  // 从当前文章追溯父级到 cat_bookcase 根目录
                  ...categoryPath
                    .filter(cat => cat.id !== 'root' && cat.id !== 'cat_bookcase')
                    .map((category, index) => {
                      // 优先从缓存获取章节标签，没有则用 API 返回的 depth + chapter_index 计算
                      let chapterLabel = chapterLabelCache.getLabel(category.id);
                      if (!chapterLabel && category.depth && category.chapter_index) {
                        chapterLabel = getChapterLabel(category.depth, category.chapter_index);
                      }
                      
                      // 组合显示：章节标签 + 名称（如 "第1卷 起始篇"）
                      const displayName = chapterLabel 
                        ? `${chapterLabel} ${category.name}`
                        : category.name;
                      
                      return {
                        title: (
                          <a
                            key={category.id}
                            style={{
                              color: 'white',
                              textDecoration: 'none',
                              backgroundColor: 'transparent',
                              border: 'none',
                              padding: 0,
                              transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
                            onClick={() => router.push(`/bookcase?category=${category.id}`)}
                          >
                            {displayName}
                          </a>
                        ),
                      };
                    }),
                  // 当前书籍标题
                  {
                    title: <span style={{ color: 'white' }}>{book?.title}</span>,
                  },
                ]}
                separator={<span style={{ color: 'white' }}>/</span>}
                style={{
                  color: 'white',
                  fontSize: '14px',
                  marginBottom: '16px',
                }}
              />

              {/* 书籍标题和操作区 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '16px',
              }}>
                <div style={{ flex: 1 }}>
                  {/* 书籍标题 */}
                  {editMode === 'edit' ? (
                    <Input
                      value={book.title}
                      onChange={(e) => setBook({ ...book, title: e.target.value })}
                      style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        border: 'none',
                        background: 'transparent',
                        color: 'white',
                        padding: 0,
                        marginBottom: '8px',
                      }}
                      placeholder="请输入书籍标题"
                    />
                  ) : (
                    <h1 style={{
                      fontSize: '28px',
                      fontWeight: 'bold',
                      color: 'white',
                      margin: '0 0 8px 0',
                      lineHeight: '1.2',
                    }}>
                      {book.title}
                    </h1>
                  )}

                  {/* 书籍信息 */}
                  {/* <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    flexWrap: 'wrap',
                  }}>
                    <span>更新时间：{formatTimeToMinute(book.last_modified || book.publish_date)}</span>
                    <span>阅读量：{book.likes || 0}</span>
                  </div> */}

                  {/* 标签 */}
                  {book.tags && book.tags.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <Space wrap>
                        {book.tags.map((tag: string, index: number) => (
                          <Tag
                            key={index}
                            id={tag}
                            style={{
                              padding: '4px 12px',
                              fontWeight: 500,
                            }}
                          >
                            {tag}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                </div>

               
              </div>
            </div>
          }
        >
          {/* 书籍内容 */}
          <div
            style={{
              maxWidth: '800px',
              minHeight: '100vh',
              margin: '0 auto',
              padding: isMobile ? '20px 16px' : '40px 20px',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
            data-content-area
          >
            {editMode === 'edit' ? (
              <BlockEditor
                blocks={book.blocks || []}
                onChange={(blocks) => setBook({ ...book, blocks })}
              />
            ) : (
              // 渲染书籍内容
              <div>
                {book.blocks && book.blocks.map((block: any, index: number) => {
                  // 每个块延迟递增，让它们依次渐显
                  const delay = index * 0.1; // 每个块延迟0.1秒
                  const blockStyle = {
                    marginBottom: block.type === 'text' ? (isMobile ? '16px' : '24px') : '24px',
                    animation: 'fadeInUp 1s ease-out forwards',
                    animationDelay: `${delay}s`,
                    opacity: 0,
                  };

                  switch (block.type) {
                    case 'text':
                      return (
                        <div key={block.id || index} className="book-content-block" style={blockStyle}>
                          <TextBlock block={block} mode="view" />
                        </div>
                      );

                    case 'image':
                      return (
                        <div key={block.id || index} className="book-content-block" style={blockStyle}>
                          <ImageBlock block={block} mode="view" />
                        </div>
                      );

                    case 'code':
                      return (
                        <div key={block.id || index} className="book-content-block" style={blockStyle}>
                          <CodeBlock block={block} mode="view" />
                        </div>
                      );

                    case 'placeholder':
                      return (
                        <div key={block.id || index} className="book-content-block" style={blockStyle}>
                          <PlaceholderBlock block={block as any} />
                        </div>
                      );

                    default:
                      return null;
                  }
                })}
              </div>
            )}
          </div>

          {/* 文章导航 */}
          {navigation && !navigationLoading && (navigation.canGoPrev || navigation.canGoNext) && (
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              padding: isMobile ? '12px 8px 0' : '40px 20px 0',
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: '16px',
            }}>
              <div style={{ textAlign: 'left' }}>
                {navigation.canGoPrev && (
                  <Button
                    type="link"
                    icon={<LeftOutlined />}
                    onClick={async () => {
                      const prevId = goToPrev();
                      if (prevId) {
                        // 从 BookStore 获取分类（优先使用已设置的 bookCategoryId，避免额外查找）
                        const { bookCategoryId } = useBookStore.getState();
                        const targetCategory = bookCategoryId || getArticleCategory(prevId) || undefined;
                        await virtualNavigate(prevId, targetCategory);
                      }
                    }}
                    style={{
                      color: '#1890ff',
                      padding: '4px 8px',
                    }}
                  >
                    上一页
                  </Button>
                )}
              </div>

              <div style={{
                fontSize: '14px',
                color: '#666',
                textAlign: 'center',
                justifySelf: 'center',
              }}>
                {navigation.currentIndex + 1} / {navigation.totalCount}
              </div>

              <div style={{ textAlign: 'right' }}>
                {navigation.canGoNext && (
                  <Button
                    type="link"
                    icon={<RightOutlined />}
                    onClick={async () => {
                      const nextId = goToNext();
                      if (nextId) {
                        // 从 BookStore 获取分类（优先使用已设置的 bookCategoryId，避免额外查找）
                        const { bookCategoryId } = useBookStore.getState();
                        const targetCategory = bookCategoryId || getArticleCategory(nextId) || undefined;
                        await virtualNavigate(nextId, targetCategory);
                      }
                    }}
                    style={{
                      color: '#1890ff',
                      padding: '4px 8px',
                    }}
                  >
                    下一页
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 互动按钮 */}
          <div
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              padding: isMobile ? '20px 8px' : '40px 20px',
            }}
            data-export-hide
          >
            {/* Part 3: 互动按钮和评论区 */}
            <div
              style={{
                background: 'white',
                padding: isMobile ? '20px 12px' : '32px 40px',
                borderRadius: isMobile ? '8px' : '8px',
                boxShadow: isMobile ? '0 1px 3px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.08)',
              }}
              data-export-hide
            >
              {/* 互动按钮 */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                paddingBottom: '32px',
                borderBottom: '1px solid #e8e8e8',
              }}>
                <Button
                  icon={<LikeOutlined />}
                  size="large"
                  style={{
                    minWidth: isMobile ? '48px' : '120px',
                    color: isLiked ? '#1890ff' : undefined,
                    borderColor: isLiked ? '#1890ff' : undefined,
                  }}
                  onClick={handleLike}
                  loading={isLiking}
                >
                  {!isMobile && <>{isLiked ? '已点赞' : '点赞'} {likesCount}</>}
                </Button>
                <Button
                  icon={<ShareAltOutlined />}
                  size="large"
                  style={{ minWidth: isMobile ? '48px' : '120px' }}
                  onClick={handleShare}
                >
                  {!isMobile && '分享链接'}
                </Button>
                <Button
                  icon={<CameraOutlined />}
                  size="large"
                  style={{ minWidth: isMobile ? '48px' : '120px' }}
                  onClick={handleExportAsImage}
                >
                  {!isMobile && '保存为图片'}
                </Button>
              </div>

              {/* 评论区 */}
              <CommentSection
                articleId={currentArticleId}
                isLoggedIn={isLoggedIn}
                currentUser={user}
                onCommentCountChange={setCommentsCount}
              />
            </div>
          </div>

        </PageLayout>
      </div>

      {/* 图片模态框 */}
      <ImageCardModal
        visible={isImageModalVisible}
        onClose={() => setIsImageModalVisible(false)}
        imageUrl={selectedImage?.url || ''}
      />

      {/* 编辑悬浮按钮 - 使用后端API统一判断权限 */}
      {isLoggedIn && user && book && canEditArticle && (
        <ArticleEditFloat
          mode={editMode}
          onEdit={() => handleEditModeChange('edit')}
          onPreview={() => handleEditModeChange('preview')}
          onSave={handleSave}
          onCancel={() => {
            setEditMode('view');
            loadBook(articleId);
          }}
          onDelete={handleDelete}
          categoryId={bookCategoryId || undefined}
          articleAuthor={book?.author}
          currentUser={user?.username}
          userRole={user.role}
        />
      )}
    </>
  );
}
