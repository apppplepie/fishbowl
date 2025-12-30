'use client';

import React, { useState, useEffect } from 'react';
import { FloatButton, Modal, Form, Input, Upload, message, Button, Segmented } from 'antd';
import { PlusOutlined, CloudUploadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useAuth } from '@/app/hooks/useAuth';
import CategoryTreeSelect from '../CategoryTreeSelect';
import TagInput from '../TagInput';
import { ACCESS_LEVELS } from '@/app/types/block';

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
      const imageUrls: string[] = [];
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        message.error('请先登录');
        setLoading(false);
        return;
      }
  
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
  
        // 执行上传（会在回调中更新进度）
        const result = await uploadFileWithProgress(
          fileItem.originFileObj as File,
          token,
          (percent: number) => {
            updateFileProgress(i, percent, 'uploading');
          }
        );
  
        if (result && result.success) {
          imageUrls.push(result.url!);
          updateFileProgress(i, 100, 'done');
        } else {
          // 上传失败：标记并抛错，退出（也可以选择跳过继续上传其他图片）
          updateFileProgress(i, 0, 'error');
          throw new Error(result.error || '上传失败');
        }
      }
  
      message.success({ content: `上传完成，共 ${imageUrls.length} 张`, key: 'gallery_upload' });
  
      // 构造 blocks (保留你原来的逻辑)
      const blocks: any[] = [];
      if (values.description) {
        blocks.push({
          type: 'text',
          content: values.description,
          access_level: accessLevel,
        });
      }
      imageUrls.forEach((url) => {
        blocks.push({
          type: 'image',
          imageUrl: url,
          description: '',
          access_level: accessLevel,
        });
      });
  
      // 创建文章（原来的 API 调用）
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: values.title,
          excerpt: values.description || '一组绘画作品',
          blocks,
          tags: values.tags || [],
          status: 'published',
          type: 'drawing',
          category_id: values.category_id || 'cat_drawing',
          max_access_level: accessLevel,
        }),
      });
  
      const data = await response.json();
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
      message.error('发布失败: ' + (error?.message || String(error)));
    } finally {
      setLoading(false);
    }
  };
  

  // 放在组件内部（handleSubmit 同级）
function uploadFileWithProgress(file: File, token: string | null, onProgress: (p: number) => void) {
  return new Promise<{ success: boolean; url?: string; error?: any }>((resolve) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file);

    xhr.open('POST', '/api/upload', true);

    if (token) {
      // 不要设置 Content-Type 手动值，会破坏 multipart 边界
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (ev: ProgressEvent) => {
      if (ev.lengthComputable) {
        const percent = Math.round((ev.loaded / ev.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      try {
        const resp = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(resp);
        } else {
          resolve({ success: false, error: resp || xhr.statusText || 'upload error' });
        }
      } catch (e) {
        resolve({ success: false, error: 'parse error' });
      }
    };

    xhr.onerror = () => resolve({ success: false, error: 'network error' });
    xhr.send(form);
  });
}


  return (
    <>
      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        style={{ right: 24, bottom: 24 }}
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
                    {ACCESS_LEVELS.find(level => level.value === accessLevel)?.color === '#52c41a' ? '所有人都能查看' :
                     ACCESS_LEVELS.find(level => level.value === accessLevel)?.color === '#1890ff' ? '注册用户可查看' :
                     ACCESS_LEVELS.find(level => level.value === accessLevel)?.color === '#faad14' ? '仅会员用户可查看' :
                     ACCESS_LEVELS.find(level => level.value === accessLevel)?.color === '#f5222d' ? '仅成人内容用户可查看' : '仅管理员可查看'}
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
                  <CloudUploadOutlined />
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

