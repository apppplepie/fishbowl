import React, { useState, useEffect } from 'react';
import { FloatButton, Modal, message } from '@/app/components/ui';
import { Input, Button } from '@/app/components/ui/compat'; // 暂时保留，后续实现
import { Spin } from '@/app/components/ui';
import { Plus, FileText, Trash2, Book } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import ChapterManageFloat from './ChapterManageFloat';
import { useAuth } from '@/app/hooks/useAuth';
import { apiGetJson, apiDeleteJson } from '@/lib/apiClient';

interface BookPublishFloatProps {
  onChapterManageSuccess?: () => void; // 章节管理成功后的回调
}

/**
 * 书籍/章节发布悬浮按钮
 * 在bookcase页面显示，根据当前category参数决定显示书籍发布或章节发布按钮
 */
export default function BookPublishFloat({ onChapterManageSuccess }: BookPublishFloatProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, canModerate } = useAuth();
  const categoryFromUrl = searchParams.get('category');

  // 检测触摸设备 - 必须在权限检查之前调用hooks，确保每次渲染hooks顺序一致
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    setIsTouch(Boolean(touch));
  }, []);

  // 根据设备类型决定是否显示tooltip
  const tooltipProp = (title: string) => isTouch ? undefined : { title, placement: 'left' as const };

  // 权限检查：只允许管理员和版主看到此按钮
  if (!canModerate()) {
    return null;
  }

  // 删除书籍相关状态
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [deletingBookId, setDeletingBookId] = useState<string>('');
  const [deletingBookTitle, setDeletingBookTitle] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bookSelectModalVisible, setBookSelectModalVisible] = useState(false);
  const [booksList, setBooksList] = useState<Array<{ id: string; name: string }>>([]);
  const [selectBookLoading, setSelectBookLoading] = useState(false);

  // 判断是否在具体分类目录下
  const isInSpecificCategory = categoryFromUrl && categoryFromUrl !== 'cat_bookcase';

  // 检查是否为管理员（删除书籍功能仅管理员可用）
  const isAdmin = user?.role === 'admin';

  // 处理删除书籍
  const handleDeleteBookClick = async () => {
    // 如果在根目录，显示书籍选择对话框
    if (!categoryFromUrl || categoryFromUrl === 'cat_bookcase') {
      setBookSelectModalVisible(true);
      loadBooksList();
      return;
    }

    try {
      // 获取书籍信息
      const result = await apiGetJson<{ success: boolean; category?: { name: string } }>(`/api/categories/${categoryFromUrl}`);

      if (result.success && result.category) {
        setDeletingBookId(categoryFromUrl);
        setDeletingBookTitle(result.category.name);
        setDeleteModalVisible(true);
      } else {
        message.error('获取书籍信息失败');
      }
    } catch (error) {
      console.error('获取书籍信息失败:', error);
      message.error('获取书籍信息失败');
    }
  };

  // 加载书籍列表
  const loadBooksList = async () => {
    setSelectBookLoading(true);
    try {
      const result = await apiGetJson<{ success: boolean; books?: any[] }>('/api/categories/book-previews?parentId=cat_bookcase');

      if (result.success && result.books) {
        const books = result.books.map((book: any) => ({
          id: book.categoryId,
          name: book.name || book.title
        }));
        setBooksList(books);
      } else {
        message.error('获取书籍列表失败');
        setBooksList([]);
      }
    } catch (error) {
      console.error('获取书籍列表失败:', error);
      message.error('获取书籍列表失败');
      setBooksList([]);
    } finally {
      setSelectBookLoading(false);
    }
  };

  // 选择要删除的书籍
  const handleSelectBook = (bookId: string, bookName: string) => {
    setDeletingBookId(bookId);
    setDeletingBookTitle(bookName);
    setBookSelectModalVisible(false);
    setDeleteModalVisible(true);
  };

  const handleDeleteBook = async () => {
    if (!isAdmin) {
      message.error('只有管理员才能删除书籍');
      return;
    }

    if (confirmTitle.trim() !== deletingBookTitle) {
      message.error('书名输入不正确，请重新输入');
      return;
    }

    setDeleteLoading(true);

    try {
      const result = await apiDeleteJson<{ success: boolean; error?: string }>(`/api/categories/${deletingBookId}`);

      if (result.success) {
        message.success('书籍删除成功');
        setDeleteModalVisible(false);
        setConfirmTitle('');
        // 跳转回书橱主页
        router.push('/bookcase');
      } else {
        message.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除书籍失败:', error);
      message.error('删除失败，请重试');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isInSpecificCategory) {
    // 在具体分类目录下，显示发布章节、章节管理和删除书籍按钮
    return (
      <>
        <FloatButton.Group
          trigger="click"
          type="primary"
          style={{
            right: 24,
            bottom: 40,
          }}
          icon={<Plus size={20} />}
          tooltip={tooltipProp("操作菜单")}
        >
          {/* 发布章节按钮 */}
          <FloatButton
            icon={<FileText size={20} />}
            tooltip={tooltipProp("发布章节")}
            onClick={() => router.push(`/publish-chapter?category=${categoryFromUrl}`)}
          />
        </FloatButton.Group>

        {/* 删除书籍确认对话框 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={16} style={{ color: '#ff4d4f' }} />
              删除书籍
            </div>
          }
          open={deleteModalVisible}
          onCancel={() => {
            setDeleteModalVisible(false);
            setConfirmTitle('');
          }}
          footer={[
            <Button key="cancel" onClick={() => {
              setDeleteModalVisible(false);
              setConfirmTitle('');
            }}>
              取消
            </Button>,
            <Button
              key="delete"
              type="primary"
              danger
              loading={deleteLoading}
              disabled={!isAdmin || confirmTitle.trim() !== deletingBookTitle}
              onClick={handleDeleteBook}
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
              <Trash2 size={16} style={{ color: '#ff4d4f' }} />
              <div>
                <div style={{ fontWeight: 500, color: '#d4380d', marginBottom: '4px' }}>
                  危险操作：删除书籍
                </div>
                <div style={{ color: '#666', fontSize: '14px' }}>
                  此操作将删除书籍及其所有子章节和文章，但不会删除具体的文章内容块。
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
                placeholder={`输入 "${deletingBookTitle}" 确认删除`}
                disabled={!isAdmin}
                onPressEnter={isAdmin && confirmTitle.trim() === deletingBookTitle ? handleDeleteBook : undefined}
              />
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: confirmTitle.trim() === deletingBookTitle ? '#52c41a' : '#999'
              }}>
                {confirmTitle.trim() === deletingBookTitle ? '✓ 书名匹配' : '请输入完整的书名以确认删除'}
              </div>
            </div>
          </div>
        </Modal>
      </>
    );
  } else {
    // 在书橱根目录，显示发布新书、章节管理和删除书籍按钮
    return (
      <>
        <FloatButton.Group
          trigger="click"
          type="primary"
          style={{
            right: 24,
            bottom: 40,
          }}
          icon={<Book size={20} />}
          tooltip={tooltipProp("操作菜单")}
        >
          {/* 发布新书按钮 */}
          <FloatButton
            icon={<Book size={20} />}
            tooltip={tooltipProp("发布新书")}
            onClick={() => router.push('/publish-book')}
          />

          {/* 章节管理按钮 */}
          <ChapterManageFloat categoryId={categoryFromUrl || 'cat_bookcase'} rootDepth={1} onSuccess={onChapterManageSuccess} />

          {/* 删除书籍按钮 - 仅管理员可见 */}
          {isAdmin && (
            <FloatButton
              icon={<Trash2 size={20} />}
              tooltip={tooltipProp("删除书籍")}
              onClick={handleDeleteBookClick}
              style={{ backgroundColor: '#ff4d4f', color: 'white' }}
            />
          )}
        </FloatButton.Group>

        {/* 删除书籍确认对话框 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={16} style={{ color: '#ff4d4f' }} />
              删除书籍
            </div>
          }
          open={deleteModalVisible}
          onCancel={() => {
            setDeleteModalVisible(false);
            setConfirmTitle('');
          }}
          footer={[
            <Button key="cancel" onClick={() => {
              setDeleteModalVisible(false);
              setConfirmTitle('');
            }}>
              取消
            </Button>,
            <Button
              key="delete"
              type="primary"
              danger
              loading={deleteLoading}
              disabled={!isAdmin || confirmTitle.trim() !== deletingBookTitle}
              onClick={handleDeleteBook}
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
              <Trash2 size={16} style={{ color: '#ff4d4f' }} />
              <div>
                <div style={{ fontWeight: 500, color: '#d4380d', marginBottom: '4px' }}>
                  危险操作：删除书籍
                </div>
                <div style={{ color: '#666', fontSize: '14px' }}>
                  此操作将删除书籍及其所有子章节和文章，但不会删除具体的文章内容块。
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
                placeholder={`输入 "${deletingBookTitle}" 确认删除`}
                disabled={!isAdmin}
                onPressEnter={isAdmin && confirmTitle.trim() === deletingBookTitle ? handleDeleteBook : undefined}
              />
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: confirmTitle.trim() === deletingBookTitle ? '#52c41a' : '#999'
              }}>
                {confirmTitle.trim() === deletingBookTitle ? '✓ 书名匹配' : '请输入完整的书名以确认删除'}
              </div>
            </div>
          </div>
        </Modal>

        {/* 书籍选择对话框 - 在根目录删除书籍时使用 */}
        <Modal
          title="选择要删除的书籍"
          open={bookSelectModalVisible}
          onCancel={() => {
            setBookSelectModalVisible(false);
            setBooksList([]);
          }}
          footer={[
            <Button key="cancel" onClick={() => {
              setBookSelectModalVisible(false);
              setBooksList([]);
            }}>
              取消
            </Button>
          ]}
          maskClosable={false}
        >
          <div style={{ padding: '16px 0', maxHeight: '400px', overflowY: 'auto' }}>
            {selectBookLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="middle" />
                <div style={{ marginTop: '16px', color: '#666' }}>加载书籍列表...</div>
              </div>
            ) : booksList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                暂无书籍
              </div>
            ) : (
              <div>
                {booksList.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => handleSelectBook(book.id, book.name)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#ff4d4f';
                      e.currentTarget.style.backgroundColor = '#fff2f0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d9d9d9';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ fontWeight: 500, color: '#1a1a1a' }}>
                      {book.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      </>
    );
  }
}
