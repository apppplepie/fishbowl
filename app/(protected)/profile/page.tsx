'use client';

import { Typography, Avatar, Button, Spin, message, Tag } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined, MailOutlined, UserSwitchOutlined, CrownOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import PageLayout from '@/app/components/PageLayout';
import { useResponsive } from '@/app/hooks/useResponsive';

const { Title, Text } = Typography;

// ==================== 设计系统变量 ====================
// 颜色体系 - 个人博客风格（明媚色彩）
const designSystem = {
  colors: {
    primary: '#4A90E2',        // 主色：温和蓝色
    primaryLight: '#6BA3E8',   // 主色浅色
    primaryDark: '#357ABD',    // 主色深色
    accent: '#FFB74D',         // 强调色：温暖橙色
    accentLight: '#FFCC80',    // 强调色浅色
    success: '#66BB6A',        // 成功色：清新绿色
    text: {
      primary: '#2C3E50',      // 主文本：深蓝灰
      secondary: '#5A6C7D',    // 次要文本：中灰
      tertiary: '#95A5A6',     // 辅助文本：浅灰
      inverse: '#FFFFFF',      // 反色文本：白色
    },
    background: {
      card: '#FFFFFF',         // 卡片背景：纯白
      cardHover: '#FAFBFC',    // 卡片悬停：极浅灰
      section: '#F8F9FA',      // 区块背景：浅灰
      badge: '#E3F2FD',        // 徽章背景：浅蓝
    },
    border: {
      light: '#E1E8ED',        // 浅边框
      medium: '#D1D9E0',       // 中边框
      accent: '#4A90E2',       // 强调边框
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px',
  },
  typography: {
    h1: { fontSize: '32px', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '24px', fontWeight: 600, lineHeight: 1.3 },
    h3: { fontSize: '20px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: '16px', fontWeight: 400, lineHeight: 1.6 },
    bodySmall: { fontSize: '14px', fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: '12px', fontWeight: 400, lineHeight: 1.4 },
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
    md: '0 4px 12px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
};

// 移动端响应式调整
const mobileAdjustments = {
  typography: {
    h1: { fontSize: '24px' },
    h2: { fontSize: '20px' },
    h3: { fontSize: '18px' },
    body: { fontSize: '15px' },
  },
  spacing: {
    section: '24px',
    card: '16px',
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const { user: localUser, logout, isLoading } = useAuth();
  const { currentFishbowlTheme } = useAppTheme();
  const { isMobile } = useResponsive();

  // 处理登出
  const handleLogout = () => {
    logout();
    message.success('已退出登录');
  };

  // 获取角色显示名称和颜色
  const getRoleInfo = (role?: string) => {
    switch (role) {
      case 'admin':
        return { name: '管理员', color: designSystem.colors.primary, icon: <CrownOutlined /> };
      case 'moderator':
        return { name: '版主', color: designSystem.colors.accent, icon: <UserSwitchOutlined /> };
      case 'user':
        return { name: '普通用户', color: designSystem.colors.success, icon: <UserOutlined /> };
      default:
        return { name: '未知', color: designSystem.colors.text.tertiary, icon: <UserOutlined /> };
    }
  };

  const roleInfo = getRoleInfo(localUser?.role);

  // 响应式样式合并函数
  const getResponsiveStyle = (desktop: any, mobile: any) => {
    return isMobile ? { ...desktop, ...mobile } : desktop;
  };

  return (
    <>
      <PageLayout
        theme={currentFishbowlTheme}
        box1Content={
          <div style={{
            padding: isMobile ? '20px 16px' : '24px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Title 
              level={2} 
              style={{ 
                margin: 0, 
                color: 'white',
                fontSize: isMobile ? '20px' : '28px',
                fontWeight: 600,
                letterSpacing: '0.5px',
              }}
            >
              👤 个人资料
            </Title>
          </div>
        }
        box2Style={{ 
          padding: isMobile ? '24px 16px' : '48px 32px',
          background: designSystem.colors.background.section,
        }}
      >
        <div style={{ 
          maxWidth: '1000px', 
          margin: '0 auto',
          width: '100%',
        }}>
          {isLoading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '80px 0',
              background: designSystem.colors.background.card,
              borderRadius: designSystem.borderRadius.lg,
              boxShadow: designSystem.shadow.sm,
            }}>
              <Spin size="large" />
              <div style={{ 
                marginTop: designSystem.spacing.lg,
                color: designSystem.colors.text.secondary,
                ...designSystem.typography.bodySmall,
              }}>
                加载中...
              </div>
            </div>
          ) : !localUser ? (
            <div style={{
              background: designSystem.colors.background.card,
              borderRadius: designSystem.borderRadius.lg,
              padding: designSystem.spacing.xxl,
              textAlign: 'center',
              boxShadow: designSystem.shadow.md,
            }}>
              <Title level={3} style={{ 
                color: designSystem.colors.text.primary,
                marginBottom: designSystem.spacing.md,
              }}>
                未登录
              </Title>
              <Text style={{ color: designSystem.colors.text.secondary }}>
                请先登录以查看个人资料
              </Text>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? designSystem.spacing.lg : designSystem.spacing.xl,
            }}>
              {/* ==================== 顶部头像卡片 ==================== */}
              <div style={{
                background: designSystem.colors.background.card,
                borderRadius: designSystem.borderRadius.lg,
                padding: isMobile ? designSystem.spacing.xl : designSystem.spacing.xxl,
                boxShadow: designSystem.shadow.md,
                border: `1px solid ${designSystem.colors.border.light}`,
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'center' : 'flex-start',
                  gap: isMobile ? designSystem.spacing.lg : designSystem.spacing.xl,
                }}>
                  {/* 头像区域 */}
                  <div style={{
                    position: 'relative',
                    flexShrink: 0,
                  }}>
                    <Avatar 
                      size={isMobile ? 100 : 120} 
                      src={localUser?.avatar_url} 
                      icon={!localUser?.avatar_url && <UserOutlined />}
                      style={{
                        border: `4px solid ${designSystem.colors.primary}`,
                        boxShadow: designSystem.shadow.md,
                      }}
                    />
                    {/* 角色徽章 */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      background: roleInfo.color,
                      borderRadius: designSystem.borderRadius.full,
                      padding: '4px 8px',
                      boxShadow: designSystem.shadow.sm,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span style={{ 
                        fontSize: '12px',
                        color: 'white',
                        fontWeight: 600,
                      }}>
                        {roleInfo.name}
                      </span>
                    </div>
                  </div>

                  {/* 用户信息区域 */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: designSystem.spacing.sm,
                    textAlign: isMobile ? 'center' : 'left',
                  }}>
                    <Title 
                      level={1} 
                      style={{ 
                        margin: 0,
                        color: designSystem.colors.text.primary,
                        ...getResponsiveStyle(
                          designSystem.typography.h1,
                          mobileAdjustments.typography.h1
                        ),
                      }}
                    >
                      {localUser?.display_name || localUser?.username || '未知用户'}
                    </Title>
                    
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'center' : 'flex-start',
                      gap: isMobile ? designSystem.spacing.xs : designSystem.spacing.md,
                      flexWrap: 'wrap',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: designSystem.spacing.xs,
                        color: designSystem.colors.text.secondary,
                        ...designSystem.typography.bodySmall,
                      }}>
                        <MailOutlined />
                        <span>{localUser?.email || '未设置邮箱'}</span>
                      </div>
                      
                      {localUser?.username && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: designSystem.spacing.xs,
                          color: designSystem.colors.text.tertiary,
                          ...designSystem.typography.caption,
                        }}>
                          <span>@{localUser.username}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮区域 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'row' : 'column',
                    gap: designSystem.spacing.sm,
                    flexShrink: 0,
                    width: isMobile ? '100%' : 'auto',
                  }}>
                    <Button 
                      danger 
                      icon={<LogoutOutlined />} 
                      onClick={handleLogout}
                      size={isMobile ? 'middle' : 'large'}
                      style={{
                        width: isMobile ? '100%' : 'auto',
                        borderRadius: designSystem.borderRadius.md,
                        fontWeight: 500,
                      }}
                    >
                      退出登录
                    </Button>
                  </div>
                </div>
              </div>

              {/* ==================== 信息卡片网格 ==================== */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: isMobile ? designSystem.spacing.lg : designSystem.spacing.lg,
              }}>
                {/* 基本信息卡片 */}
                <div style={{
                  background: designSystem.colors.background.card,
                  borderRadius: designSystem.borderRadius.lg,
                  padding: designSystem.spacing.xl,
                  boxShadow: designSystem.shadow.sm,
                  border: `1px solid ${designSystem.colors.border.light}`,
                  transition: 'all 0.3s ease',
                }}>
                  <Title 
                    level={3} 
                    style={{ 
                      margin: `0 0 ${designSystem.spacing.lg} 0`,
                      color: designSystem.colors.text.primary,
                      ...getResponsiveStyle(
                        designSystem.typography.h3,
                        mobileAdjustments.typography.h3
                      ),
                    }}
                  >
                    基本信息
                  </Title>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: designSystem.spacing.md,
                  }}>
                    <InfoItem 
                      label="用户名" 
                      value={localUser?.username || '未知'}
                    />
                    <InfoItem 
                      label="显示名称" 
                      value={localUser?.display_name || '未设置'}
                    />
                    <InfoItem 
                      label="邮箱" 
                      value={localUser?.email || '未设置'}
                    />
                    <InfoItem 
                      label="角色" 
                      value={
                        <Tag 
                          color={roleInfo.color}
                          icon={roleInfo.icon}
                          style={{
                            borderRadius: designSystem.borderRadius.sm,
                            padding: '4px 12px',
                            border: 'none',
                            fontWeight: 500,
                          }}
                        >
                          {roleInfo.name}
                        </Tag>
                      }
                    />
                  </div>
                </div>

                {/* 账户状态卡片 */}
                <div style={{
                  background: designSystem.colors.background.card,
                  borderRadius: designSystem.borderRadius.lg,
                  padding: designSystem.spacing.xl,
                  boxShadow: designSystem.shadow.sm,
                  border: `1px solid ${designSystem.colors.border.light}`,
                  transition: 'all 0.3s ease',
                }}>
                  <Title 
                    level={3} 
                    style={{ 
                      margin: `0 0 ${designSystem.spacing.lg} 0`,
                      color: designSystem.colors.text.primary,
                      ...getResponsiveStyle(
                        designSystem.typography.h3,
                        mobileAdjustments.typography.h3
                      ),
                    }}
                  >
                    账户状态
                  </Title>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: designSystem.spacing.md,
                  }}>
                    <StatusBadge 
                      label="账户状态" 
                      value="正常" 
                      color={designSystem.colors.success}
                    />
                    <StatusBadge 
                      label="用户ID" 
                      value={localUser?.id ? localUser.id.substring(0, 8) + '...' : '未知'}
                      color={designSystem.colors.text.secondary}
                    />
                  </div>
                </div>
              </div>

              {/* ==================== 管理员功能区 ==================== */}
              {localUser?.role === 'admin' && (
                <div style={{
                  background: `linear-gradient(135deg, ${designSystem.colors.primary} 0%, ${designSystem.colors.primaryDark} 100%)`,
                  borderRadius: designSystem.borderRadius.lg,
                  padding: designSystem.spacing.xl,
                  boxShadow: designSystem.shadow.lg,
                  border: `1px solid ${designSystem.colors.border.accent}`,
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: designSystem.spacing.lg,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: designSystem.spacing.md,
                    }}>
                      <CrownOutlined style={{
                        fontSize: '24px',
                        color: 'white',
                      }} />
                      <div>
                        <Title 
                          level={4} 
                          style={{ 
                            margin: 0,
                            color: 'white',
                            ...designSystem.typography.h3,
                          }}
                        >
                          管理员权限
                        </Title>
                        <Text style={{
                          color: 'rgba(255, 255, 255, 0.9)',
                          ...designSystem.typography.bodySmall,
                        }}>
                          您拥有系统管理权限，可以访问管理面板
                        </Text>
                      </div>
                    </div>
                    <Button
                      type="primary"
                      icon={<SettingOutlined />}
                      onClick={() => router.push('/admin/dashboard')}
                      size="large"
                      style={{
                        background: 'white',
                        color: designSystem.colors.primary,
                        border: 'none',
                        borderRadius: designSystem.borderRadius.md,
                        fontWeight: 600,
                        boxShadow: designSystem.shadow.md,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = designSystem.colors.background.cardHover;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      进入管理面板
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PageLayout>
    </>
  );
}

// ==================== 信息项组件 ====================
function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: designSystem.spacing.xs,
      paddingBottom: designSystem.spacing.md,
      borderBottom: `1px solid ${designSystem.colors.border.light}`,
    }}>
      <Text style={{
        color: designSystem.colors.text.tertiary,
        ...designSystem.typography.caption,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {label}
      </Text>
      <div style={{
        color: designSystem.colors.text.primary,
        ...designSystem.typography.body,
        fontWeight: 500,
      }}>
        {value}
      </div>
    </div>
  );
}

// ==================== 状态徽章组件 ====================
function StatusBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: designSystem.spacing.xs,
      paddingBottom: designSystem.spacing.md,
      borderBottom: `1px solid ${designSystem.colors.border.light}`,
    }}>
      <Text style={{
        color: designSystem.colors.text.tertiary,
        ...designSystem.typography.caption,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {label}
      </Text>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: designSystem.spacing.xs,
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: designSystem.borderRadius.full,
          background: color,
        }} />
        <span style={{
          color: designSystem.colors.text.primary,
          ...designSystem.typography.body,
          fontWeight: 500,
        }}>
          {value}
        </span>
      </div>
    </div>
  );
}
