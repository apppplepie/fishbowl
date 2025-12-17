'use client';

import React, { useState } from 'react';
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
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [accessLevel, setAccessLevel] = useState<number>(2); // 默认General级别

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
      // 上传图片到服务器
      const imageUrls: string[] = [];
      
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.originFileObj) {
          message.loading(`上传图片 ${i + 1}/${fileList.length}...`, 0);
          
          // 创建 FormData
          const formData = new FormData();
          formData.append('file', file.originFileObj);

          // 上传到服务器
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const uploadData = await uploadResponse.json();

          if (uploadData.success) {
            imageUrls.push(uploadData.url);
            console.log(`图片 ${i + 1} 上传成功:`, uploadData.url);
          } else {
            throw new Error(uploadData.error || '上传失败');
          }
        }
      }

      message.destroy(); // 清除加载提示
      console.log('总共上传了', imageUrls.length, '张图片');

      // 构建文章块（第一个是文字块，后面是图片块）
      const blocks: any[] = [];
      
      // 如果有描述，创建文字块放在第一个
      if (values.description) {
        blocks.push({
          type: 'text',
          content: values.description,
          access_level: accessLevel, // 使用选中的访问等级
        });
      }

      // 添加图片块
      imageUrls.forEach((url, index) => {
        blocks.push({
          type: 'image',
          imageUrl: url,
          description: '',
          access_level: accessLevel, // 使用选中的访问等级
        });
        console.log(`图片块 ${index + 1} 添加成功，URL:`, url);
      });

      console.log('构建的 blocks:', blocks.length, '个');

      // 获取 Token
      const token = localStorage.getItem('token');
      
      if (!token) {
        message.error('请先登录');
        return;
      }

      // 调用文章 API 创建绘画类型文章
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: values.title,
          excerpt: values.description || '一组绘画作品',
          blocks: blocks,
          tags: values.tags || [],
          status: 'published',
          type: 'drawing', // 明确指定为绘画类型
          category_id: values.category_id || 'cat_drawing', // 未选择时默认发到绘画作品分类
          max_access_level: accessLevel, // 使用选中的访问等级
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
      message.destroy(); // 清除加载提示
      message.error('发布失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        style={{ right: 24, bottom: 24 }}
        onClick={() => setOpen(true)}
        tooltip={{ title: "发布到照片墙", placement: "left" }}
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
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="为你的作品起个名字" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea
              placeholder="描述你的创作过程或想法（会作为文字块显示在文章开头）..."
              rows={4}
            />
          </Form.Item>

          <Form.Item
            label="访问等级"
            tooltip={{ title: "设置作品的访问权限，所有图片和文字都将使用此等级", placement: "left" }}
          >
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
            label="分类"
            tooltip={{ title: "选择绘画作品的子分类，未选择时默认发布到【绘画作品】", placement: "left" }}
          >
            <CategoryTreeSelect 
              placeholder="选择分类（可选，默认：绘画作品）" 
              rootCategoryId="cat_drawing"
            />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
            tooltip={{ title: "添加标签可以帮助读者更好地找到你的作品", placement: "left" }}
          >
            <TagInput placeholder="输入标签，按空格或回车添加" maxTags={10} />
          </Form.Item>

          <Form.Item
            label="上传图片"
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
            <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
              建议按绘画过程顺序上传（草图 → 线稿 → 上色 → 成图），最多 10 张
            </div>
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

