'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Input, message, Modal, Select, Tag, Dropdown, Divider, Space, Breadcrumb, Skeleton } from 'antd';
import type { MenuProps } from 'antd';

const { Option } = Select;
import { LikeOutlined, ShareAltOutlined, MessageOutlined, UnorderedListOutlined, ExclamationCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import PageLayout from '@/app/components/PageLayout';
import Header from '@/app/components/Header';
import BookChapterNavigator, { BookChapterDrawerButton } from '@/app/components/sidebar/BookChapterNavigator';
import ArticleEditFloat, { EditMode } from '@/app/components/float/ArticleEditFloat';
// import ArticleCategoryModal from '@/app/components/ArticleCategoryModal'; // 功能开发中
import CategoryTreeSelect from '@/app/components/CategoryTreeSelect';
import TagInput from '@/app/components/TagInput';
import CommentSection from '@/app/components/CommentSection';
import ImageCardModal from '@/app/components/ImageCardModal';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';
import { generateExcerptFromBlocks } from '@/app/utils/bookUtils';
import { useAuth } from '@/app/hooks/useAuth';
import { useCanEditArticle } from '@/app/hooks/useCanEditArticle';
import { useBookStore } from '@/app/stores/useBookStore';
import BlockEditor from '@/app/components/blocks/BlockEditor';
import { applyFormat, type FormatOption } from '@/app/utils/textFormatter';
import { formatTimeToMinute } from '@/app/utils/timeFormat';
import type { Block as BlockType } from '@/app/types/block';
import { ACCESS_LEVELS } from '@/app/types/block';
import {
  getArticleWithBlocks,
  type Block,
  type TextBlockContent,
  type ImageBlockContent,
  type CodeBlockContent
} from '@/app/data/mockDatabase';
import { useChapterLabelCacheOptional } from '@/app/contexts/ChapterLabelContext';
import { getChapterLabel } from '@/app/utils/chapterNumbering';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';
import PlaceholderBlock from '@/app/components/blocks/PlaceholderBlock';

const { TextArea } = Input;

/**
 * 文章内容骨架屏组件
 */
const ArticleContentSkeleton: React.FC = () => (
  <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
    {/* 标题骨架 */}
    <div style={{ marginBottom: '24px' }}>
      <Skeleton active title={{ width: '60%' }} paragraph={false} />
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <Skeleton.Button active size="small" style={{ width: '80px' }} />
        <Skeleton.Button active size="small" style={{ width: '60px' }} />
        <Skeleton.Button active size="small" style={{ width: '70px' }} />
      </div>
    </div>

    {/* 内容骨架 */}
    <div style={{ marginBottom: '32px' }}>
      <Skeleton active paragraph={{ rows: 6, width: ['100%', '95%', '90%', '85%', '100%', '80%'] }} />
      <div style={{ height: '16px' }} /> {/* 段落间距 */}
      <Skeleton active paragraph={{ rows: 4, width: ['90%', '100%', '85%', '95%'] }} />
      <div style={{ height: '16px' }} />
      <Skeleton active paragraph={{ rows: 8, width: ['100%', '88%', '92%', '85%', '100%', '90%', '95%', '80%'] }} />
    </div>

    {/* 操作区域骨架 */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderTop: '1px solid #f0f0f0' }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        <Skeleton.Button active size="small" style={{ width: '60px' }} />
        <Skeleton.Button active size="small" style={{ width: '60px' }} />
        <Skeleton.Button active size="small" style={{ width: '60px' }} />
      </div>
      <Skeleton.Button active size="small" style={{ width: '40px' }} />
    </div>
  </div>
);

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
  const { isLoggedIn, user } = useAuth();
  const { canEdit: canEditArticle } = useCanEditArticle(articleId);
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

  // 配置消息提示位置，避免被 header 遮挡
  useEffect(() => {
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
  const [sidebarExpanded, setSidebarExpanded] = useState(true); // 默认展开

  // 章节标签缓存
  const chapterLabelCache = useChapterLabelCacheOptional();

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
    if (!isLoggedIn) {
      message.warning('请先登录');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    try {
      const response = await (isLiked ? apiDelete(`/api/articles/${articleId}/like`) : apiPost(`/api/articles/${articleId}/like`));

      const result = await response.json();
      if (result.success) {
        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
        message.success(isLiked ? '已取消点赞' : '点赞成功');
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
      message.error('操作失败');
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
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('请先登录');
        return;
      }

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

      const response = await apiPut(`/api/articles/${articleId}`, updateData);

      const result = await response.json();
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
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
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
          const token = localStorage.getItem('token');
          if (!token) {
            message.error('请先登录');
            return;
          }

          const response = await apiDelete(`/api/articles/${articleId}`);

          const result = await response.json();
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
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败');
        }
      },
    });
  };

  // 图片点击处理
  const handleImageClick = (imageContent: ImageBlockContent) => {
    setSelectedImage(imageContent);
    setIsImageModalVisible(true);
  };

  // 显示骨架屏或加载状态
  if (!book || contentLoadingState === 'loading') {
    return <ArticleContentSkeleton />;
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

  // 打开目录抽屉的函数（移动端）
  const openCategoryDrawer = () => setDrawerVisible(true);

  // 切换侧边栏展开/收起（桌面端）
  const toggleSidebar = () => setSidebarExpanded(!sidebarExpanded);

  return (
    <>
      {/* 统一的章节导航组件（自动适配移动端/桌面端） */}
      <BookChapterNavigator
        currentArticleId={storeCurrentArticleId || articleId}
        bookCategoryId={bookCategoryId || undefined}
        onArticleClick={handleArticleClick}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />

      {/* Header 独立在最顶部，覆盖在边框上 */}
      <Header
        leftContent={
          <BookChapterDrawerButton 
            onClick={openCategoryDrawer} 
            expanded={sidebarExpanded}
            onToggle={toggleSidebar}
          />
        }
      />

      <div style={{ marginLeft: isMobile ? 0 : (sidebarExpanded ? '280px' : '0'), transition: 'margin-left 0.3s ease' }}>
        <PageLayout
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
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    flexWrap: 'wrap',
                  }}>
                    <span>更新时间：{formatTimeToMinute(book.last_modified || book.publish_date)}</span>
                    <span>阅读量：{book.likes || 0}</span>
                  </div>

                  {/* 标签 */}
                  {book.tags && book.tags.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <Space wrap>
                        {book.tags.map((tag: string, index: number) => {
                          const colors = ['magenta', 'red', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'];
                          const color = colors[index % colors.length];
                          return (
                            <Tag
                              key={index}
                              color={color}
                              style={{
                                padding: '4px 12px',
                                fontWeight: 500,
                              }}
                            >
                              {tag}
                            </Tag>
                          );
                        })}
                      </Space>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  justifyContent: isMobile ? 'flex-start' : 'flex-end',
                }}>
                  {/* 点赞 */}
                  <Button
                    type={isLiked ? 'primary' : 'text'}
                    icon={<LikeOutlined />}
                    onClick={handleLike}
                    loading={isLiking}
                    style={{
                      color: isLiked ? '#1890ff' : 'rgba(255, 255, 255, 0.8)',
                      borderColor: isLiked ? '#1890ff' : 'rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    {likesCount}
                  </Button>

                  {/* 分享 */}
                  <Button
                    type="text"
                    icon={<ShareAltOutlined />}
                    onClick={handleShare}
                    style={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    分享
                  </Button>


                </div>
              </div>
            </div>
          }
          box1BgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          box2BgColor="#ffffff"
        >
          {/* 书籍内容 */}
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: isMobile ? '20px 16px' : '40px 20px',
          }}>
            {editMode === 'edit' ? (
              <BlockEditor
                blocks={book.blocks || []}
                onChange={(blocks) => setBook({ ...book, blocks })}
              />
            ) : (
              // 渲染书籍内容
              <div>
                {book.blocks && book.blocks.map((block: any, index: number) => {
                  switch (block.type) {
                    case 'text':
                      const textContent = block.parsedContent as any;
                      return (
                        <div key={block.id || index}>
                          {/* Access Level 显示 */}
                          <div style={{
                            position: 'relative',
                            marginBottom: '8px',
                          }}>
                            <div
                              style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '12px',
                                backgroundColor: ACCESS_LEVELS.find(level => level.value === (block.access_level || 1))?.color || '#52c41a',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                                zIndex: 10,
                              }}
                            >
                              {ACCESS_LEVELS.find(level => level.value === (block.access_level || 1))?.label || 'P'}
                            </div>
                          </div>
                          <div
                            style={{
                              marginBottom: isMobile ? '16px' : '24px',
                              lineHeight: '1.8',
                              fontSize: isMobile ? '15px' : '16px',
                              color: '#333',
                              whiteSpace: 'pre-wrap',
                              wordWrap: 'break-word',
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              maxWidth: '100%',
                            }}
                          >
                            {textContent.content}
                          </div>
                        </div>
                      );

                    case 'image':
                      const imageContent = block.parsedContent as any;
                      // 优先使用原始的imageUrl，如果parsedContent.url不存在的话
                      const displayUrl = (imageContent && imageContent.url) || (block as any).imageUrl;
                      return (
                        <div key={block.id || index}>
                          {/* Access Level 显示 */}
                          <div style={{
                            position: 'relative',
                            marginBottom: '8px',
                          }}>
                            <div
                              style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '12px',
                                backgroundColor: ACCESS_LEVELS.find(level => level.value === (block.access_level || 1))?.color || '#52c41a',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                                zIndex: 10,
                              }}
                            >
                              {ACCESS_LEVELS.find(level => level.value === (block.access_level || 1))?.label || 'P'}
                            </div>
                          </div>
                          <div
                            style={{
                              marginBottom: '24px',
                              textAlign: 'center',
                            }}
                          >
                          {displayUrl ? (
                            <img
                              src={displayUrl}
                              alt={imageContent?.title || '图片'}
                              style={{
                                width: '100%',
                                height: 'auto',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                objectFit: 'contain',
                              }}
                              onClick={() => handleImageClick(imageContent || { url: displayUrl })}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '200px',
                                borderRadius: '8px',
                                backgroundColor: '#f5f5f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                fontSize: '14px',
                              }}
                            >
                              图片加载失败
                            </div>
                          )}
                          {imageContent?.title && (
                            <div style={{
                              marginTop: '8px',
                              fontSize: '14px',
                              color: '#666',
                              textAlign: 'center',
                            }}>
                              {imageContent?.title}
                            </div>
                          )}
                          </div>
                        </div>
                      );

                    case 'code':
                      const codeContent = block.parsedContent as any;
                      return (
                        <div key={block.id || index}>
                          {/* Access Level 显示 */}
                          <div style={{
                            position: 'relative',
                            marginBottom: '8px',
                          }}>
                            <div
                              style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '12px',
                                backgroundColor: ACCESS_LEVELS.find(level => level.value === (block.access_level || 1))?.color || '#52c41a',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                                zIndex: 10,
                              }}
                            >
                              {ACCESS_LEVELS.find(level => level.value === (block.access_level || 1))?.label || 'P'}
                            </div>
                          </div>
                          <div
                            style={{
                              marginBottom: '24px',
                              backgroundColor: '#f6f8fa',
                              borderRadius: '6px',
                              padding: '16px',
                              fontFamily: 'monospace',
                              fontSize: '14px',
                              color: '#24292f',
                              overflow: 'auto',
                            }}
                          >
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {codeContent.code}
                          </pre>
                          {codeContent.language && (
                            <div style={{
                              marginTop: '8px',
                              fontSize: '12px',
                              color: '#656d76',
                              textAlign: 'right',
                            }}>
                              {codeContent.language}
                            </div>
                          )}
                          </div>
                        </div>
                      );

                    case 'placeholder':
                      return <PlaceholderBlock key={block.id || index} block={block as any} />;

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
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
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
              }}>
                {navigation.currentIndex + 1} / {navigation.totalCount}
              </div>

              <div>
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

          {/* 评论区 */}
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: isMobile ? '0 8px 20px' : '0 20px 40px',
          }}>
            <CommentSection
              articleId={currentArticleId}
              isLoggedIn={isLoggedIn}
              currentUser={user}
              onCommentCountChange={setCommentsCount}
            />
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
