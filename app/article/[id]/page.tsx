'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button, Input, Modal, Tag, Divider, Space, Breadcrumb, message } from '@/app/components/ui';
import { TagBox1 } from '@/app/components/box1';
import { Select } from 'antd'; // 暂时保留，后续实现
const { Option } = Select;
import { LikeOutlined, ShareAltOutlined, ExclamationCircleOutlined, CameraOutlined } from '@ant-design/icons';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import { usePageShell } from '@/app/contexts/PageShellContext';
import { useHeader } from '@/app/contexts/HeaderContext';
// import ArticleCategoryModal from '@/app/components/ArticleCategoryModal'; // 功能开发中
import CategoryTreeSelect from '@/app/components/CategoryTreeSelect';
import TagInput from '@/app/components/TagInput';
import { useParams, useRouter } from 'next/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useAuth } from '@/app/hooks/useAuth';
import { useCanEditArticle } from '@/app/hooks/useCanEditArticle';
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
import { generateExcerptFromBlocks } from '@/app/utils/bookUtils';
import { apiGet, apiPutJson, apiDeleteJson, apiPostJson } from '@/lib/apiClient';
import { getNextOrderIndex } from '@/app/utils/orderIndex';
import {
  getArticleWithBlocks,
  type Block,
  type TextBlockContent,
  type ImageBlockContent,
  type CodeBlockContent
} from '@/app/data/mockDatabase';

/**
 * 文章详情页面
 * 展示单篇文章的完整内容
 */
export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;
  const { isMobile } = useResponsive();
  const { currentFishbowlTheme } = useAppTheme();
  const { setConfig } = usePageShell();
  const { isLoggedIn, user } = useAuth();
  const { canEdit: canEditArticle } = useCanEditArticle(articleId);
  const { setLeftContent } = useHeader();

  // 编辑模式状态
  const [editMode, setEditMode] = useState<EditMode>('view');

  // 配置消息提示位置，避免被 header 遮挡
  useEffect(() => {
    console.log('📄 文章页面加载完成');
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

  // 从数据源获取文章
  const [article, setArticle] = useState<any>(null);
  const [categoryPath, setCategoryPath] = useState<Array<{ id: string; name: string }>>([]);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageBlockContent | null>(null);
  // const [categoryModalOpen, setCategoryModalOpen] = useState(false); // 功能开发中

  // 点赞相关状态
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  // 评论数量状态
  const [commentsCount, setCommentsCount] = useState(0);

  // 目录抽屉状态（移动端）
  const [drawerVisible, setDrawerVisible] = useState(false);

  // 侧边栏展开状态（桌面端）
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // 默认关闭

  // 延迟加载导航组件，只有在用户打开时才加载
  const [shouldLoadNavigator, setShouldLoadNavigator] = useState(false);

  // 延迟加载点赞和评论，优化首屏加载速度
  const [shouldLoadInteractions, setShouldLoadInteractions] = useState(false);

  // 文章内容渐显状态（等待 box1 加载完成）
  const [contentVisible, setContentVisible] = useState(false);

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

  // 加载文章数据
  useEffect(() => {
    async function loadArticle() {
      try {
        // 先尝试从 API 加载
        const response = await apiGet(`/api/articles/${articleId}`, { requiresAuth: false });
        const result = await response.json();

        if (response.ok && result.success && result.article) {
          // 处理blocks数据，为编辑器准备正确的属性
          const processedBlocks = result.article.blocks.map((block: any) => {
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
            }
            return block;
          });

          const processedArticle = {
            ...result.article,
            blocks: processedBlocks,
          };

          setArticle(processedArticle);
          setEditedArticle(processedArticle);
          setLikesCount(result.article.likes || 0);
          setCommentsCount(result.article.comments || 0);

          // 如果文章有分类，获取分类路径
          if (result.article.category_id) {
            fetchCategoryPath(result.article.category_id);
          }
        } else {
          // 如果 API 失败，尝试从 mock 数据加载
          const articleData = getArticleWithBlocks(articleId);
          if (articleData) {
            setArticle(articleData);
            setEditedArticle(articleData);
            setLikesCount(articleData.likes || 0);
            setCommentsCount(articleData.comments || 0);
          } else {
            message.error('文章不存在');
            router.push('/archive');
          }
        }
      } catch (error) {
        console.error('加载文章失败:', error);
        // 如果网络错误，尝试从 mock 数据加载
        const articleData = getArticleWithBlocks(articleId);
        if (articleData) {
          setArticle(articleData);
          setEditedArticle(articleData);
          setLikesCount(articleData.likes || 0);
          setCommentsCount(articleData.comments || 0);
        } else {
          message.error('加载文章失败');
          router.push('/archive');
        }
      }
    }

    loadArticle();
  }, [articleId, router]);

  // 等待文章加载完成后渐显内容
  useEffect(() => {
    if (article) {
      // 短暂延迟后显示内容，让 box1 有时间渲染
      const timer = setTimeout(() => {
        setContentVisible(true);
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      setContentVisible(false);
    }
  }, [article]);

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

  // 延迟加载点赞和评论等交互功能（500ms 后加载，优化首屏速度）
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadInteractions(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // 检查点赞状态（懒加载）
  useEffect(() => {
    if (!shouldLoadInteractions) return;
    
    async function checkLikeStatus() {
      try {
        const response = await apiGet(`/api/articles/${articleId}/like`);
        const result = await response.json();

        if (result.success) {
          setIsLiked(result.liked);
        }
      } catch (error) {
        console.error('检查点赞状态失败:', error);
      }
    }

    checkLikeStatus();
  }, [articleId, shouldLoadInteractions]);

  // 编辑时的临时数据
  const [editedArticle, setEditedArticle] = useState<any>(null);

  // 处理文章点击 - 编辑模式下需要确认
  const handleArticleClick = (newArticleId: string) => {
    if (editMode === 'edit') {
      Modal.confirm({
        title: '确认离开当前文章？',
        icon: <ExclamationCircleOutlined />,
        content: '你还有未保存的更改，确定要放弃这些更改并跳转到其他文章吗？',
        okText: '确定离开',
        cancelText: '继续编辑',
        okType: 'danger',
        onOk() {
          setEditMode('view');
          setEditedArticle(article);
          router.push(`/article/${newArticleId}`);
        },
      });
    } else {
      router.push(`/article/${newArticleId}`);
    }
  };

  // 进入编辑模式
  const handleEdit = () => {
    console.log('✏️ 进入编辑模式');
    if (article) {
      // 转换块数据格式为编辑器格式
      const editorBlocks = article.blocks
        .map((b: any, index: number) => {
          if (b.type === 'text') {
            return {
              id: b.id,
              type: 'text',
              order: index,
              content: b.parsedContent.content,
              access_level: b.access_level || 1,
            };
          } else if (b.type === 'image') {
            return {
              id: b.id,
              type: 'image',
              order: index,
              imageUrl: b.parsedContent.url,
              title: b.parsedContent.title,
              description: b.parsedContent.description,
              access_level: b.access_level || 1,
            };
          } else if (b.type === 'code') {
            return {
              id: b.id,
              type: 'code',
              order: index,
              language: b.parsedContent.language,
              code: b.parsedContent.code,
              title: b.parsedContent.title,
              access_level: b.access_level || 1,
            };
          } else if (b.type === 'placeholder') {
            // placeholder块在编辑模式下应该被过滤掉，因为用户没有权限编辑这些块
            return null;
          }
          return b;
        })
        .filter((block: any) => block !== null);

      setEditedArticle({
        ...article,
        editorBlocks,
      });
      setEditMode('edit');
      message.info('进入编辑模式');
    }
  };

  // 进入预览模式
  const handlePreview = () => {
    if (!editedArticle.title?.trim()) {
      message.warning('请输入文章标题');
      return;
    }
    setEditMode('preview');
    message.info('预览模式 - 请确认后保存');
  };

  // 保存文章
  const handleSave = async () => {
    console.log('🔄 开始保存文章...');
    if (editedArticle) {
      try {
        console.log('📝 验证文章数据...');

        // 验证标题
        if (!editedArticle.title?.trim()) {
          console.log('❌ 标题验证失败：标题为空');
          message.warning('请输入文章标题');
          return;
        }

        console.log('✅ 标题验证通过:', editedArticle.title);

        // 验证绘画类型必须有图片
        if (editedArticle.type === 'drawing') {
          const hasImage = editedArticle.editorBlocks?.some((block: any) => block.type === 'image');
          if (!hasImage) {
            message.warning('🎨 绘画类型文章必须包含至少一张图片！');
            return;
          }
        }

        // 验证代码类型必须有代码块
        if (editedArticle.type === 'code') {
          const hasCode = editedArticle.editorBlocks?.some((block: any) => block.type === 'code');
          if (!hasCode) {
            message.warning('💻 代码类型文章必须包含至少一个代码块！');
            return;
          }
        }

        // 验证图片类型必须有图片块
        if (editedArticle.type === 'image') {
          const hasImage = editedArticle.editorBlocks?.some((block: any) => block.type === 'image');
          if (!hasImage) {
            message.warning('📷 图片类型文章必须包含至少一张图片！');
            return;
          }
        }

        message.loading({ content: '正在保存...', key: 'save' });

        // 根据当前blocks重新生成excerpt
        const updatedExcerpt = generateExcerptFromBlocks(editedArticle.editorBlocks || []);

        // ------------------ 构造 saveData ------------------
        const saveData: any = {
          title: editedArticle.title,
          type: editedArticle.type || 'text',
          category_id: editedArticle.category_id || null,
          tags: editedArticle.tags || [],
          blocks: editedArticle.editorBlocks || [],
          excerpt: updatedExcerpt,
        };

        // 规范化原始和新分类为字符串，避免 null/undefined 导致误判
        const oldCat = String(article?.category_id ?? '');
        const newCat = String(editedArticle.category_id ?? '');
        const categoryChanged = newCat !== oldCat;

        // —— 关键：只有当分类**真正改变**时才发送 order_index；未改分类时完全不包含该字段 ——
        // 这样后端会保留现有顺序（如果后端实现正确只更新传入字段）
        if (categoryChanged) {
          let candidate = editedArticle.order_index;
          if (candidate === '' || candidate === null) candidate = undefined;

          if (candidate === undefined) {
            try {
              candidate = await getNextOrderIndex(editedArticle.category_id);
            } catch (e) {
              console.warn('getNextOrderIndex failed, using default order', e);
              // 计算失败时使用1作为最后位置
              candidate = 1;
            }
          }

          if (candidate !== undefined && candidate !== null && !Number.isNaN(Number(candidate))) {
            saveData.order_index = Number(candidate);
          }
        }

        console.log('保存调试:', {
          categoryChanged,
          oldCat,
          newCat,
          hasOrderIndex: 'order_index' in saveData,
          orderIndexValue: saveData.order_index,
          saveData: saveData
        });

        // 调用更新 API
        const result = await apiPutJson<{ success: boolean; error?: string }>(`/api/articles/${articleId}`, saveData);

        if (result.success) {
          message.success({ content: '文章保存成功！', key: 'save' });
          setEditMode('view');
          // 跳转到归档页，并添加时间戳参数强制刷新
          setTimeout(() => {
            router.push(`/archive?t=${Date.now()}`);
          }, 1000);
        } else {
          message.error({ content: result.error || '保存失败', key: 'save' });
        }
      } catch (error: any) {
        console.error('保存文章失败:', error);
        // 401错误会被apiClient自动处理，这里只处理其他错误
        if (!error.message?.includes('401')) {
          message.error({ content: '保存失败，请重试', key: 'save' });
        }
      }
    }
  };

  // 取消编辑 - 带确认对话框
  const handleCancel = () => {
    Modal.confirm({
      title: '确认退出编辑？',
      icon: <ExclamationCircleOutlined />,
      content: '你还有未保存的更改，确定要放弃这些更改并退出编辑模式吗？',
      okText: '确定退出',
      cancelText: '继续编辑',
      okType: 'danger',
      onOk() {
        if (article) {
          setEditedArticle(article); // 恢复原始数据
          setEditMode('view');
          message.warning('已取消编辑');
        }
      },
    });
  };

  // 返回编辑模式（从预览）
  const handleBackToEdit = () => {
    setEditMode('edit');
  };

  // 删除文章
  const handleDelete = async () => {
    try {
      // 获取 Token
      const data = await apiDeleteJson<{ success: boolean; error?: string }>(`/api/articles/${articleId}`);

      if (data.success) {
        message.success('文章删除成功');
        // 跳转到归档页面，并添加时间戳参数强制刷新
        setTimeout(() => {
          router.push(`/archive?t=${Date.now()}`);
        }, 1000);
      } else {
        message.error(data.error || '删除失败');
      }
    } catch (error: any) {
      console.error('删除文章失败:', error);
      // 401错误会被apiClient自动处理，这里只处理其他错误
      if (!error.message?.includes('401')) {
        message.error('删除失败: ' + error.message);
      }
    }
  };

  // 调整章节功能（开发中）
  const handleAdjustCategory = () => {
    message.info('📁 章节管理功能正在开发中，敬请期待！');
  };

  // 处理点赞/取消点赞
  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);

    try {

      if (isLiked) {
        // 取消点赞
        const result = await apiDeleteJson<{ success: boolean; likes?: number; error?: string }>(`/api/articles/${articleId}/like`);

        if (result.success) {
          setIsLiked(false);
          setLikesCount(result.likes || 0);
          message.success('已取消点赞');
        } else {
          message.error(result.error || '操作失败');
        }
      } else {
        // 点赞
        const result = await apiPostJson<{ success: boolean; likes?: number; error?: string }>(`/api/articles/${articleId}/like`);

        if (result.success) {
          setIsLiked(true);
          setLikesCount(result.likes || 0);
          message.success('点赞成功！');
        } else {
          message.error(result.error || '操作失败');
        }
      }
    } catch (error: any) {
      console.error('点赞操作失败:', error);
      message.error('操作失败，请重试');
    } finally {
      setIsLiking(false);
    }
  };

  // 复制分享链接处理
  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      message.success('链接已复制到剪切板');
    } catch (error) {
      console.error('复制链接失败:', error);
      message.error('复制链接失败，请手动复制');
    }
  };

  // 保存为图片处理
  const handleExportAsImage = async () => {
    try {
      message.loading({ content: '正在准备导出...', key: 'export' });
      const imageData = await exportPageAsLongImage();
      message.success({ content: '图片已保存！', key: 'export' });

      // 创建下载链接
      const link = document.createElement('a');
      link.download = `${article?.title || '文章'}.png`;
      link.href = imageData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('导出图片失败:', error);
      message.error({ content: '导出失败，请重试', key: 'export' });
    }
  };

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

  // 创建 box1Content（需要响应状态变化）
  const box1Content = useMemo(() => (
    <div style={{ padding: '16px 24px' }}>
      <Breadcrumb
        items={[
          // 首页
          {
            title: (
              <a
                style={{
                  color: '#000',
                  textDecoration: 'none',
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: 0,
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#000')}
                onClick={() => router.push('/')}
              >
                首页
              </a>
            ),
          },
          // 如果有分类路径，显示分类层级
          ...(categoryPath.length > 0
            ? categoryPath.map((cat, index) => ({
              title: (
                <a
                  style={{
                    color: '#000',
                    textDecoration: 'none',
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: 0,
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#000')}
                  onClick={() => router.push(`/archive?category=${cat.id}`)}
                >
                  {cat.name}
                </a>
              ),
            }))
            : [
              // 如果没有分类路径，显示文章归档
              {
                title: (
                  <a
                    style={{
                      color: '#000',
                      textDecoration: 'none',
                      backgroundColor: 'transparent',
                      border: 'none',
                      padding: 0,
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#000')}
                    onClick={() => router.push('/archive')}
                  >
                    文章归档
                  </a>
                ),
              },
            ]
          ),
          // 当前文章标题
          {
            title: <span style={{ color: '#000' }}>{article?.title}</span>,
          },
        ]}
        separator={<span style={{ color: '#000' }}>/</span>}
        style={{
          color: '#000',
          fontSize: '14px',
          marginBottom: '16px',
        }}
      />

      {/* 文章标题和信息区 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '16px',
      }}>
        <div style={{ flex: 1 }}>
          {/* 文章标题 */}
          {editMode === 'edit' ? (
            <Input
              value={editedArticle?.title || ''}
              onChange={(e) => editedArticle && setEditedArticle({ ...editedArticle, title: e.target.value })}
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                border: 'none',
                background: 'transparent',
                color: '#000',
                padding: 0,
                marginBottom: '8px',
              }}
              placeholder="请输入文章标题"
            />
          ) : (
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#000',
              margin: '0 0 8px 0',
              lineHeight: '1.2',
            }}>
              {editMode === 'preview' ? editedArticle?.title : article?.title}
            </h1>
          )}

          {/* 标签 */}
          <TagBox1
            tags={editMode === 'edit' ? (editedArticle?.tags || []) : (editMode === 'preview' ? (editedArticle?.tags || []) : (article?.tags || []))}
            editMode={editMode === 'edit'}
            onTagsChange={(tags) => {
              if (editedArticle) {
                setEditedArticle({ ...editedArticle, tags });
              }
            }}
            maxTags={10}
          />
        </div>
      </div>
    </div>
  ), [isMobile, categoryPath, article, editedArticle, editMode, router]);

  // 设置页面配置
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

  return (
    <>
      {/* 统一的文章导航组件（自动适配移动端/桌面端） - 延迟加载，只有在用户打开时才加载 */}
      {shouldLoadNavigator && (
        <UnifiedNavigator
          treeConfig={{
            apiEndpoint: '/api/categories/tree-with-articles',
            emptyText: '暂无文章',
            forceOpenRootKeys: true,
            categoryNavigationPattern: '/archive?category={categoryId}',
            articleNavigationPattern: '/article/{articleId}',
            stylePrefix: 'article-index-sidebar',
            showArticleCount: true,
            dataFormat: 'tree-with-articles',
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


      {/* 编辑悬浮按钮 - 使用后端API统一判断权限 */}
      {isLoggedIn && article && user && canEditArticle && (
        <ArticleEditFloat
          mode={editMode}
          onEdit={handleEdit}
          onPreview={handlePreview}
          onSave={handleSave}
          onCancel={editMode === 'preview' ? handleBackToEdit : handleCancel}
          onDelete={handleDelete}
          onAdjustCategory={handleAdjustCategory}
          categoryId={article.category_id}
          articleAuthor={article.author}
          currentUser={user.username}
          userRole={user.role}
        />
      )}

      <div style={{ 
        marginLeft: isMobile ? 0 : (sidebarExpanded ? '280px' : '0'), 
        transition: 'margin-left 0.3s ease',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}>
          <div style={{
            width: '100%',
            maxWidth: '800px',
            minWidth: isMobile ? 'auto' : '600px',
            padding: isMobile ? '20px 16px' : '40px 20px',
            opacity: contentVisible ? 1 : 0,
            transition: 'opacity 0.3s ease',
            boxSizing: 'border-box',
          }}>
            {/* 模式提示 */}
            {editMode !== 'view' && (
              <div style={{
                background: editMode === 'edit' ? '#fff7e6' : '#e6f7ff',
                padding: '12px 20px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: `1px solid ${editMode === 'edit' ? '#ffd591' : '#91d5ff'}`,
                color: editMode === 'edit' ? '#d46b08' : '#0958d9',
                fontSize: '14px',
                fontWeight: 500,
              }}>
                {editMode === 'edit' ? '📝 编辑模式 - 点击预览按钮查看效果' : '👁️ 预览模式 - 确认无误后点击保存'}
              </div>
            )}

            {/* Part 1: 编辑模式下的编辑控件 */}
            {editMode === 'edit' && (
              <div style={{
                background: 'white',
                padding: isMobile ? '16px 12px' : '40px',
                borderRadius: isMobile ? '8px' : '8px',
                marginBottom: isMobile ? '16px' : '24px',
                boxShadow: isMobile ? '0 1px 3px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.08)',
              }}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                  }}>
                    文章类型
                  </label>
                  <Select
                    value={editedArticle?.type || 'text'}
                    onChange={(value) => editedArticle && setEditedArticle({ ...editedArticle, type: value })}
                    size="large"
                    style={{ width: '300px' }}
                  >
                    <Option value="text">📝 普通文章</Option>
                    <Option value="image">📷 图片内容</Option>
                    <Option value="drawing">🎨 绘画作品</Option>
                    <Option value="code">💻 代码片段</Option>
                    <Option value="diary">📔 日志</Option>
                  </Select>
                  {(editedArticle?.type === 'drawing' || editedArticle?.type === 'image') && (
                    <div style={{
                      marginTop: '8px',
                      color: '#faad14',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span>⚠️</span>
                      <span>{editedArticle?.type === 'drawing' ? '绘画' : '图片'}类型必须包含至少一张图片才能保存</span>
                    </div>
                  )}
                  {editedArticle?.type === 'code' && (
                    <div style={{
                      marginTop: '8px',
                      color: '#faad14',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span>⚠️</span>
                      <span>代码类型必须包含至少一个代码块才能保存</span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                  }}>
                    文章目录
                  </label>
                  <CategoryTreeSelect
                    value={editedArticle?.category_id}
                    onChange={async (value) => {
                      if (editedArticle) {
                        // 计算新的 order_index：找到新分类下最大的 order 值 + 1
                        // 需要同时考虑子分类的 order_index 和文章的 order_index
                        let newOrderIndex = editedArticle.order_index;

                        if (value && value !== editedArticle.category_id) {
                          try {
                            // 使用工具函数计算新的 order_index
                            newOrderIndex = await getNextOrderIndex(value);
                          } catch (error) {
                            // 如果计算失败，保持原有顺序
                            console.warn('计算新顺序失败，保持原有顺序:', error);
                            newOrderIndex = editedArticle.order_index;
                            message.warning('无法计算新顺序，保持原有位置');
                          }
                        }

                        setEditedArticle({ ...editedArticle, category_id: value, order_index: newOrderIndex });

                        // 更新面包屑路径
                        if (value) {
                          fetchCategoryPath(value);
                        } else {
                          setCategoryPath([]);
                        }
                      }
                    }}
                    placeholder="选择文章所属目录（可选）"
                  />
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                    选择文章的分类目录，方便管理和查找
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                  }}>
                    文章标签
                  </label>
                  <TagInput
                    value={editedArticle?.tags || []}
                    onChange={(tags) => {
                      if (editedArticle) {
                        setEditedArticle({ ...editedArticle, tags });
                      }
                    }}
                    placeholder="输入标签，按空格或回车添加"
                    maxTags={10}
                  />
                </div>
              </div>
            )}

            {/* Part 2: 文章主体内容 */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                minHeight: '100vh',
                padding: isMobile ? (editMode === 'edit' ? '16px 8px' : '20px 12px') : '40px',
                borderRadius: '12px',
                marginBottom: isMobile ? '20px' : '40px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                lineHeight: '1.8',
                fontSize: isMobile ? '15px' : '16px',
                color: '#333',
                width: '100%',
                boxSizing: 'border-box',
              }}
              data-content-area
            >
              {editMode === 'edit' ? (
                // 编辑模式 - 使用块编辑器
                <>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      {editedArticle?.editorBlocks && (
                        <>
                          <Tag id="stats-blocks">{editedArticle.editorBlocks.length} 个块</Tag>
                          <Tag id="stats-text">{editedArticle.editorBlocks.filter((b: any) => b.type === 'text').length} 文字</Tag>
                          <Tag id="stats-image">{editedArticle.editorBlocks.filter((b: any) => b.type === 'image').length} 图片</Tag>
                          <Tag id="stats-code">{editedArticle.editorBlocks.filter((b: any) => b.type === 'code').length} 代码</Tag>
                        </>
                      )}
                    </Space>
                  </div>

                  <Divider />

                  <BlockEditor
                    blocks={editedArticle?.editorBlocks || []}
                    onChange={(blocks) => setEditedArticle({ ...editedArticle, editorBlocks: blocks })}
                    showAddButton={false}
                  />
                </>
              ) : (
                // 浏览/预览模式 - 渲染块内容
                <div>
                  {(editMode === 'preview' && editedArticle ? editedArticle.blocks : article?.blocks || []).map((block: any, index: number) => {
                    // 每个块延迟递增，让它们依次渐显
                    const delay = index * 0.1; // 每个块延迟0.1秒
                    const blockStyle = {
                      marginBottom: '32px',
                      animation: 'fadeInUp 1s ease-out forwards',
                      animationDelay: `${delay}s`,
                      opacity: 0,
                    };

                    return (
                      <div key={block.id} className="book-content-block" style={blockStyle}>
                        {block.type === 'text' ? (
                          <TextBlock block={block} mode="view" />
                        ) : block.type === 'image' ? (
                          <ImageBlock block={block} mode="view" />
                        ) : block.type === 'code' ? (
                          <CodeBlock block={block} mode="view" />
                        ) : block.type === 'placeholder' ? (
                          <PlaceholderBlock block={block as any} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Part 3: 互动按钮和评论区 */}
            <div
              style={{
                background: 'white',
                padding: isMobile ? '20px 12px' : '32px 40px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
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

              {/* 评论区 - 懒加载 */}
              {shouldLoadInteractions && (
                <CommentSection
                  articleId={articleId}
                  currentUser={user ? { username: user.username, avatar: user.avatar_base64 as string, role: user.role } : null}
                  isLoggedIn={isLoggedIn}
                  onCommentCountChange={setCommentsCount}
                />
              )}
            </div>
          </div>
      </div>

      {/* 图片查看器 */}
      {selectedImage && (
        <ImageCardModal
          visible={isImageModalVisible}
          imageUrl={selectedImage.url}
          title={selectedImage.title || ''}
          description={selectedImage.description || ''}
          onClose={() => {
            setIsImageModalVisible(false);
            setSelectedImage(null);
          }}
        />
      )}

      {/* 调整章节弹窗 - 功能开发中，暂时注释 */}
      {/* {article && (
        <ArticleCategoryModal
          open={categoryModalOpen}
          articleId={articleId}
          articleTitle={article.title}
          currentCategoryId={article.category_id}
          onClose={() => setCategoryModalOpen(false)}
          onSuccess={handleCategoryAdjustSuccess}
        />
      )} */}
    </>
  );
}


