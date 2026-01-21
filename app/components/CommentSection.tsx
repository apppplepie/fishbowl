'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Space, Modal } from '@/app/components/ui';
import { message } from 'antd';
import { Avatar } from 'antd';
import { Tooltip } from 'antd'; 
import { MessageCircle, User, Trash2, Heart, AlertCircle } from 'lucide-react';
import { formatTimeToMinute } from '@/app/utils/timeFormat';
import { apiPostJson, apiDeleteJson, apiGetJson } from '@/lib/apiClient';
import { useResponsive } from '@/app/hooks/useResponsive';

const { TextArea } = Input;

interface Comment {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_base64?: string;
  content: string;
  created_at: string;
  notify_user_id?: string;
  notification_read?: number;
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
  const { isMobile } = useResponsive();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string; content: string } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // 加载评论列表（只在 articleId 真正变化时加载）
  const lastArticleIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    // 只有当 articleId 真正变化时才加载
    if (articleId && articleId !== lastArticleIdRef.current) {
      lastArticleIdRef.current = articleId;
      loadComments();
    }
  }, [articleId]);

  // 通知父组件评论数量变化
  useEffect(() => {
    if (onCommentCountChange) {
      onCommentCountChange(comments.length);
    }
  }, [comments.length, onCommentCountChange]);

  // 将评论树扁平化为列表
  const flattenComments = (comments: Comment[]): Comment[] => {
    const result: Comment[] = [];
    
    const flatten = (commentList: Comment[]) => {
      commentList.forEach(comment => {
        result.push(comment);
        if (comment.replies && comment.replies.length > 0) {
          flatten(comment.replies);
        }
      });
    };
    
    flatten(comments);
    return result;
  };

  const loadComments = async () => {
    // 如果 articleId 未设置，不加载
    if (!articleId) {
      return;
    }

    try {
      setIsLoading(true);
      const result = await apiGetJson<{ success: boolean; comments?: Comment[]; error?: string }>(`/api/articles/${articleId}/comments`);

      if (result.success) {
        const flatComments = flattenComments(result.comments || []);
        setComments(flatComments);
        if (onCommentCountChange) {
          onCommentCountChange(flatComments.length);
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

  // 点击回复按钮
  const handleReplyClick = (comment: Comment) => {
    if (!isLoggedIn) {
      message.warning('请先登录后再回复');
      return;
    }

    // 提取评论开头5个字
    const contentPreview = comment.content.length > 5 
      ? comment.content.substring(0, 5) + '...' 
      : comment.content;
    
    // 设置回复引用
    const replyPrefix = `@${comment.display_name || comment.username} "${contentPreview}" `;
    setCommentText(replyPrefix);
    setReplyingTo({
      id: comment.id,
      username: comment.display_name || comment.username,
      content: contentPreview,
    });

    // 聚焦到输入框
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(replyPrefix.length, replyPrefix.length);
      }
    }, 100);
  };

  // 取消回复
  const handleCancelReply = () => {
    setReplyingTo(null);
    setCommentText('');
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
      const result = await apiPostJson<{ success: boolean; error?: string }>(`/api/articles/${articleId}/comments`, {
        content: commentText.trim(),
        parent_id: replyingTo?.id || null, // 如果是回复，传入父评论 ID
      });

      if (result.success) {
        message.success(replyingTo ? '回复成功！' : '评论发表成功！');
        setCommentText('');
        setReplyingTo(null);
        // 重新加载评论列表
        await loadComments();
      } else {
        message.error(result.error || '评论发表失败');
      }
    } catch (error: any) {
      console.error('评论发表失败:', error);
      // 401错误会被apiClient自动处理，这里只处理其他错误
      if (!error.message?.includes('401')) {
        message.error('评论发表失败，请重试');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    setDeletingCommentId(commentId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingCommentId) return;
    
    try {
      const result = await apiDeleteJson<{ success: boolean; error?: string }>(`/api/comments/${deletingCommentId}`);

      if (result.success) {
        message.success('评论已删除');
        setDeleteModalOpen(false);
        setDeletingCommentId(null);
        // 重新加载评论列表
        await loadComments();
      } else {
        message.error(result.error || '删除失败');
      }
    } catch (error: any) {
      console.error('删除评论失败:', error);
      message.error('删除失败，请重试');
    }
  };

  return (
    <div id="comment-section" style={{ marginTop: '32px' }}>

      {/* 发表评论表单 */}
      <div style={{
        marginBottom: '32px',
        padding: '20px',
        borderRadius: '8px',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* 输入框和按钮行 */}
        <div style={{ width: '100%' }}>
          <div style={{ position: 'relative' }}>
            <TextArea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={isLoggedIn ? "写下你的评论..." : "登录后即可评论"}
              autoSize={{ minRows: 3, maxRows: 8 }}
              maxLength={500}
              disabled={!isLoggedIn}
              style={{
                width: '100%',
                fontSize: '14px',
                resize: 'none',
                paddingBottom: '30px', // 为底部字数统计留出空间
                boxSizing: 'border-box',
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
            <Space>
              {replyingTo && (
                <Button onClick={handleCancelReply}>
                  {isMobile ? '取消' : '取消回复'}
                </Button>
              )}
              <Button
                type="primary"
                onClick={handleSubmitComment}
                loading={isSubmitting}
                disabled={!isLoggedIn || !commentText.trim()}
              >
                {isMobile ? (replyingTo ? '发表' : '发表') : (replyingTo ? '发表回复' : '发表评论')}
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {/* 评论列表 */}
      {isLoading ? (
        <div style={{
          padding: '60px 40px',
          textAlign: 'center',
          borderRadius: '8px',
        }}>
          {/* <div style={{ fontSize: '16px' }}>加载中...</div> */}
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
                overflow: 'hidden',
                width: '100%',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* 用户名和时间行（包含头像） */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                {/* 头像 */}
                <Avatar 
                  size={40} 
                  icon={<User size={20} />}
                  src={comment.avatar_base64}
                  style={{ flexShrink: 0 }}
                />

                {/* 用户名和时间 */}
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}>
                  <div style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '14px',
                      color: '#333',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {comment.display_name || comment.username}
                    </div>
                    <span style={{
                      fontSize: '12px',
                      color: '#999',
                      display: 'block',
                      marginTop: '2px',
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
                    <div style={{ flexShrink: 0 }}>
                      <Tooltip title="删除评论">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<Trash2 size={16} />}
                          onClick={() => handleDeleteComment(comment.id)}
                        />
                      </Tooltip>
                    </div>
                  )}
                </div>
              </div>

              {/* 评论内容 */}
              <div style={{
                width: '100%',
                overflow: 'hidden'
              }}>

                  {/* 评论正文 */}
                  <div style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#333',
                    marginBottom: '12px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '100%',
                  }}>
                    {comment.content}
                  </div>

                  {/* 评论操作按钮 */}
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    paddingTop: '8px',
                  }}>
                    {/* 回复按钮 */}
                    {isLoggedIn && (
                      <Button
                        type="text"
                        size="small"
                        onClick={() => handleReplyClick(comment)}
                        style={{ 
                          padding: '0 4px',
                          height: 'auto',
                          fontSize: '13px',
                          color: '#666',
                        }}
                      >
                        回复
                      </Button>
                    )}
                  </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 删除确认弹窗 */}
      <Modal
        open={deleteModalOpen}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} style={{ color: '#ff4d4f' }} />
            <span>确认删除评论？</span>
          </div>
        }
        onOk={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeletingCommentId(null);
        }}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ style: { backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' } }}
      >
        <p>删除后将无法恢复</p>
      </Modal>
    </div>
  );
}

