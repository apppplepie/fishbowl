'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, Button, Flex, Checkbox, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string) => void;
}

export default function LoginModal({ open, onClose, onLoginSuccess }: LoginModalProps) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();

  const onFinish = async (values: { username: string; password: string; remember: boolean }) => {
    setLoading(true);
    
    try {
      // 调用后端 API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 登录成功
        message.success('登录成功！');
        form.resetFields();
        // 通知父组件处理登录状态（由 useAuth 统一管理）
        onLoginSuccess(data.user.displayName || data.user.username);
      } else {
        // 登录失败
        message.error(data.message || '登录失败，请检查用户名和密码');
      }
    } catch (error) {
      console.error('登录错误:', error);
      message.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handleRegister = () => {
    router.push('/register');
    onClose();
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      footer={null}
      centered
      width={400}
      styles={{
        mask: {
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
        },
      }}
    >
      <div style={{ padding: '24px 0' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '32px', fontSize: '24px' }}>
          🐠 登录 Fishbowl
        </h2>
        
        <Form
          form={form}
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名！' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码！' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Flex justify="space-between" align="center">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Form.Item>
              <a onClick={handleForgotPassword} style={{ cursor: 'pointer' }}>
                忘记密码？
              </a>
            </Flex>
          </Form.Item>

          <Form.Item>
            <Button 
              block 
              type="primary" 
              htmlType="submit" 
              size="large"
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            还没有账号？{' '}
            <a onClick={handleRegister} style={{ cursor: 'pointer' }}>
              立即注册
            </a>
          </Form.Item>
        </Form>

        <div style={{ marginTop: '24px', padding: '12px', background: '#f0f5ff', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
          💡 测试账号：<br />
          用户名: <strong>A</strong><br />
          密码: <strong>123</strong>
        </div>
      </div>
    </Modal>
  );
}

