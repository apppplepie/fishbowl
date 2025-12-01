'use client';

import React, { useState } from 'react';
import { Button, Input, Avatar, message, Space, Tooltip } from 'antd';
import { MessageOutlined, UserOutlined, DeleteOutlined, LikeOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface Comment {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean;
}

interface CommentSectionProps {
  articleId: string;
  currentUser?: {
    username: string;
    avatar?: string;
  } | null;
  isLoggedIn: boolean;
}

export default function CommentSection({ articleId, currentUser, isLoggedIn }: CommentSectionProps) {
  // 评论数据（示例数据，后续可从后端获取）
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      author: '李四',
      avatar: undefined,
      content: '写得非常好！学到了很多东西，感谢分享～',
      timestamp: '2024-01-20 14:30',
      likes: 5,
      isLiked: false,
    },
    {
      id: '2',
      author: '王五',
      avatar: undefined,
      content: '赞同！这篇文章解决了我的问题。',
      timestamp: '2024-01-20 15:45',
      likes: 3,
      isLiked: false,
    },
  ]);

  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 发表评论
  const handleSubmitComment = async () => {
    if (!isLoggedIn) {
      message.warning('请先登录后再评论');
      return;
    }

    if (!commentText.trim()) {
      message.warning('评论内容不能为空');
      return;
    }

    if (commentText.length > 500) {
      message.warning('评论内容不能超过500字');
      return;
    }

    setIsSubmitting(true);

    try {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 500));

      const newComment: Comment = {
        id: Date.now().toString(),
        author: currentUser?.username || '匿名用户',
        avatar: currentUser?.avatar,
        content: commentText.trim(),
        timestamp: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        likes: 0,
        isLiked: false,
      };

      setComments([newComment, ...comments]);
      setCommentText('');
      message.success('评论发表成功！');
    } catch (error) {
      message.error('评论发表失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 点赞评论
  const handleLikeComment = (commentId: string) => {
    if (!isLoggedIn) {
      message.warning('请先登录');
      return;
    }

    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
          isLiked: !comment.isLiked,
        };
      }
      return comment;
    }));
  };

  // 删除评论
  const handleDeleteComment = (commentId: string) => {
    setComments(comments.filter(comment => comment.id !== commentId));
    message.success('评论已删除');
  };

  return (
    <div id="comment-section" style={{ marginTop: '32px' }}>
      <h3 style={{ 
        fontSize: '20px', 
        fontWeight: 600,
        marginBottom: '24px',
      }}>
        评论区（{comments.length}）
      </h3>

      {/* 发表评论表单 */}
      <div style={{
        marginBottom: '32px',
        padding: '20px',
        background: '#fafafa',
        borderRadius: '8px',
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '12px',
          marginBottom: '12px',
        }}>
          <Avatar 
            size={40} 
            icon={<UserOutlined />}
            src={currentUser?.avatar}
            style={{ flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <TextArea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isLoggedIn ? "写下你的评论..." : "登录后即可评论"}
                autoSize={{ minRows: 3, maxRows: 8 }}
                maxLength={500}
                disabled={!isLoggedIn}
                style={{
                  fontSize: '14px',
                  resize: 'none',
                  paddingBottom: '30px', // 为底部字数统计留出空间
                }}
              />
              {/* 字数统计显示在输入框内部右下角 */}
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '12px',
                fontSize: '12px',
                color: commentText.length > 450 ? '#ff4d4f' : '#999',
                pointerEvents: 'none',
              }}>
                {commentText.length}/500
              </div>
            </div>
            <div style={{ 
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '12px', color: '#999' }}>
                {isLoggedIn ? `当前用户：${currentUser?.username || '匿名用户'}` : '请先登录'}
              </span>
              <Button 
                type="primary"
                onClick={handleSubmitComment}
                loading={isSubmitting}
                disabled={!isLoggedIn || !commentText.trim()}
              >
                发表评论
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 评论列表 */}
      {comments.length === 0 ? (
        <div style={{
          padding: '60px 40px',
          textAlign: 'center',
          color: '#999',
          background: '#fafafa',
          borderRadius: '8px',
        }}>
          <MessageOutlined style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }} />
          <div style={{ fontSize: '16px' }}>暂无评论，来抢沙发吧~</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                padding: '20px',
                background: 'white',
                border: '1px solid #e8e8e8',
                borderRadius: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', gap: '12px' }}>
                {/* 头像 */}
                <Avatar 
                  size={40} 
                  icon={<UserOutlined />}
                  src={comment.avatar}
                  style={{ flexShrink: 0 }}
                />

                {/* 评论内容 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 用户名和时间 */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}>
                    <div>
                      <span style={{ 
                        fontWeight: 600,
                        fontSize: '14px',
                        color: '#333',
                      }}>
                        {comment.author}
                      </span>
                      <span style={{ 
                        marginLeft: '12px',
                        fontSize: '12px',
                        color: '#999',
                      }}>
                        {comment.timestamp}
                      </span>
                    </div>

                    {/* 删除按钮（只有自己的评论才能删除） */}
                    {isLoggedIn && currentUser?.username === comment.author && (
                      <Tooltip title="删除评论">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteComment(comment.id)}
                        />
                      </Tooltip>
                    )}
                  </div>

                  {/* 评论正文 */}
                  <div style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#333',
                    marginBottom: '12px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {comment.content}
                  </div>

                  {/* 点赞按钮 */}
                  <div>
                    <Button
                      type="text"
                      size="small"
                      icon={<LikeOutlined />}
                      onClick={() => handleLikeComment(comment.id)}
                      style={{
                        color: comment.isLiked ? '#1890ff' : '#666',
                      }}
                    >
                      {comment.likes > 0 ? comment.likes : '点赞'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

