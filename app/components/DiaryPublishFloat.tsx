'use client';

import React, { useState } from 'react';
import { FloatButton, Modal, Form, Input, Select, message, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useAuth } from '@/app/hooks/useAuth';

const { TextArea } = Input;
const { Option } = Select;

interface DiaryPublishFloatProps {
  onSuccess?: () => void;
}

/**
 * 日记发布悬浮按钮
 * 点击后弹出表单，快速发布日记
 */
export default function DiaryPublishFloat({ onSuccess }: DiaryPublishFloatProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 生成日期标题（精确到分钟）
  const generateDateTitle = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}年${month}月${day}日 ${hour}:${minute}`;
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    setLoading(true);

    try {
      // 获取 Token
      const token = localStorage.getItem('token');
      
      if (!token) {
        message.error('请先登录');
        return;
      }

      // 生成日期标题
      const title = generateDateTitle();

      // 构建日记内容块（只有一个文本块，内容包含状态、地点和正文）
      const blocks: any[] = [];
      
      // 将所有日记信息放入一个文本块
      let diaryContent = values.content;
      
      // 添加元信息到内容前面（可选）
      const metadata: string[] = [];
      if (values.status) metadata.push(`状态：${values.status}`);
      if (values.location) metadata.push(`地点：${values.location}`);
      
      if (metadata.length > 0) {
        diaryContent = metadata.join(' | ') + '\n\n' + diaryContent;
      }

      blocks.push({
        type: 'text',
        content: diaryContent,
      });

      // 调用文章 API 创建日记类型文章
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title,
          excerpt: diaryContent, // 完整的日记内容（包含元信息）存储在 excerpt 字段
          blocks: blocks,
          tags: [],
          status: 'published',
          type: 'diary', // 指定为日记类型
          category_id: 'cat_diary', // 自动归类到日记分类
        }),
      });

      const data = await response.json();

      if (data.success) {
        message.success('日记发布成功！');
        form.resetFields();
        setOpen(false);
        onSuccess?.();
      } else {
        message.error(data.error || '发布失败');
      }
    } catch (error: any) {
      console.error('发布日记失败:', error);
      message.error('发布失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FloatButton
        icon={<EditOutlined />}
        type="primary"
        style={{ right: 24, bottom: 24 }}
        onClick={() => setOpen(true)}
        tooltip="写日记"
      />

      <Modal
        title={`📝 写日记 - ${generateDateTitle()}`}
        open={open}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
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
            name="content"
            label="日记内容"
            rules={[{ required: true, message: '请输入日记内容' }]}
          >
            <TextArea 
              rows={8} 
              placeholder="记录今天的心情..."
              showCount
              maxLength={500}
              style={{ fontSize: '16px', lineHeight: '1.8' }}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Form.Item
              name="status"
              label="状态"
              style={{ flex: 1 }}
            >
              <Select size="large" placeholder="选择状态" allowClear>
                <Option value="😊">😊 开心</Option>
                <Option value="😢">😢 难过</Option>
                <Option value="😍">😍 幸福</Option>
                <Option value="😤">😤 生气</Option>
                <Option value="😴">😴 困倦</Option>
                <Option value="🤔">🤔 思考</Option>
                <Option value="💪">💪 充满动力</Option>
                <Option value="😌">😌 平静</Option>
                <Option value="☀️">☀️ 晴天</Option>
                <Option value="⛅">⛅ 多云</Option>
                <Option value="☁️">☁️ 阴天</Option>
                <Option value="🌧️">🌧️ 雨天</Option>
                <Option value="⛈️">⛈️ 雷雨</Option>
                <Option value="🌨️">🌨️ 雪天</Option>
                <Option value="🌙">🌙 夜晚</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="location"
              label="地点"
              style={{ flex: 1 }}
            >
              <Input placeholder="在哪里？" size="large" prefix="📍" />
            </Form.Item>
          </div>


          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button 
              onClick={() => {
                setOpen(false);
                form.resetFields();
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

