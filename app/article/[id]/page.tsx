'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, message, Modal, Select, Tag, Dropdown, Divider, Space, Breadcrumb } from 'antd';
import type { MenuProps } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Option } = Select;
import { LikeOutlined, ShareAltOutlined, MessageOutlined, UnorderedListOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import PageLayout from '@/app/components/PageLayout';
import Header from '@/app/components/Header';
import ArticleNavigator, { ArticleDrawerButton } from '@/app/components/sidebar/ArticleNavigator';
import ArticleEditFloat, { EditMode } from '@/app/components/float/ArticleEditFloat';
// import ArticleCategoryModal from '@/app/components/ArticleCategoryModal'; // 功能开发中
import CategoryTreeSelect from '@/app/components/CategoryTreeSelect';
import TagInput from '@/app/components/TagInput';
import CommentSection from '@/app/components/CommentSection';
import ImageCardModal from '@/app/components/ImageCardModal';
import { useParams, useRouter } from 'next/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';
import { ACCESS_LEVELS } from '@/app/types/block';
import { useAuth } from '@/app/hooks/useAuth';
import { useCanEditArticle } from '@/app/hooks/useCanEditArticle';
import BlockEditor from '@/app/components/blocks/BlockEditor';
import PlaceholderBlock from '@/app/components/blocks/PlaceholderBlock';
import { applyFormat, type FormatOption } from '@/app/utils/textFormatter';
import { formatTimeToMinute } from '@/app/utils/timeFormat';
import { generateExcerptFromBlocks } from '@/app/utils/bookUtils';
import type { Block as BlockType } from '@/app/types/block';
import { apiGet } from '@/lib/apiClient';
import {
  getArticleWithBlocks,
  type Block,
  type TextBlockContent,
  type ImageBlockContent,
  type CodeBlockContent
} from '@/app/data/mockDatabase';

const { TextArea } = Input;

/**
 * 文章详情页面
 * 展示单篇文章的完整内容
 */
export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;
  const { isMobile } = useResponsive();
  const { isLoggedIn, user, getToken } = useAuth();
  const { canEdit: canEditArticle } = useCanEditArticle(articleId);

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

  // 目录抽屉状态
  const [drawerVisible, setDrawerVisible] = useState(false);

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
        const response = await apiGet(`/api/articles/${articleId}`);
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

  // 检查点赞状态
  useEffect(() => {
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
  }, [articleId]);

  // 编辑时的临时数据
  const [editedArticle, setEditedArticle] = useState<any>(null);

  // 打开图片查看器
  const handleImageClick = (imageContent: ImageBlockContent) => {
    setSelectedImage(imageContent);
    setIsImageModalVisible(true);
  };

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
    if (editedArticle) {
      try {
        // 验证标题
        if (!editedArticle.title?.trim()) {
          message.warning('请输入文章标题');
          return;
        }

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

        // 准备保存的数据
        const saveData = {
          title: editedArticle.title,
          type: editedArticle.type || 'text',
          category_id: editedArticle.category_id || null,
          tags: editedArticle.tags || [],
          blocks: editedArticle.editorBlocks || [],
          excerpt: updatedExcerpt, // 添加重新生成的excerpt
          // 封面图片由后端自动计算，无需前端提供
        };

        // 获取 Token
        const token = localStorage.getItem('token');

        if (!token) {
          message.error({ content: '请先登录', key: 'save' });
          return;
        }

        // 调用更新 API
        const response = await fetch(`/api/articles/${articleId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(saveData),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          message.success({ content: '文章保存成功！', key: 'save' });
          setEditMode('view');
          // 跳转到归档页
          setTimeout(() => {
            router.push('/archive');
          }, 1000);
        } else {
          message.error({ content: result.error || '保存失败', key: 'save' });
        }
      } catch (error) {
        console.error('保存文章失败:', error);
        message.error({ content: '保存失败，请重试', key: 'save' });
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
      const token = localStorage.getItem('token');

      if (!token) {
        message.error('请先登录');
        return;
      }

      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        message.success('文章删除成功');
        // 跳转到归档页面
        setTimeout(() => {
          router.push('/archive');
        }, 1000);
      } else {
        message.error(data.error || '删除失败');
      }
    } catch (error: any) {
      console.error('删除文章失败:', error);
      message.error('删除失败: ' + error.message);
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
      const token = localStorage.getItem('token');

      if (isLiked) {
        // 取消点赞
        const response = await fetch(`/api/articles/${articleId}/like`, {
          method: 'DELETE',
          headers: token ? {
            'Authorization': `Bearer ${token}`,
          } : {},
        });

        const result = await response.json();

        if (result.success) {
          setIsLiked(false);
          setLikesCount(result.likes);
          message.success('已取消点赞');
        } else {
          message.error(result.error || '操作失败');
        }
      } else {
        // 点赞
        const response = await fetch(`/api/articles/${articleId}/like`, {
          method: 'POST',
          headers: token ? {
            'Authorization': `Bearer ${token}`,
          } : {},
        });

        const result = await response.json();

        if (result.success) {
          setIsLiked(true);
          setLikesCount(result.likes);
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

  // 切换目录抽屉的函数
  const openCategoryDrawer = () => setDrawerVisible(!drawerVisible);

  return (
    <>
      {/* 统一的文章导航组件（自动适配移动端/桌面端） */}
      <ArticleNavigator
        currentArticleId={articleId}
        onArticleClick={handleArticleClick}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />

      {/* Header 覆盖在PageLayout顶部边框上 */}
      <Header
        leftContent={
          isMobile && <ArticleDrawerButton onClick={openCategoryDrawer} />
        }
      /> 

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

      <div style={{ marginLeft: isMobile ? 0 : '280px' }}>
        <PageLayout
          box1Content={
            <div style={{ padding: '16px 24px' }}>
              <Breadcrumb
                items={[
                  // 首页
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
                              color: 'white',
                              textDecoration: 'none',
                              backgroundColor: 'transparent',
                              border: 'none',
                              padding: 0,
                              transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
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
                                color: 'white',
                                textDecoration: 'none',
                                backgroundColor: 'transparent',
                                border: 'none',
                                padding: 0,
                                transition: 'color 0.2s ease'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
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
                    title: <span style={{ color: 'white' }}>{article?.title}</span>,
                  },
                ]}
                separator={<span style={{ color: 'white' }}>/</span>}
                style={{
                  color: 'white',
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
                        color: 'white',
                        padding: 0,
                        marginBottom: '8px',
                      }}
                      placeholder="请输入文章标题"
                    />
                  ) : (
                    <h1 style={{
                      fontSize: '28px',
                      fontWeight: 'bold',
                      color: 'white',
                      margin: '0 0 8px 0',
                      lineHeight: '1.2',
                    }}>
                      {editMode === 'preview' ? editedArticle?.title : article?.title}
                    </h1>
                  )}

                  {/* 文章信息 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    flexWrap: 'wrap',
                  }}>
                    <span>作者：{editMode === 'edit' ? editedArticle?.author : (editMode === 'preview' ? editedArticle?.author : article?.author)}</span>
                    <span>日期：{editMode === 'edit' 
                      ? (editedArticle?.last_modified ? formatTimeToMinute(editedArticle.last_modified) : formatTimeToMinute(new Date().toISOString()))
                      : formatTimeToMinute(editMode === 'preview' ? editedArticle?.last_modified : article?.last_modified)}</span>
                  </div>

                  {/* 标签 */}
                  {(editMode === 'edit' ? editedArticle?.tags : (editMode === 'preview' ? editedArticle?.tags : article?.tags))?.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <Space wrap>
                        {(editMode === 'edit' ? editedArticle?.tags : (editMode === 'preview' ? editedArticle?.tags : article?.tags)).map((tag: string, index: number) => {
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
              </div>
            </div>
          }
          box1BgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          box2BgColor="#f5f5f5"
          box2Style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: '900px',
            padding: isMobile ? '16px 12px' : '40px 24px',
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
                        let newOrderIndex = editedArticle.order_index || 0;

                        if (value && value !== editedArticle.category_id) {
                          try {
                            const token = localStorage.getItem('token');

                            // 1. 查询新分类下的所有直接子分类，获取最大的 order_index
                            let maxCategoryOrder = 0;
                            try {
                              const categoryResponse = await fetch(`/api/categories/${value}/tree-with-articles`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                },
                              });

                              if (categoryResponse.ok) {
                                const categoryData = await categoryResponse.json();
                                if (categoryData.success && categoryData.tree && categoryData.tree.children) {
                                  // 只查找直接子分类的 order_index
                                  for (const child of categoryData.tree.children) {
                                    if (child.node_type === 'category' && child.order_index > maxCategoryOrder) {
                                      maxCategoryOrder = child.order_index;
                                    }
                                  }
                                }
                              }
                            } catch (error) {
                              console.warn('获取子分类排序信息失败:', error);
                            }

                            // 2. 查询新分类下的所有文章，获取最大的 order_index
                            let maxArticleOrder = 0;
                            try {
                              const articleResponse = await fetch(`/api/articles?category=${value}&limit=1000&sort=order_desc`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                },
                              });

                              if (articleResponse.ok) {
                                const articleData = await articleResponse.json();
                                if (articleData.articles && articleData.articles.length > 0) {
                                  maxArticleOrder = Math.max(
                                    ...articleData.articles.map((article: any) => article.order_index || 0)
                                  );
                                }
                              }
                            } catch (error) {
                              console.warn('获取文章排序信息失败:', error);
                            }

                            // 3. 取两者中的最大值 + 1
                            newOrderIndex = Math.max(maxCategoryOrder, maxArticleOrder) + 1;
                          } catch (error) {
                            console.warn('获取排序信息失败，使用原有排序:', error);
                            newOrderIndex = editedArticle.order_index || 0;
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
            <div style={{
              background: 'white',
              padding: isMobile ? (editMode === 'edit' ? '16px 8px' : '20px 12px') : '40px',
              borderRadius: isMobile ? '8px' : '8px',
              marginBottom: isMobile ? '16px' : '24px',
              boxShadow: isMobile ? '0 1px 3px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.08)',
              lineHeight: '1.8',
              fontSize: isMobile ? '15px' : '16px',
              color: '#333',
            }}>
              {editMode === 'edit' ? (
                // 编辑模式 - 使用块编辑器
                <>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      {editedArticle?.editorBlocks && (
                        <>
                          <Tag color="blue">{editedArticle.editorBlocks.length} 个块</Tag>
                          <Tag color="green">{editedArticle.editorBlocks.filter((b: any) => b.type === 'text').length} 文字</Tag>
                          <Tag color="orange">{editedArticle.editorBlocks.filter((b: any) => b.type === 'image').length} 图片</Tag>
                          <Tag color="purple">{editedArticle.editorBlocks.filter((b: any) => b.type === 'code').length} 代码</Tag>
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
                  {(editMode === 'preview' && editedArticle ? editedArticle.blocks : article?.blocks || []).map((block: Block & { parsedContent: any }, index: number) => (
                    <div key={block.id} style={{ marginBottom: '32px' }}>
                      {block.type === 'text' ? (
                        // 文字块
                        <div>
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
                          <div style={{
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            lineHeight: '1.8',
                            fontSize: '16px',
                            color: '#333',
                            maxWidth: '100%',
                          }}>
                            {(block.parsedContent as TextBlockContent).content}
                          </div>
                        </div>
                      ) : block.type === 'image' ? (
                        // 图片块
                        <div>
                          {/* Access Level 显示 */}
                          <div
                            style={{
                              position: 'relative',
                              marginBottom: '8px',
                            }}
                          >
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
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'transform 0.2s',
                            }}
                            onClick={() => handleImageClick(block.parsedContent as ImageBlockContent)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.02)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                          {(() => {
                            const parsedContent = block.parsedContent as ImageBlockContent;
                            // 优先使用原始的imageUrl，如果parsedContent.url不存在的话
                            const displayUrl = (parsedContent && parsedContent.url) || (block as any).imageUrl;
                            return displayUrl ? (
                              <img
                                src={displayUrl}
                                alt="图片"
                                style={{
                                  width: '100%',
                                  height: 'auto',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  objectFit: 'contain',
                                }}
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
                            );
                          })()}
                          {block.parsedContent && (block.parsedContent as ImageBlockContent).description && (
                            <div style={{
                              marginTop: '8px',
                              fontSize: '13px',
                              color: '#999',
                            }}>
                              {(block.parsedContent as ImageBlockContent).description}
                            </div>
                          )}
                          </div>
                        </div>
                      ) : block.type === 'code' ? (
                        // 代码块
                        <div>
                          {/* Access Level 显示 */}
                          <div
                            style={{
                              position: 'relative',
                              marginBottom: '8px',
                            }}
                          >
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
                          <div style={{
                            background: '#282c34',
                            borderRadius: '8px',
                            padding: '20px',
                            overflow: 'auto',
                          }}>
                          {(block.parsedContent as CodeBlockContent).title && (
                            <div style={{
                              color: '#61dafb',
                              fontSize: '14px',
                              marginBottom: '12px',
                              fontWeight: 500,
                            }}>
                              {(block.parsedContent as CodeBlockContent).title}
                            </div>
                          )}
                          <div style={{
                            fontSize: '13px',
                            color: '#abb2bf',
                            marginBottom: '8px',
                            opacity: 0.7,
                          }}>
                            {(block.parsedContent as CodeBlockContent).language}
                          </div>
                          <pre style={{
                            margin: 0,
                            color: '#abb2bf',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            overflowX: 'auto',
                          }}>
                            <code>{(block.parsedContent as CodeBlockContent).code}</code>
                          </pre>
                          </div>
                        </div>
                      ) : block.type === 'placeholder' ? (
                        // 占位块
                        <PlaceholderBlock block={block as any} />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Part 3: 互动按钮和评论区 */}
            <div style={{
              background: 'white',
              padding: isMobile ? '20px 12px' : '32px 40px',
              borderRadius: isMobile ? '8px' : '8px',
              boxShadow: isMobile ? '0 1px 3px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.08)',
            }}>
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
                    minWidth: '120px',
                    color: isLiked ? '#1890ff' : undefined,
                    borderColor: isLiked ? '#1890ff' : undefined,
                  }}
                  onClick={handleLike}
                  loading={isLiking}
                >
                  {isLiked ? '已点赞' : '点赞'} {likesCount}
                </Button>
                <Button
                  icon={<ShareAltOutlined />}
                  size="large"
                  style={{ minWidth: '120px' }}
                  onClick={() => {
                    message.info('分享功能开发中');
                  }}
                >
                  分享 {article?.shares || 0}
                </Button>
              </div>

              {/* 评论区 */}
              <CommentSection
                articleId={articleId}
                currentUser={user ? { username: user.username, avatar: user.avatar_url, role: user.role } : null}
                isLoggedIn={isLoggedIn}
                onCommentCountChange={setCommentsCount}
              />
            </div>
          </div>
        </PageLayout>
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

