'use client';

import { Typography, Card, Avatar, Descriptions, Button, Spin, message } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import Header from '../../components/Header';
import PageLayout from '@/app/components/PageLayout';

const { Title } = Typography;

interface UserInfo {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  role: 'admin' | 'moderator' | 'user';
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  max_access_level?: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user: localUser, logout, getToken } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取最新用户信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!localUser) {
        setLoading(false);
        return;
      }

      // 如果已经有用户信息且用户ID相同，跳过请求
      if (userInfo && userInfo.id === localUser.id) {
        setLoading(false);
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUserInfo(data.user);
          } else {
            message.error(data.error || '获取用户信息失败');
          }
        } else {
          message.error('获取用户信息失败');
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        message.error('获取用户信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
    // 只依赖 localUser?.id，避免对象引用变化导致重复请求
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localUser?.id]);

  // 处理登出
  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    router.push('/');
  };

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return '未知';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // 获取角色显示名称
  const getRoleName = (role?: string) => {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'moderator':
        return '版主';
      case 'user':
        return '普通用户';
      default:
        return '未知';
    }
  };

  // 使用 API 返回的用户信息，如果没有则使用本地存储的用户信息
  const displayUser = userInfo || localUser;

  return (
    <>
      {/* Header 独立在最顶部，覆盖在边框上 */}
      <Header />
      
      <PageLayout
        box1Content={
          <div style={{ 
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Title level={2} style={{ margin: 0, color: 'white' }}>
              👤 个人资料
            </Title>
          </div>
        }
        box1BgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        box2BgColor="#f5f5f5"
        box2Style={{ padding: '40px 20px' }}
      >
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          width: '100%',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" />
            </div>
          ) : !userInfo && !localUser ? (
            <Card>
              <Title level={3}>未登录</Title>
              <p>请先登录以查看个人资料</p>
            </Card>
          ) : (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <Avatar 
                  size={80} 
                  src={displayUser?.avatar_url} 
                  icon={!displayUser?.avatar_url && <UserOutlined />} 
                />
                <div style={{ marginLeft: '24px', flex: 1 }}>
                  <Title level={3} style={{ margin: 0 }}>
                    {displayUser?.display_name || displayUser?.username || '未知用户'}
                  </Title>
                  <p style={{ color: '#666', margin: '8px 0 0 0' }}>
                    {displayUser?.email || '未设置邮箱'}
                  </p>
                </div>
                <Button 
                  danger 
                  icon={<LogoutOutlined />} 
                  onClick={handleLogout}
                  size="large"
                >
                  退出登录
                </Button>
              </div>
              
              <Descriptions title="基本信息" bordered>
                <Descriptions.Item label="用户名">
                  {displayUser?.username || '未知'}
                </Descriptions.Item>
                <Descriptions.Item label="显示名称">
                  {displayUser?.display_name || '未设置'}
                </Descriptions.Item>
                <Descriptions.Item label="邮箱">
                  {displayUser?.email || '未设置'}
                  {userInfo?.email_verified && (
                    <span style={{ color: '#52c41a', marginLeft: '8px' }}>✓ 已验证</span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="角色">
                  {getRoleName(displayUser?.role)}
                </Descriptions.Item>
                {userInfo?.created_at && (
                  <Descriptions.Item label="注册时间">
                    {formatDate(userInfo.created_at)}
                  </Descriptions.Item>
                )}
                {userInfo?.last_login_at && (
                  <Descriptions.Item label="最后登录">
                    {formatDate(userInfo.last_login_at)}
                  </Descriptions.Item>
                )}
              </Descriptions>

              {userInfo?.bio && (
                <div style={{ marginTop: '24px' }}>
                  <Title level={5}>个人简介</Title>
                  <p style={{ color: '#666', lineHeight: '1.8' }}>{userInfo.bio}</p>
                </div>
              )}

              {/* 管理员功能按钮 */}
              {displayUser?.role === 'admin' && (
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #f0f0f0' }}>
                  <Button
                    type="primary"
                    icon={<SettingOutlined />}
                    onClick={() => router.push('/admin/dashboard')}
                    size="large"
                  >
                    进入管理面板
                  </Button>
                </div>
              )}
            </Card>





          )}
        </div>
      </PageLayout>
    </>
  );
}

