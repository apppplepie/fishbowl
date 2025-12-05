'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, message, Modal, Select, Tag, Dropdown, Divider, Space, Breadcrumb } from 'antd';
import type { MenuProps } from 'antd';

const { Option } = Select;
import { LikeOutlined, ShareAltOutlined, MessageOutlined, UnorderedListOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import PageLayout from '@/app/components/PageLayout';
import Header from '@/app/components/Header';
import ArticleTocNav from '@/app/components/sidebar/ArticleIndexSidebar';
import BookTocDrawer from '@/app/components/sidebar/ChapterIndexDrawer';
import BookCategorySidebar from '@/app/components/sidebar/ChapterIndexSidebar';
import ArticleEditFloat, { EditMode } from '@/app/components/float/ArticleEditFloat';
// import ArticleCategoryModal from '@/app/components/ArticleCategoryModal'; // 功能开发中
import CategoryTreeSelect from '@/app/components/CategoryTreeSelect';
import TagInput from '@/app/components/TagInput';
import CommentSection from '@/app/components/CommentSection';
import ImageCardModal from '@/app/components/ImageCardModal';
import { useParams, useRouter } from 'next/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';
import { generateExcerptFromBlocks } from '@/app/utils/bookUtils';
import { useAuth } from '@/app/hooks/useAuth';
import BlockEditor from '@/app/components/blocks/BlockEditor';
import { applyFormat, type FormatOption } from '@/app/utils/textFormatter';
import { formatTimeToMinute } from '@/app/utils/timeFormat';
import type { Block as BlockType } from '@/app/types/block';
import {
  getArticleWithBlocks,
  type Block,
  type TextBlockContent,
  type ImageBlockContent,
  type CodeBlockContent
} from '@/app/data/mockDatabase';

const { TextArea } = Input;

/**
 * 书籍详情页面
 * 展示单本书籍的完整内容
 */
export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;
  const { isMobile } = useResponsive();
  const { isLoggedIn, user } = useAuth();
  const [tocDrawerOpen, setTocDrawerOpen] = useState(false);
  const [bookCategoryId, setBookCategoryId] = useState<string>('');

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

  // 从数据源获取书籍
  const [book, setBook] = useState<any>(null);
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

  /**
   * 获取分类路径
   */
  const fetchCategoryPath = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}/path`);
      const result = await response.json();

      if (result.success && result.path) {
        setCategoryPath(result.path);
      }
    } catch (error) {
      console.error('获取分类路径失败:', error);
    }
  };

  /**
   * 加载书籍数据
   */
  const loadBook = async (id: string) => {
    try {
      // 先尝试从 API 加载
      const response = await fetch(`/api/articles/${id}`);
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

        setBook(processedArticle);
        setIsLiked(false); // 暂时设为 false
        setLikesCount(result.article.likes || 0);
        setCommentsCount(result.article.comments || 0);

        // 设置书籍分类ID
        if (result.article.category_id) {
          console.log('书籍分类ID:', result.article.category_id);
          setBookCategoryId(result.article.category_id);
          await fetchCategoryPath(result.article.category_id);
        } else {
          console.log('书籍没有分类ID');
        }
      } else {
        // 如果 API 失败，尝试从 mock 数据加载
        const mockBook = getArticleWithBlocks(id);
        if (mockBook) {
          setBook(mockBook);
          setIsLiked(false);
          setLikesCount(mockBook.likes || 0);
          setCommentsCount(mockBook.comments || 0);

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
        setIsLiked(false);
        setLikesCount(mockBook.likes || 0);
        setCommentsCount(mockBook.comments || 0);

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
    if (bookId) {
      loadBook(bookId);
    }
  }, [bookId]);

  // 点赞处理
  const handleLike = async () => {
    if (!isLoggedIn) {
      message.warning('请先登录');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    try {
      const response = await fetch(`/api/articles/${bookId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

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

      const response = await fetch(`/api/articles/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          excerpt: updatedExcerpt, // 使用重新生成的excerpt
          category_id: book.category_id,
          blocks: book.blocks,
          tags: book.tags,
        }),
      });

      const result = await response.json();
      if (result.success) {
        message.success('保存成功');
        setEditMode('view');
        // 重新加载数据
        loadBook(bookId);
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

          const response = await fetch(`/api/articles/${bookId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const result = await response.json();
          if (result.success) {
            message.success('删除成功');
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

  if (!book) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60vh',
        fontSize: '16px',
        color: '#999'
      }}>
        加载中...
      </div>
    );
  }

  return (
    <>
      {/* Header 独立在最顶部，覆盖在边框上 */}
      <Header
        leftContent={
          isMobile ? (
            <Button
              type="text"
              icon={<UnorderedListOutlined style={{ fontSize: '20px', color: 'white' }} />}
              onClick={() => setTocDrawerOpen(true)}
              style={{ border: 'none' }}
            />
          ) : null
        }
      />

      {/* 电脑端固定侧边栏 - 从 header 下方到页面底部 */}
      {!isMobile && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: '45px', // header 的高度
            bottom: 0,
            width: '280px',
            background: 'white',
            borderRight: '1px solid #e8e8e8',
            zIndex: 999,
            overflowY: 'auto',
          }}
        >
          <BookCategorySidebar
            currentArticleId={bookId}
            bookCategoryId={bookCategoryId}
            onArticleClick={handleArticleClick}
          />
        </div>
      )}

      <div style={{ marginLeft: isMobile ? 0 : '280px' }}>
        <PageLayout
          box1Content={
            <div style={{ padding: '16px 24px' }}>
              {/* 面包屑导航 */}
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
                  // 从当前文章追溯父级到 cat_bookcase 根目录
                  ...categoryPath
                    .filter(cat => cat.id !== 'root')
                    .map((category, index) => ({
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
                          {category.name}
                        </a>
                      ),
                    })),
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
                        {book.tags.map((tag: string, index: number) => (
                          <Tag
                            key={index}
                            color="blue"
                            style={{
                              color: 'white',
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                            }}
                          >
                            {tag}
                          </Tag>
                        ))}
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
                {book.blocks && book.blocks.map((block: Block & { parsedContent: any }, index: number) => {
                  switch (block.type) {
                    case 'text':
                      const textContent = block.parsedContent as any;
                      return (
                        <div
                          key={block.id || index}
                          style={{
                            marginBottom: '24px',
                            lineHeight: '1.8',
                            fontSize: '16px',
                            color: '#333',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {textContent.content}
                        </div>
                      );

                    case 'image':
                      const imageContent = block.parsedContent as any;
                      // 优先使用原始的imageUrl，如果parsedContent.url不存在的话
                      const displayUrl = (imageContent && imageContent.url) || (block as any).imageUrl;
                      return (
                        <div
                          key={block.id || index}
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
                      );

                    case 'code':
                      const codeContent = block.parsedContent as any;
                      return (
                        <div
                          key={block.id || index}
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
                      );

                    default:
                      return null;
                  }
                })}
              </div>
            )}
          </div>

          {/* 评论区 */}
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: isMobile ? '0 16px 40px' : '0 20px 40px',
          }}>
            <CommentSection
              articleId={bookId}
              isLoggedIn={isLoggedIn}
              currentUser={user}
              onCommentCountChange={setCommentsCount}
            />
          </div>
        </PageLayout>
      </div>

      {/* 目录抽屉 */}
      <BookTocDrawer
        open={tocDrawerOpen}
        onClose={() => setTocDrawerOpen(false)}
        currentArticleId={bookId}
        bookCategoryId={bookCategoryId}
        onArticleClick={handleArticleClick}
      />

      {/* 图片模态框 */}
      <ImageCardModal
        visible={isImageModalVisible}
        onClose={() => setIsImageModalVisible(false)}
        imageUrl={selectedImage?.url || ''}
      />

      {/* 编辑悬浮按钮 */}
      {isLoggedIn && user?.username === book?.author && (
        <ArticleEditFloat
          mode={editMode}
          onEdit={() => handleEditModeChange('edit')}
          onPreview={() => handleEditModeChange('preview')}
          onSave={handleSave}
          onCancel={() => {
            setEditMode('view');
            loadBook(bookId);
          }}
          onDelete={handleDelete}
          articleAuthor={book?.author}
          currentUser={user?.username}
        />
      )}
    </>
  );
}
