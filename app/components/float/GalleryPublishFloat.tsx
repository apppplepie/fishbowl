'use client';

import React, { useState, useEffect } from 'react';
import { FloatButton, Modal, message } from '@/app/components/ui';
import { Form, Input, Upload, Button, Segmented } from 'antd'; // 暂时保留，后续实现
import { Plus, CloudUpload } from 'lucide-react';
import type { UploadFile, UploadProps } from 'antd';
import { useAuth } from '@/app/hooks/useAuth';
import CategoryTreeSelect from '../CategoryTreeSelect';
import TagInput from '../TagInput';
import { ACCESS_LEVELS } from '@/app/types/block';
import { apiPostJson } from '@/lib/apiClient';
import { uploadFileWithProgress } from '@/lib/uploadClient';
import { getNextOrderIndex } from '@/app/utils/orderIndex';

interface GalleryPublishFloatProps {
  onSuccess?: () => void;
}

/**
 * 照片墙发布悬浮按钮
 * 点击后弹出表单，创建绘画类型文章和图组
 */
export default function GalleryPublishFloat({ onSuccess }: GalleryPublishFloatProps) {
  const { user, canModerate } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [accessLevel, setAccessLevel] = useState<number>(2); // 默认General级别

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

  // 处理图片上传
  const handleUploadChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  // 自定义上传（不自动上传，只预览）
  const customRequest = (options: any) => {
    const { onSuccess } = options;
    setTimeout(() => {
      onSuccess?.('ok');
    }, 0);
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    if (fileList.length === 0) {
      message.error('请至少上传一张图片！');
      return;
    }
  
    setLoading(true);
  
    try {
      const imageResults: { url: string; mediaId?: string }[] = [];

      // 总体进度提示
      message.loading({ content: `正在上传图片 0/${fileList.length}`, key: 'gallery_upload', duration: 0 });

      // helper: update a file's percent in fileList so AntD Upload shows progress
      const updateFileProgress = (idx: number, percent: number, status?: UploadFile['status']) => {
        setFileList(prev => {
          const clone = [...prev];
          const f = { ...(clone[idx] || {}) } as UploadFile;
          f.percent = percent;
          if (status) f.status = status;
          clone[idx] = f;
          return clone;
        });
      };

      // 逐个上传（简单可靠）。若要并发，可改为并发池（例如 3 个并发）
      for (let i = 0; i < fileList.length; i++) {
        const fileItem = fileList[i];
        if (!fileItem?.originFileObj) {
          continue;
        }

        // 标记开始上传（UI）
        updateFileProgress(i, 0, 'uploading');
        message.loading({ content: `上传图片 ${i + 1}/${fileList.length}...`, key: 'gallery_upload', duration: 0 });

        // 执行上传（会在回调中更新进度，token 在 HttpOnly cookie 中）
        const result = await uploadFileWithProgress(
          fileItem.originFileObj as File,
          (percent: number) => {
            updateFileProgress(i, percent, 'uploading');
          }
        );
  
        if (result && result.success) {
          imageResults.push({ url: result.url!, mediaId: result.media_id });
          updateFileProgress(i, 100, 'done');
        } else {
          // 上传失败：标记并抛错，退出（也可以选择跳过继续上传其他图片）
          updateFileProgress(i, 0, 'error');
          throw new Error((typeof result.error === 'string' ? result.error : null) || '上传失败');
        }
      }
  
      message.success({ content: `上传完成，共 ${imageResults.length} 张`, key: 'gallery_upload' });
  
      // 构造 blocks（含 mediaId 供后端写入 blocks.media_id）
      const blocks: any[] = [];
      if (values.description) {
        blocks.push({
          type: 'text',
          content: values.description,
          access_level: accessLevel,
        });
      }
      imageResults.forEach((item) => {
        blocks.push({
          type: 'image',
          imageUrl: item.url,
          mediaId: item.mediaId,
          description: '',
          access_level: accessLevel,
        });
      });
  
      // 设置默认分类和计算排序
      const categoryId = values.category_id || 'cat_drawing';

      // 计算 order_index：找到当前分类下最大的 order 值 + 1
      let orderInCategory = 0;
      try {
        orderInCategory = await getNextOrderIndex(categoryId);
      } catch (error) {
        console.warn('计算排序失败，使用默认顺序:', error);
        // 继续发布，后端可能会自动处理
      }
  
      // 创建文章
      const data = await apiPostJson<{ success: boolean; error?: string }>('/api/articles', {
        title: values.title,
        excerpt: values.description || '一组绘画作品',
        blocks,
        tags: values.tags || [],
        status: 'published',
        type: 'drawing',
        category_id: categoryId,
        order_index: orderInCategory,
        max_access_level: accessLevel,
      });

      if (data.success) {
        message.success('发布成功！');
        form.resetFields();
        setFileList([]);
        setOpen(false);
        onSuccess?.();
      } else {
        message.error(data.error || '发布失败');
      }
    } catch (error: any) {
      console.error('发布失败:', error);
      message.destroy();
      // 401错误会被apiClient自动处理，这里只处理其他错误
      if (!error.message?.includes('401')) {
        message.error('发布失败: ' + (error?.message || String(error)));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FloatButton
        icon={<Plus size={20} />}
        type="primary"
        style={{ right: 24, bottom: 40 }}
        onClick={() => setOpen(true)}
        tooltip={tooltipProp("发布到照片墙")}
      />

      <Modal
        title="发布绘画作品"
        open={open}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
          setFileList([]);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="title"
            // label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="标题" />
          </Form.Item>

          <Form.Item
            name="description"
            // label="描述"
          >
            <Input.TextArea
              placeholder="描述"
              rows={4}
            />
          </Form.Item>

          <Form.Item>
            <div style={{
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              backgroundColor: '#fafafa'
            }}>
              <Segmented<string>
                size="large"
                options={ACCESS_LEVELS.map(level => ({
                  label: (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 500
                    }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: level.color,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        border: '2px solid rgba(255,255,255,0.8)'
                      }} />
                      {level.label}
                    </div>
                  ),
                  value: level.label,
                  style: {
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    border: `2px solid ${level.color}`,
                    color: level.color,
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(4px)',
                    margin: '2px'
                  }
                }))}
                value={ACCESS_LEVELS.find(level => level.value === accessLevel)?.label || 'G'}
                onChange={(value) => {
                  const level = ACCESS_LEVELS.find(l => l.label === value);
                  if (level) setAccessLevel(level.value);
                }}
                style={{
                  backgroundColor: 'transparent',
                  padding: '4px'
                }}
              />
              <div style={{
                marginTop: '12px',
                padding: '8px',
                backgroundColor: 'white',
                borderRadius: '6px',
                border: `2px solid ${ACCESS_LEVELS.find(level => level.value === accessLevel)?.color || '#1890ff'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: ACCESS_LEVELS.find(level => level.value === accessLevel)?.color || '#1890ff',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
                  border: '2px solid rgba(255,255,255,0.9)'
                }} />
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: ACCESS_LEVELS.find(level => level.value === accessLevel)?.color || '#1890ff'
                  }}>
                    {ACCESS_LEVELS.find(level => level.value === accessLevel)?.label}级权限
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#666',
                    marginTop: '2px'
                  }}>
                    {ACCESS_LEVELS.find(level => level.value === accessLevel)?.color === '#52c41a' ? '游客可查看' :
                     ACCESS_LEVELS.find(level => level.value === accessLevel)?.color === '#1890ff' ? '游客可查看（含个人日常）' :
                     ACCESS_LEVELS.find(level => level.value === accessLevel)?.color === '#faad14' ? '仅注册用户可查看' :
                     ACCESS_LEVELS.find(level => level.value === accessLevel)?.color === '#f5222d' ? '仅成人验证用户可查看' : '仅管理员可查看'}
                  </div>
                </div>
              </div>
            </div>
          </Form.Item>


          

          <Form.Item
            name="category_id"
          >
            <CategoryTreeSelect 
              placeholder="选择分类（可选，默认：绘画作品）" 
              rootCategoryId="cat_drawing"
            />
          </Form.Item>

          <Form.Item
            name="tags"
          >
            <TagInput placeholder="输入标签，按空格或回车添加" maxTags={10} />
          </Form.Item>

          <Form.Item
            required
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={handleUploadChange}
              customRequest={customRequest}
              accept="image/*"
              multiple
              beforeUpload={(file) => {
                const isImage = file.type.startsWith('image/');
                if (!isImage) {
                  message.error('只能上传图片文件！');
                  return false;
                }
                const isLt10M = file.size / 1024 / 1024 < 10;
                if (!isLt10M) {
                  message.error('图片大小不能超过 10MB！');
                  return false;
                }
                return true;
              }}
            >
              {fileList.length < 10 && (
                <div>
                  <CloudUpload size={24} />
                  <div style={{ marginTop: 8 }}>上传图片</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button 
              onClick={() => {
                setOpen(false);
                form.resetFields();
                setFileList([]);
              }}
              style={{ marginRight: 8 }}
            >
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              发布
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// 辅助函数：将文件转换为 base64
function getBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

