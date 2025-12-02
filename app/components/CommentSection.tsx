'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Avatar, message, Space, Tooltip, Modal } from 'antd';
import { MessageOutlined, UserOutlined, DeleteOutlined, LikeOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { formatTimeToMinute } from '@/app/utils/timeFormat';

const { TextArea } = Input;

interface Comment {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  content: string;
  created_at: string;
  replies?: Comment[];
}

interface CommentSectionProps {
  articleId: string;
  currentUser?: {
    username: string;
    avatar?: string;
    role?: string;
  } | null;
  isLoggedIn: boolean;
  onCommentCountChange?: (count: number) => void;
}

export default function CommentSection({ articleId, currentUser, isLoggedIn, onCommentCountChange }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 加载评论列表
  useEffect(() => {
    loadComments();
  }, [articleId]);

  // 通知父组件评论数量变化
  useEffect(() => {
    if (onCommentCountChange) {
      onCommentCountChange(comments.length);
    }
  }, [comments.length, onCommentCountChange]);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/articles/${articleId}/comments`);
      const result = await response.json();

      if (result.success) {
        setComments(result.comments || []);
        // 通知父组件评论数量变化
        if (onCommentCountChange) {
          onCommentCountChange(result.comments?.length || 0);
        }
      } else {
        console.error('加载评论失败:', result.error);
      }
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/articles/${articleId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: commentText.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success('评论发表成功！');
        setCommentText('');
        // 重新加载评论列表
        await loadComments();
      } else {
        message.error(result.error || '评论发表失败');
      }
    } catch (error: any) {
      console.error('评论发表失败:', error);
      message.error('评论发表失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    Modal.confirm({
      title: '确认删除评论？',
      icon: <ExclamationCircleOutlined />,
      content: '删除后将无法恢复',
      okText: '确认删除',
      cancelText: '取消',
      okType: 'danger',
      async onOk() {
        try {
          const token = localStorage.getItem('token');
          
          const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const result = await response.json();

          if (result.success) {
            message.success('评论已删除');
            // 重新加载评论列表
            await loadComments();
          } else {
            message.error(result.error || '删除失败');
          }
        } catch (error: any) {
          console.error('删除评论失败:', error);
          message.error('删除失败，请重试');
        }
      },
    });
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
      {isLoading ? (
        <div style={{
          padding: '60px 40px',
          textAlign: 'center',
          color: '#999',
          background: '#fafafa',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '16px' }}>加载中...</div>
        </div>
      ) : comments.length === 0 ? (
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
                  src={comment.avatar_url}
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
                        {comment.display_name || comment.username}
                      </span>
                      <span style={{ 
                        marginLeft: '12px',
                        fontSize: '12px',
                        color: '#999',
                      }}>
                        {formatTimeToMinute(comment.created_at)}
                      </span>
                    </div>

                    {/* 删除按钮（评论作者、管理员或版主可删除） */}
                    {isLoggedIn && (
                      currentUser?.username === comment.username || 
                      currentUser?.role === 'admin' || 
                      currentUser?.role === 'moderator'
                    ) && (
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

