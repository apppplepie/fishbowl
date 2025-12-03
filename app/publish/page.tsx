'use client';

import React, { useState } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Upload, 
  Select, 
  DatePicker, 
  Tabs,
  Card,
  Space,
  ColorPicker,
  InputNumber,
  message,
} from 'antd';
import { 
  PlusOutlined, 
  CameraOutlined,
  FileTextOutlined,
  BookOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import Header from '@/app/components/Header';
import PageLayout from '@/app/components/PageLayout';
import CategoryTreeSelect from '@/app/components/CategoryTreeSelect';
import type { UploadFile } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

/**
 * 发布页面
 * 支持发布6种类型的卡片
 */
export default function PublishPage() {
  const [activeTab, setActiveTab] = useState('image');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 表单提交（占位）
  const onFinish = (values: any) => {
    console.log('提交的数据:', values);
    message.success('发布成功！（仅为演示）');
  };

  // 图片上传变化
  const handleUploadChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
  };

  // Tab项配置
  const tabItems = [
    {
      key: 'image',
      label: (
        <span>
          <CameraOutlined /> 图片
        </span>
      ),
      children: (
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            tags: [],
          }}
        >
          <Form.Item
            label="上传图片"
            name="image"
            required
            tooltip="支持 JPG、PNG 格式"
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={handleUploadChange}
              beforeUpload={() => false}
              maxCount={1}
            >
              {fileList.length < 1 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item
            label="标题"
            name="title"
            tooltip="可选，为图片添加说明"
          >
            <Input placeholder="输入图片标题" size="large" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea 
              rows={3} 
              placeholder="描述这张图片..."
              showCount
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            label="标签"
            name="tags"
          >
            <Select
              mode="tags"
              placeholder="添加标签（按回车添加）"
              style={{ width: '100%' }}
            >
              <Option value="摄影">摄影</Option>
              <Option value="风景">风景</Option>
              <Option value="人像">人像</Option>
              <Option value="生活">生活</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="分类"
            name="category_id"
            tooltip="选择文章所属分类，支持新建分类"
          >
            <CategoryTreeSelect placeholder="选择分类（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large" icon={<PlusOutlined />}>
                发布图片
              </Button>
              <Button size="large">保存草稿</Button>
            </Space>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'article',
      label: (
        <span>
          <FileTextOutlined /> 文章
        </span>
      ),
      children: (
        <Form
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            label="文章标题"
            name="title"
            rules={[{ required: true, message: '请输入文章标题' }]}
          >
            <Input placeholder="输入文章标题" size="large" />
          </Form.Item>

          <Form.Item
            label="封面图"
            name="coverImage"
          >
            <Upload
              listType="picture-card"
              beforeUpload={() => false}
              maxCount={1}
            >
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传封面</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item
            label="文章摘要"
            name="excerpt"
            rules={[{ required: true, message: '请输入文章摘要' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="简短描述文章内容..."
              showCount
              maxLength={300}
            />
          </Form.Item>

          <Form.Item
            label="文章正文"
            name="content"
            rules={[{ required: true, message: '请输入文章内容' }]}
          >
            <TextArea 
              rows={12} 
              placeholder="开始写作..."
              showCount
            />
          </Form.Item>

          <Form.Item
            label="作者"
            name="author"
            initialValue="匿名"
          >
            <Input placeholder="作者名称" />
          </Form.Item>

          <Form.Item
            label="阅读时长（分钟）"
            name="readTime"
            initialValue={5}
          >
            <InputNumber min={1} max={120} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="标签"
            name="tags"
          >
            <Select
              mode="tags"
              placeholder="添加标签"
              style={{ width: '100%' }}
            >
              <Option value="技术">技术</Option>
              <Option value="生活">生活</Option>
              <Option value="随笔">随笔</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="分类"
            name="category_id"
            tooltip="选择文章所属分类，支持新建分类"
          >
            <CategoryTreeSelect placeholder="选择分类（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large" icon={<PlusOutlined />}>
                发布文章
              </Button>
              <Button size="large">保存草稿</Button>
            </Space>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'diary',
      label: (
        <span>
          <BookOutlined /> 日志
        </span>
      ),
      children: (
        <Form
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            label="日志内容"
            name="content"
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

          <Form.Item
            label="心情"
            name="mood"
            initialValue="😊"
          >
            <Select size="large" style={{ width: '200px' }}>
              <Option value="😊">😊 开心</Option>
              <Option value="😢">😢 难过</Option>
              <Option value="😍">😍 幸福</Option>
              <Option value="😤">😤 生气</Option>
              <Option value="😴">😴 困倦</Option>
              <Option value="🤔">🤔 思考</Option>
              <Option value="💪">💪 充满动力</Option>
              <Option value="😌">😌 平静</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="天气"
            name="weather"
          >
            <Select size="large" style={{ width: '200px' }} placeholder="选择天气">
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
            label="地点"
            name="location"
          >
            <Input placeholder="在哪里？" size="large" prefix="📍" />
          </Form.Item>

          <Form.Item
            label="分类"
            name="category_id"
            tooltip="选择文章所属分类，支持新建分类"
          >
            <CategoryTreeSelect placeholder="选择分类（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large" icon={<PlusOutlined />}>
                发布日志
              </Button>
              <Button size="large">保存草稿</Button>
            </Space>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'quote',
      label: (
        <span>
          <MessageOutlined /> 引言
        </span>
      ),
      children: (
        <Form
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            label="引言内容"
            name="quote"
            rules={[{ required: true, message: '请输入引言内容' }]}
          >
            <TextArea 
              rows={5} 
              placeholder="输入格言、名句或感悟..."
              showCount
              maxLength={300}
              style={{ fontSize: '16px', lineHeight: '1.8' }}
            />
          </Form.Item>

          <Form.Item
            label="作者"
            name="author"
            rules={[{ required: true, message: '请输入作者名称' }]}
            initialValue="佚名"
          >
            <Input placeholder="作者名称" size="large" />
          </Form.Item>

          <Form.Item
            label="背景颜色"
            name="backgroundColor"
            tooltip="选择卡片背景的渐变色"
          >
            <Select size="large" defaultValue="gradient1">
              <Option value="linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)">
                <div style={{ 
                  background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                  height: '30px',
                  borderRadius: '4px',
                }} />
              </Option>
              <Option value="linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)">
                <div style={{ 
                  background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
                  height: '30px',
                  borderRadius: '4px',
                }} />
              </Option>
              <Option value="linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)">
                <div style={{ 
                  background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                  height: '30px',
                  borderRadius: '4px',
                }} />
              </Option>
              <Option value="linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)">
                <div style={{ 
                  background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
                  height: '30px',
                  borderRadius: '4px',
                }} />
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="分类"
            name="category_id"
            tooltip="选择文章所属分类，支持新建分类"
          >
            <CategoryTreeSelect placeholder="选择分类（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large" icon={<PlusOutlined />}>
                发布引言
              </Button>
              <Button size="large">保存草稿</Button>
            </Space>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'video',
      label: (
        <span>
          <PlayCircleOutlined /> 视频
        </span>
      ),
      children: (
        <Form
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            label="视频文件"
            name="video"
            tooltip="支持 MP4、AVI、MOV 格式"
          >
            <Upload
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button icon={<PlayCircleOutlined />} size="large">
                选择视频文件
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item
            label="视频缩略图"
            name="thumbnail"
            required
          >
            <Upload
              listType="picture-card"
              beforeUpload={() => false}
              maxCount={1}
            >
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传缩略图</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item
            label="视频标题"
            name="title"
            rules={[{ required: true, message: '请输入视频标题' }]}
          >
            <Input placeholder="输入视频标题" size="large" />
          </Form.Item>

          <Form.Item
            label="视频时长"
            name="duration"
            tooltip="格式：mm:ss，例如 15:30"
          >
            <Input placeholder="例如: 15:30" size="large" />
          </Form.Item>

          <Form.Item
            label="视频描述"
            name="description"
          >
            <TextArea 
              rows={4} 
              placeholder="描述视频内容..."
              showCount
              maxLength={300}
            />
          </Form.Item>

          <Form.Item
            label="标签"
            name="tags"
          >
            <Select
              mode="tags"
              placeholder="添加标签"
              style={{ width: '100%' }}
            >
              <Option value="视频">视频</Option>
              <Option value="教程">教程</Option>
              <Option value="Vlog">Vlog</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="分类"
            name="category_id"
            tooltip="选择文章所属分类，支持新建分类"
          >
            <CategoryTreeSelect placeholder="选择分类（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large" icon={<PlusOutlined />}>
                发布视频
              </Button>
              <Button size="large">保存草稿</Button>
            </Space>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'link',
      label: (
        <span>
          <LinkOutlined /> 链接
        </span>
      ),
      children: (
        <Form
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            label="链接地址"
            name="url"
            rules={[
              { required: true, message: '请输入链接地址' },
              { type: 'url', message: '请输入有效的URL' }
            ]}
          >
            <Input 
              placeholder="https://example.com" 
              size="large"
              prefix={<LinkOutlined />}
            />
          </Form.Item>

          <Form.Item
            label="链接标题"
            name="title"
            rules={[{ required: true, message: '请输入链接标题' }]}
          >
            <Input placeholder="输入链接标题" size="large" />
          </Form.Item>

          <Form.Item
            label="链接描述"
            name="description"
            rules={[{ required: true, message: '请输入链接描述' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="描述这个链接..."
              showCount
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            label="缩略图"
            name="thumbnail"
            tooltip="可选，为链接添加预览图"
          >
            <Upload
              listType="picture-card"
              beforeUpload={() => false}
              maxCount={1}
            >
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传图片</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item
            label="标签"
            name="tags"
          >
            <Select
              mode="tags"
              placeholder="添加标签"
              style={{ width: '100%' }}
            >
              <Option value="链接">链接</Option>
              <Option value="资源">资源</Option>
              <Option value="工具">工具</Option>
              <Option value="文档">文档</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="分类"
            name="category_id"
            tooltip="选择文章所属分类，支持新建分类"
          >
            <CategoryTreeSelect placeholder="选择分类（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large" icon={<PlusOutlined />}>
                发布链接
              </Button>
              <Button size="large">保存草稿</Button>
            </Space>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <>
      <Header />
      
      <PageLayout
        box1Content={
          <div style={{ padding: '16px 24px' }}>
            <h2 style={{ 
              margin: 0, 
              color: 'white', 
              fontSize: '20px',
              fontWeight: 600,
            }}>
              ✨ 发布内容
            </h2>
            <p style={{ 
              margin: '8px 0 0 0', 
              color: 'rgba(255,255,255,0.8)',
              fontSize: '14px',
            }}>
              选择内容类型，分享你的创作
            </p>
          </div>
        }
        box1BgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        box2BgColor="#f5f5f5"
        box2Style={{ padding: '40px 20px' }}
      >
        <div style={{ 
          maxWidth: '900px', 
          margin: '0 auto',
        }}>
          <Card
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            styles={{ body: { padding: '24px' } }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              size="large"
              centered
            />
          </Card>
        </div>
      </PageLayout>
    </>
  );
}

