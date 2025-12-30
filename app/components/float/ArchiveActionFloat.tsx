'use client';

import React, { useState, useEffect } from 'react';
import { FloatButton, Modal, Form, Input, Select, message, Button } from 'antd';
import { PlusOutlined, EditOutlined, BookOutlined, FileTextOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';

const { TextArea } = Input;
const { Option } = Select;

interface ArchiveActionFloatProps {
  onDiarySuccess?: () => void;
}

/**
 * 归档页面操作悬浮按钮组
 * 集成发布文章、写日志、查看归档等功能
 */
export default function ArchiveActionFloat({ onDiarySuccess }: ArchiveActionFloatProps) {
  const router = useRouter();
  const { user, canModerate } = useAuth();
  const [diaryModalOpen, setDiaryModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diaryForm] = Form.useForm();

  // 权限检查：只允许管理员和版主看到此按钮
  if (!canModerate()) {
    return null;
  }

  // 检测触摸设备
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    setIsTouch(Boolean(touch));
  }, []);

  // 根据设备类型决定是否显示tooltip
  const tooltipProp = (title: string) => isTouch ? undefined : { title, placement: 'left' as const };

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

  // 跳转到发布文章页面
  const handlePublishArticle = () => {
    router.push('/publish-article');
  };

  // 提交日志表单
  const handleDiarySubmit = async (values: any) => {
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

      // 构建日志内容块（只有一个文本块，内容包含状态、地点和正文）
      const blocks: any[] = [];

      // 将所有日志信息放入一个文本块
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
        access_level: 2, // 日记内容为会员级别
      });

      // 调用文章 API 创建日志类型文章
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title,
          excerpt: diaryContent, // 完整的日志内容（包含元信息）存储在 excerpt 字段
          blocks: blocks,
          tags: [],
          status: 'published',
          type: 'diary', // 指定为日志类型
          category_id: 'cat_diary', // 自动归类到日志分类
          max_access_level: 2, // 日记文章为会员级别
        }),
      });

      const data = await response.json();

      if (data.success) {
        message.success('日志发布成功！');
        diaryForm.resetFields();
        setDiaryModalOpen(false);
        onDiarySuccess?.();
      } else {
        message.error(data.error || '发布失败');
      }
    } catch (error: any) {
      console.error('发布日志失败:', error);
      message.error('发布失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FloatButton.Group
        trigger="click"
        type="primary"
        style={{ right: 24, bottom: 24 }}
        icon={<PlusOutlined />}
        tooltip={tooltipProp("操作菜单")}
      >
        {/* 写文章按钮 */}
        <FloatButton
          icon={<FileTextOutlined />}
          tooltip={tooltipProp("写文章")}
          onClick={handlePublishArticle}
        />

        {/* 写日志按钮 */}
        <FloatButton
          icon={<EditOutlined />}
          tooltip={tooltipProp("写日志")}
          onClick={() => setDiaryModalOpen(true)}
        />

        {/* 返回顶部按钮 */}
        <FloatButton.BackTop
          tooltip={tooltipProp("返回顶部")}
          visibilityHeight={100}
        />
      </FloatButton.Group>

      {/* 日志发布弹窗 */}
      <Modal
        title={`📝 写日志 - ${generateDateTitle()}`}
        open={diaryModalOpen}
        onCancel={() => {
          setDiaryModalOpen(false);
          diaryForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={diaryForm}
          layout="vertical"
          onFinish={handleDiarySubmit}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="content"
            label="日志内容"
            rules={[{ required: true, message: '请输入日志内容' }]}
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
                setDiaryModalOpen(false);
                diaryForm.resetFields();
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
