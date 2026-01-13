'use client';

import { Typography, Card, Avatar, Descriptions, Button, Spin, message } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import PageLayout from '@/app/components/PageLayout';
import { useResponsive } from '@/app/hooks/useResponsive';

const { Title } = Typography;

export default function ProfilePage() {
  const router = useRouter();
  const { user: localUser, logout, isLoading } = useAuth();
  const { currentFishbowlTheme } = useAppTheme();
  const { isMobile } = useResponsive();
  // 不需要再次获取用户信息，useAuth 已经处理了
  // AuthContext 会自动调用 /api/auth/me 并保持状态同步

  // 处理登出
  const handleLogout = () => {
    logout();
    message.success('已退出登录');
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

  return (
    <>
      <PageLayout
        theme={currentFishbowlTheme}
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
        box2Style={{ padding: isMobile ? '40px 12px' : '40px 24px' }}
      >
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          width: '100%',
        }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" />
            </div>
          ) : !localUser ? (
            <Card>
              <Title level={3}>未登录</Title>
              <p>请先登录以查看个人资料</p>
            </Card>
          ) : (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <Avatar 
                  size={80} 
                  src={localUser?.avatar_url} 
                  icon={!localUser?.avatar_url && <UserOutlined />} 
                />
                <div style={{ marginLeft: '24px', flex: 1 }}>
                  <Title level={3} style={{ margin: 0 }}>
                    {localUser?.display_name || localUser?.username || '未知用户'}
                  </Title>
                  <p style={{ color: '#666', margin: '8px 0 0 0' }}>
                    {localUser?.email || '未设置邮箱'}
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
                  {localUser?.username || '未知'}
                </Descriptions.Item>
                <Descriptions.Item label="显示名称">
                  {localUser?.display_name || '未设置'}
                </Descriptions.Item>
                <Descriptions.Item label="邮箱">
                  {localUser?.email || '未设置'}
                </Descriptions.Item>
                <Descriptions.Item label="角色">
                  {getRoleName(localUser?.role)}
                </Descriptions.Item>
              </Descriptions>

              {/* 管理员功能按钮 */}
              {localUser?.role === 'admin' && (
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

