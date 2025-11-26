'use client';

import { Typography, Card, Avatar, Descriptions } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import Header from '../../components/Header';

const { Title } = Typography;

export default function ProfilePage() {
  return (
    <>
      <Header />
      <div style={{ paddingTop: '8vh', minHeight: '100vh', background: '#f0f2f5', padding: '80px 24px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Title level={1}>👤 个人资料</Title>
          
          <Card style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
              <Avatar size={80} icon={<UserOutlined />} />
              <div style={{ marginLeft: '24px' }}>
                <Title level={3} style={{ margin: 0 }}>张三</Title>
                <p style={{ color: '#666', margin: '8px 0 0 0' }}>zhangsan@example.com</p>
              </div>
            </div>
            
            <Descriptions title="基本信息" bordered>
              <Descriptions.Item label="用户名">张三</Descriptions.Item>
              <Descriptions.Item label="电话">138-1234-5678</Descriptions.Item>
              <Descriptions.Item label="角色">管理员</Descriptions.Item>
              <Descriptions.Item label="注册时间">2024-01-01</Descriptions.Item>
              <Descriptions.Item label="最后登录">2024-11-26</Descriptions.Item>
              <Descriptions.Item label="状态">
                <span style={{ color: '#52c41a' }}>● 在线</span>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>
      </div>
    </>
  );
}

