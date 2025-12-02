'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, message, Modal, Select, Tag, Dropdown, Divider, Space } from 'antd';
import type { MenuProps } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Option } = Select;
import { LikeOutlined, ShareAltOutlined, MessageOutlined, UnorderedListOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import PageLayout from '@/app/components/PageLayout';
import Header from '@/app/components/Header';
import ArticleTocNav from '@/app/components/ArticleTocNav';
import ArticleTocDrawer from '@/app/components/ArticleTocDrawer';
import ArticleEditFloat, { EditMode } from '@/app/components/ArticleEditFloat';
import CommentSection from '@/app/components/CommentSection';
import ImageCardModal from '@/app/components/ImageCardModal';
import { useParams, useRouter } from 'next/navigation';
import { useResponsive } from '@/app/hooks/useResponsive';
import { useAuth } from '@/app/hooks/useAuth';
import BlockEditor from '@/app/components/BlockEditor';
import { applyFormat, type FormatOption } from '@/app/utils/textFormatter';
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
 * 文章详情页面
 * 展示单篇文章的完整内容
 */
export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;
  const { isMobile } = useResponsive();
  const { isLoggedIn, user } = useAuth();
  const [tocDrawerOpen, setTocDrawerOpen] = useState(false);
  
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
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageBlockContent | null>(null);

  // 加载文章数据
  useEffect(() => {
    async function loadArticle() {
      try {
        // 先尝试从 API 加载
        const response = await fetch(`/api/articles/${articleId}`);
        const result = await response.json();

        if (response.ok && result.success && result.article) {
          setArticle(result.article);
          setEditedArticle(result.article);
        } else {
          // 如果 API 失败，尝试从 mock 数据加载
          const articleData = getArticleWithBlocks(articleId);
          if (articleData) {
            setArticle(articleData);
            setEditedArticle(articleData);
          } else {
            message.error('文章不存在');
            router.push('/articles');
          }
        }
      } catch (error) {
        console.error('加载文章失败:', error);
        // 如果网络错误，尝试从 mock 数据加载
        const articleData = getArticleWithBlocks(articleId);
        if (articleData) {
          setArticle(articleData);
          setEditedArticle(articleData);
        } else {
          message.error('加载文章失败');
          router.push('/articles');
        }
      }
    }

    loadArticle();
  }, [articleId, router]);

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
      const editorBlocks = article.blocks.map((b: any, index: number) => {
        if (b.type === 'text') {
          return {
            id: b.id,
            type: 'text',
            order: index,
            content: b.parsedContent.content,
          };
        } else if (b.type === 'image') {
          return {
            id: b.id,
            type: 'image',
            order: index,
            imageUrl: b.parsedContent.url,
            title: b.parsedContent.title,
            description: b.parsedContent.description,
          };
        } else if (b.type === 'code') {
          return {
            id: b.id,
            type: 'code',
            order: index,
            language: b.parsedContent.language,
            code: b.parsedContent.code,
            title: b.parsedContent.title,
          };
        }
        return b;
      });

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
        message.loading({ content: '正在保存...', key: 'save' });

        // 准备保存的数据
        const saveData = {
          title: editedArticle.title,
          type: editedArticle.type,
          blocks: editedArticle.editorBlocks || [],
        };

        // 调用更新 API
        const response = await fetch(`/api/articles/${articleId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saveData),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          message.success({ content: '文章保存成功！', key: 'save' });
          setEditMode('view');
          // 跳转到归档页
          setTimeout(() => {
            router.push('/articles');
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
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        message.success('文章删除成功');
        // 跳转到归档页面
        setTimeout(() => {
          router.push('/articles');
        }, 1000);
      } else {
        message.error(data.error || '删除失败');
      }
    } catch (error: any) {
      console.error('删除文章失败:', error);
      message.error('删除失败: ' + error.message);
    }
  };

  return (
    <>
      {/* Header 覆盖在PageLayout顶部边框上 */}
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
      
      {/* 移动端目录抽屉 */}
      <ArticleTocDrawer
        open={tocDrawerOpen}
        onClose={() => setTocDrawerOpen(false)}
        currentArticleId={articleId}
        onArticleClick={handleArticleClick}
      />

      {/* 编辑悬浮按钮 - 仅登录用户可见 */}
      {isLoggedIn && article && (
        <ArticleEditFloat
          mode={editMode}
          onEdit={handleEdit}
          onPreview={handlePreview}
          onSave={handleSave}
          onCancel={editMode === 'preview' ? handleBackToEdit : handleCancel}
          onDelete={handleDelete}
          articleAuthor={article.author}
          currentUser={user?.username}
        />
      )}

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
          <ArticleTocNav 
            currentArticleId={articleId}
            onArticleClick={handleArticleClick}
          />
        </div>
      )}
      
      <div style={{ marginLeft: isMobile ? 0 : '280px' }}>
        <PageLayout
          box1Content={
            <div style={{ 
              padding: '12px 24px',
              color: 'white',
              fontSize: '14px',
            }}>
              首页 / 文章归档 / {article?.title}
            </div>
          }
          box1BgColor="rgba(0, 0, 0, 0.7)"
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
            padding: '40px 24px',
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

            {/* Part 1: 标题和元信息 */}
            <div style={{
              background: 'white',
              padding: '40px',
              borderRadius: '8px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              {editMode === 'edit' ? (
                // 编辑模式 - 可编辑标题和类型
                <>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#666',
                    }}>
                      文章标题
                    </label>
                    <Input
                      value={editedArticle?.title || ''}
                      onChange={(e) => editedArticle && setEditedArticle({ ...editedArticle, title: e.target.value })}
                      placeholder="请输入文章标题"
                      size="large"
                      style={{
                        fontSize: '24px',
                        fontWeight: 700,
                      }}
                    />
                  </div>

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
                      style={{ width: '200px' }}
                      size="large"
                    >
                      <Option value="text">📝 文字类型</Option>
                      <Option value="image">🖼️ 图片类型</Option>
                      <Option value="code">💻 代码类型</Option>
                      <Option value="diary">📔 日记类型</Option>
                    </Select>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                      类型决定了文章在归档页面的展示样式
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '24px',
                    color: '#666',
                    fontSize: '14px',
                    paddingTop: '24px',
                    borderTop: '1px solid #e8e8e8',
                  }}>
                    <span>👤 作者：<strong>{editedArticle?.author}</strong></span>
                    <span>📅 发布：{editedArticle?.publish_date}</span>
                    <span>🔄 更新：{new Date().toISOString().split('T')[0]}</span>
                  </div>
                </>
              ) : (
                // 浏览/预览模式 - 显示标题
                <>
                  <h1 style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    marginBottom: '24px',
                    color: '#1a1a1a',
                  }}>
                    {editMode === 'preview' ? editedArticle?.title : article?.title}
                  </h1>
                  
                  <div style={{
                    display: 'flex',
                    gap: '24px',
                    color: '#666',
                    fontSize: '14px',
                    paddingBottom: '24px',
                    borderBottom: '1px solid #e8e8e8',
                  }}>
                    <span>👤 作者：<strong>{editMode === 'preview' ? editedArticle?.author : article?.author}</strong></span>
                    <span>📅 发布：{editMode === 'preview' ? editedArticle?.publish_date : article?.publish_date}</span>
                    <span>🔄 更新：{editMode === 'preview' ? editedArticle?.last_modified : article?.last_modified}</span>
                  </div>
                </>
              )}
            </div>

            {/* Part 2: 文章主体内容 */}
            <div style={{
              background: 'white',
              padding: editMode === 'edit' ? '40px' : '40px',
              borderRadius: '8px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              lineHeight: '1.8',
              fontSize: '16px',
              color: '#333',
            }}>
              {editMode === 'edit' ? (
                // 编辑模式 - 使用块编辑器
                <>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>🧱 文章内容</h3>
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
                        <div style={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.8',
                          fontSize: '16px',
                          color: '#333',
                        }}>
                          {(block.parsedContent as TextBlockContent).content}
                        </div>
                      ) : block.type === 'image' ? (
                        // 图片块
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
                          <img 
                            src={(block.parsedContent as ImageBlockContent).url}
                            alt="图片"
                            style={{
                              maxWidth: '100%',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            }}
                          />
                          {(block.parsedContent as ImageBlockContent).description && (
                            <div style={{
                              marginTop: '8px',
                              fontSize: '13px',
                              color: '#999',
                            }}>
                              {(block.parsedContent as ImageBlockContent).description}
                            </div>
                          )}
                        </div>
                      ) : block.type === 'code' ? (
                        // 代码块
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
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Part 3: 互动按钮和评论区 */}
            <div style={{
              background: 'white',
              padding: '32px 40px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
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
                  style={{ minWidth: '120px' }}
                >
                  点赞 {article?.likes || 0}
                </Button>
                <Button 
                  icon={<ShareAltOutlined />} 
                  size="large"
                  style={{ minWidth: '120px' }}
                >
                  分享 {article?.shares || 0}
                </Button>
                <Button 
                  icon={<MessageOutlined />} 
                  size="large"
                  style={{ minWidth: '120px' }}
                  onClick={() => {
                    // 滚动到评论区
                    const commentSection = document.querySelector('#comment-section');
                    if (commentSection) {
                      commentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                >
                  评论
                </Button>
              </div>

              {/* 评论区 */}
              <CommentSection 
                articleId={articleId}
                currentUser={user ? { username: user.username, avatar: user.avatar } : null}
                isLoggedIn={isLoggedIn}
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
    </>
  );
}

