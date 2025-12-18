'use client';

import React, { useState } from 'react';
import { Modal, Input, message, Button } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuth } from '@/app/hooks/useAuth';

interface DeleteBookModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  bookId: string;
  bookTitle: string;
}

/**
 * 删除书籍确认对话框
 * 需要输入书名确认，并且需要管理员权限
 */
export default function DeleteBookModal({
  open,
  onCancel,
  onSuccess,
  bookId,
  bookTitle
}: DeleteBookModalProps) {
  const { user } = useAuth();
  const [confirmTitle, setConfirmTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // 检查是否为管理员
  const isAdmin = user?.role === 'admin';

  const handleDelete = async () => {
    if (!isAdmin) {
      message.error('只有管理员才能删除书籍');
      return;
    }

    if (confirmTitle.trim() !== bookTitle.trim()) {
      message.error('书名输入不正确，请重新输入');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('请先登录');
        return;
      }

      const response = await fetch(`/api/categories/${bookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        message.success('书籍删除成功');
        onSuccess?.();
        onCancel();
      } else {
        message.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除书籍失败:', error);
      message.error('删除失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setConfirmTitle('');
    onCancel();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DeleteOutlined style={{ color: '#ff4d4f' }} />
          删除书籍
        </div>
      }
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="delete"
          type="primary"
          danger
          loading={loading}
          disabled={!isAdmin || confirmTitle.trim() !== bookTitle.trim()}
          onClick={handleDelete}
        >
          删除书籍
        </Button>
      ]}
      maskClosable={false}
    >
      <div style={{ padding: '16px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#fff2f0',
          border: '1px solid #ffccc7',
          borderRadius: '6px'
        }}>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />
          <div>
            <div style={{ fontWeight: 500, color: '#d4380d', marginBottom: '4px' }}>
              危险操作：删除书籍
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>
              此操作将删除书籍 "{bookTitle}" 及其所有子章节和文章，但不会删除具体的文章内容块。
            </div>
          </div>
        </div>

        {!isAdmin && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '6px',
            marginBottom: '16px',
            color: '#52c41a'
          }}>
            <strong>权限不足：</strong>只有管理员才能删除书籍
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 500,
            color: '#1a1a1a'
          }}>
            请输入书名确认删除：
          </label>
          <Input
            value={confirmTitle}
            onChange={(e) => setConfirmTitle(e.target.value)}
            placeholder={`输入 "${bookTitle}" 确认删除`}
            disabled={!isAdmin}
            onPressEnter={isAdmin && confirmTitle.trim() === bookTitle.trim() ? handleDelete : undefined}
          />
          <div style={{
            marginTop: '8px',
            fontSize: '12px',
            color: confirmTitle.trim() === bookTitle.trim() ? '#52c41a' : '#999'
          }}>
            {confirmTitle.trim() === bookTitle.trim() ? '✓ 书名匹配' : '请输入完整的书名以确认删除'}
          </div>
        </div>
      </div>
    </Modal>
  );
}