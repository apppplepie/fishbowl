'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button, Breadcrumb, message } from '@/app/components/ui';
import { TitleBox1, TagBox1 } from '@/app/components/box1';
import { LikeOutlined, ShareAltOutlined, CameraOutlined } from '@/app/components/ui/icons';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useHeader } from '@/app/contexts/HeaderContext';
// import ArticleCategoryModal from '@/app/components/ArticleCategoryModal'; // 功能开发中
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useAuth } from '@/app/hooks/useAuth';
import { useCanEditArticle } from '@/app/hooks/useCanEditArticle';
import ArticleContentClient from '@/app/components/article/ArticleContent.client';
import { exportArticleAsImage } from '@/app/components/article/exportLongImage';

// 悬浮操作（书籍页仅保留「发布章节」等，不提供正文编辑）
const ArticleEditFloat = dynamic(() => import('@/app/components/float/ArticleEditFloat'), {
  ssr: false,
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

import {
  getArticleWithBlocks,
  type ImageBlockContent} from '@/app/data/mockDatabase';
import { useChapterLabelCacheOptional } from '@/app/contexts/ChapterLabelContext';
import { getChapterLabel } from '@/app/utils/chapterNumbering';
import { apiGet, apiDeleteJson, apiPostJson } from '@/lib/apiClient';
import { getContentAreaWrapperStyle, getContentCardStyle, CONTENT_AREA_MAX_WIDTH } from '@/app/styles/contentArea';

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
  const { setConfig } = usePageShell();
  const { isLoggedIn, user } = useAuth();
  const { canEdit: canEditArticle } = useCanEditArticle(articleId);
  const { setLeftContent } = useHeader();
  // 从URL参数获取分类信息，优先使用URL参数中的category
  const urlCategory = searchParams.get('category');

  const currentArticleId = articleId;

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

  // UI状态（翻页时保持不变）
  const [categoryPath, setCategoryPath] = useState<Array<{ id: string; name: string; depth?: number; chapter_index?: number }>>([]);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageBlockContent | null>(null);
  // const [categoryModalOpen, setCategoryModalOpen] = useState(false); // 功能开发中

  // 内容状态（翻页时更新）
  const [book, setBook] = useState<any>(null);
  const [contentLoadingState, setContentLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading');

  // 点赞相关状态（内容状态）
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  // 评论数量状态
  const [, setCommentsCount] = useState(0);

  // 目录抽屉状态（移动端）
  const [drawerVisible, setDrawerVisible] = useState(false);

  // 侧边栏展开状态（桌面端）
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // 默认关闭

  // 延迟加载导航组件，只有在用户打开时才加载
  const [shouldLoadNavigator, setShouldLoadNavigator] = useState(false);

  // 延迟加载点赞和评论，优化首屏加载速度（延迟2秒，确保主内容先加载）
  const [shouldLoadInteractions, setShouldLoadInteractions] = useState(false);

  // 延迟加载悬浮操作（仅发布章节等，无正文编辑）
  const [shouldLoadEditFloat, setShouldLoadEditFloat] = useState(false);

  // 内容渐显状态（等待 box1 加载完成）
  const [contentVisible, setContentVisible] = useState(false);

  // 章节标签缓存
  const chapterLabelCache = useChapterLabelCacheOptional();

  /**
   * 滚动到页面顶部（兼容移动端）
   * 同时处理多个可能的滚动容器，确保在所有设备上都能正常工作
   */
  const scrollToTop = useCallback(() => {
    // 使用 requestAnimationFrame 确保在下一帧执行，DOM 已渲染
    const rafId = requestAnimationFrame(() => {
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
    });
    
    // 返回清理函数（虽然通常不需要，但为了完整性）
    return () => cancelAnimationFrame(rafId);
  }, []);

  /**
   * 获取分类路径
   */
  const fetchCategoryPath = async (categoryId: string) => {
    try {
      const response = await apiGet(`/api/categories/${categoryId}/path`);
      const result = await response.json();

      if (result.success && result.path) {
        setCategoryPath(result.path);
      }
    } catch (error) {
      console.error('获取分类路径失败:', error);
    }
  };

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

        const finalCategoryId = urlCategory || result.article.category_id;
        if (finalCategoryId) {
          await fetchCategoryPath(finalCategoryId);
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
          // 获取分类路径（暂时使用默认分类）
          await fetchCategoryPath('cat_bookcase');
        } else {
          message.error('书籍不存在');
          router.push('/library?view=book');
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
        // 获取分类路径（暂时使用默认分类）
        await fetchCategoryPath('cat_bookcase');
      } else {
        message.error('加载书籍失败');
        router.push('/library?view=book');
      }
    }
  };


  // 强制滚动到顶部，避免浏览器恢复滚动位置
  useEffect(() => {
    // 禁用自动滚动恢复
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // 强制滚动到顶部
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // 组件卸载时恢复默认行为
    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // 延迟加载点赞和评论等交互功能（2秒后加载，确保主内容先完全展示）
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadInteractions(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // 延迟加载悬浮操作（1秒后加载）
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadEditFloat(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // 初始化加载
  useEffect(() => {
    if (!articleId) return;
    
    let isMounted = true;
    
    const loadBookSafely = async () => {
      try {
        // 注意：loadBook 内部会调用多个 setState
        // 如果组件卸载，这些 setState 会触发 React 警告，但不会导致内存泄漏
        // 因为 React 会自动忽略已卸载组件的状态更新
        await loadBook(articleId);
      } catch (error) {
        if (isMounted) {
          console.error('加载书籍失败:', error);
        }
      }
    };
    
    loadBookSafely();
    
    return () => {
      isMounted = false;
    };
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

  // 等待内容加载完成后立即显示（移除不必要的延迟）
  useEffect(() => {
    if (contentLoadingState === 'loaded') {
      // 使用 requestAnimationFrame 确保 DOM 已准备好
      const rafId = requestAnimationFrame(() => {
        setContentVisible(true);
      });
      
      return () => cancelAnimationFrame(rafId);
    } else {
      setContentVisible(false);
    }
  }, [contentLoadingState]);

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
      await exportArticleAsImage(currentArticleId, book?.title);
      message.success({ content: '图片已保存！', key: 'export' });
    } catch (error) {
      console.error('导出图片失败:', error);
      message.error({ content: '导出失败，请重试', key: 'export' });
    }
  };

  const handleArticleClick = (newArticleId: string) => {
    router.push(`/book/${newArticleId}`);
  };

  // 图片点击处理 - 使用 useCallback 固定引用
  const handleImageClick = useCallback((imageContent: ImageBlockContent) => {
    setSelectedImage(imageContent);
    setIsImageModalVisible(true);
  }, []);

  // 打开目录抽屉的函数（移动端）- 使用 useCallback 固定引用
  const openCategoryDrawer = useCallback(() => {
    setShouldLoadNavigator(true); // 首次打开时加载组件
    setDrawerVisible(true);
  }, []);
  
  // 切换侧边栏展开/收起（桌面端）- 使用 useCallback 固定引用
  const toggleSidebar = useCallback(() => {
    setShouldLoadNavigator(true); // 首次打开时加载组件
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

  // 创建 box1Content（与 article 统一：面包屑 / 标题 / 标签 各一行，省略号，框定在父容器内）
  const box1Content = useMemo(() => {
    if (!book) return null;

    return (
      <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
        {/* 面包屑：单行省略（与 BreadcrumbBox1 一致的 padding） */}
        <div
          style={{
            padding: '16px 24px 0 24px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          <Breadcrumb
            className="ui-breadcrumb-single-line"
            items={[
              {
                title: (
                  <a
                    style={{
                      color: '#000',
                      textDecoration: 'none',
                      backgroundColor: 'transparent',
                      border: 'none',
                      padding: 0,
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#000')}
                    onClick={() => router.push('/library?view=book')}
                  >
                    书橱
                  </a>
                ),
              },
              ...categoryPath
                .filter((cat) => cat.id !== 'root' && cat.id !== 'cat_bookcase')
                .map((category) => {
                  let chapterLabel = chapterLabelCache.getLabel(category.id);
                  if (!chapterLabel && category.depth != null && category.chapter_index != null) {
                    chapterLabel = getChapterLabel(category.depth, category.chapter_index);
                  }
                  const displayName = chapterLabel ? `${chapterLabel} ${category.name}` : category.name;
                  return {
                    title: (
                      <a
                        key={category.id}
                        style={{
                          color: '#000',
                          textDecoration: 'none',
                          backgroundColor: 'transparent',
                          border: 'none',
                          padding: 0,
                          transition: 'color 0.2s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#000')}
                        onClick={() => router.push(`/library?view=book&category=${category.id}`)}
                      >
                        {displayName}
                      </a>
                    ),
                  };
                }),
              { title: <span style={{ color: '#000' }}>{book.title}</span> },
            ]}
            separator={<span style={{ color: '#000' }}>/</span>}
            style={{ color: '#000', fontSize: '14px', marginBottom: '8px' }}
          />
        </div>

        {/* 标题：单行省略，小字号 */}
        <TitleBox1 title={book.title} />

        {/* 标签：单行 */}
        {book.tags && book.tags.length > 0 && <TagBox1 tags={book.tags} editMode={false} maxTags={10} />}
      </div>
    );
  }, [isMobile, categoryPath, book, chapterLabelCache, router]);

  // 设置页面配置 - 必须在所有早期返回之前
  useEffect(() => {
    setConfig({
      box1Content,
      box2Style: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      },
    });

    return () => {
      setConfig({ box1Content: null });
    };
  }, [setConfig, box1Content]);

  // 同步侧边栏状态到 PageShell，让 box1+box2 在电脑端被侧边栏挤压
  useEffect(() => {
    setConfig((prev: any) => ({
      ...prev,
      sidebarExpanded: !isMobile ? sidebarExpanded : false,
      sidebarWidth: 280,
    }));
    return () => setConfig((prev: any) => ({ ...prev, sidebarExpanded: false, sidebarWidth: 0 }));
  }, [setConfig, isMobile, sidebarExpanded]);

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

  return (
    <>
      {/* 统一的章节导航组件（自动适配移动端/桌面端） - 延迟加载，只有在用户打开时才加载 */}
      {shouldLoadNavigator && (
        <UnifiedNavigator
          treeConfig={{
            apiEndpoint: '/api/categories/{id}/tree-with-articles',
            startCategoryId: 'cat_bookcase',
            emptyText: '暂无内容',
            forceOpenRootKeys: false,
            categoryNavigationPattern: '/library?view=book&category={categoryId}',
            articleNavigationPattern: '/book/{articleId}',
            stylePrefix: 'chapter-index-sidebar',
            showArticleCount: false,
            dataFormat: 'flat-tree',
            findBookRoot: false,
            defaultOpenMode: 'current-article-path',
          }}
          currentArticleId={articleId}
          onArticleClick={handleArticleClick}
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          expanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
        />
      )}


      <div style={{ 
        opacity: contentVisible ? 1 : 0,
        transition: 'opacity 0.2s ease',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
          {/* ========== 书籍页主题内容区（book [id]）==========
              样式来自 @/app/styles/contentArea，与文章页统一。 */}
          <div
            style={getContentCardStyle(isMobile, {
              maxWidth: CONTENT_AREA_MAX_WIDTH,
              marginLeft: 'auto',
              marginRight: 'auto',
              minWidth: isMobile ? undefined : '600px',
              marginBottom: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            })}
            data-content-area
          >
            {/* 书籍内容区域：仅阅读，与文章页统一布局与排版 */}
            <div style={{ flex: 1 }}>
              <ArticleContentClient article={book} noCard />
            </div>

          </div>

          {/* 书籍页：互动区+评论区容器 */}
          <div
            style={getContentAreaWrapperStyle({ minWidth: 0 })}
            data-export-hide
          >
              {/* Part 3: 互动按钮和评论区 */}
              <div
                style={{
                  ...getContentCardStyle(isMobile),
                  background: 'white',
                  marginBottom: 0,
                  marginTop: '20px',
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
                {/* 评论区 - 懒加载 */}
                {shouldLoadInteractions && (
                  <CommentSection
                    articleId={currentArticleId}
                    isLoggedIn={isLoggedIn}
                    currentUser={user}
                    onCommentCountChange={setCommentsCount}
                  />
                )}
              </div>
            </div>
      </div>

      {/* 图片模态框 */}
      <ImageCardModal
        visible={isImageModalVisible}
        onClose={() => setIsImageModalVisible(false)}
        imageUrl={selectedImage?.url || ''}
      />

      {/* 悬浮操作：书籍页不提供正文编辑/删除，仅保留「发布章节」等（由 ArticleEditFloat 内部权限控制） */}
      {shouldLoadEditFloat && isLoggedIn && user && book && canEditArticle && (
        <ArticleEditFloat
          mode="view"
          onEdit={() => {}}
          onPreview={() => {}}
          onSave={() => {}}
          onCancel={() => {}}
          categoryId={urlCategory || book.category_id || undefined}
          articleAuthor={book?.author}
          currentUser={user?.username}
          userRole={user.role}
          showEditButton={false}
        />
      )}
    </>
  );
}
