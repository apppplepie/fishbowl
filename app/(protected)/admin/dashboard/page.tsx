'use client';

import React, { useContext, useEffect, useRef, useState } from 'react';
import type { GetRef, InputRef, TableProps } from 'antd';
import { Button, Form, Input, Select, Table, Typography, message, Spin, InputNumber, Switch, Modal } from 'antd';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/hooks/useAuth';
import { apiGetJson, apiPostJson, apiPutJson } from '@/lib/apiClient';
import Header from '../../../components/Header';

const { Title, Paragraph } = Typography;
const { Option } = Select;

type FormInstance<T> = GetRef<typeof Form<T>>;

const EditableContext = React.createContext<FormInstance<any> | null>(null);

// 用户数据接口
interface UserData {
  key: string;
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: 'admin' | 'moderator' | 'user';
  status: 'active' | 'suspended' | 'deleted';
  email_verified: boolean;
  max_access_level: number;
}

interface EditableRowProps {
  index: number;
}

const EditableRow: React.FC<EditableRowProps> = ({ index, ...props }) => {
  const [form] = Form.useForm();
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
};

interface EditableCellProps {
  title: React.ReactNode;
  editable: boolean;
  dataIndex: keyof UserData;
  record: UserData;
  handleSave: (record: UserData) => void;
  inputType?: 'text' | 'select' | 'number' | 'switch';
  options?: Array<{ value: string | number | boolean; label: string }>;
}

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
  inputType = 'text',
  options = [],
  ...restProps
}) => {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<InputRef>(null);
  const form = useContext(EditableContext)!;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const toggleEdit = () => {
    setEditing(!editing);
    form.setFieldsValue({ [dataIndex]: record[dataIndex] });
  };

  const save = async () => {
    try {
      const values = await form.validateFields();

      toggleEdit();
      handleSave({ ...record, ...values });
    } catch (errInfo) {
      console.log('Save failed:', errInfo);
    }
  };

  let childNode = children;

  if (editable) {
    childNode = editing ? (
      <Form.Item
        style={{ margin: 0 }}
        name={dataIndex}
        rules={[{ required: true, message: `${title} is required.` }]}
      >
        {inputType === 'select' ? (
          <Select
            ref={inputRef as any}
            onBlur={save}
            style={{ width: '100%' }}
          >
            {options.map(option => (
              <Option key={String(option.value)} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        ) : inputType === 'number' ? (
          <InputNumber
            ref={inputRef as any}
            onBlur={save}
            min={1}
            max={10}
            style={{ width: '100%' }}
          />
        ) : inputType === 'switch' ? (
          <Switch
            checked={record[dataIndex] as boolean}
            onChange={(checked) => {
              form.setFieldsValue({ [dataIndex]: checked });
              save();
            }}
          />
        ) : (
          <Input
            ref={inputRef}
            onPressEnter={save}
            onBlur={save}
          />
        )}
      </Form.Item>
    ) : (
      <div
        className="editable-cell-value-wrap"
        style={{ paddingInlineEnd: 24 }}
        onClick={toggleEdit}
      >
        {inputType === 'switch'
          ? (record[dataIndex] ? '✓' : '✗')
          : children
        }
      </div>
    );
  }

  return <td {...restProps}>{childNode}</td>;
};

type ColumnTypes = Exclude<TableProps<UserData>['columns'], undefined>;

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dataSource, setDataSource] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const handleLogout = () => {
    logout();
  };

  const handleBackToProfile = () => {
    router.push('/profile');
  };

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const data = await apiGetJson<{ success: boolean; data?: { users: any[] }; error?: string }>('/api/users');
      
      if (data.success && data.data) {
        const users = data.data.users.map((user: any) => ({
          key: user.id,
          ...user,
        }));
        setDataSource(users);
      } else {
        message.error(data.error || '获取用户列表失败');
      }
    } catch (error: any) {
      console.error('获取用户列表失败:', error);
      // 401错误会被apiClient自动处理，这里只处理其他错误
      if (!error.message?.includes('401')) {
        message.error('获取用户列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 创建新用户
  const handleCreateUser = async () => {
    try {
      const values = await form.validateFields();

      const data = await apiPostJson<{ success: boolean; error?: string }>('/api/users', {
        username: values.username,
        password: values.password,
        role: values.role,
      });

      if (data.success) {
        message.success('用户创建成功');
        form.resetFields();
        setIsModalVisible(false);
        fetchUsers(); // 刷新用户列表
      } else {
        message.error(data.error || '创建失败');
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      console.error('创建用户失败:', error);
      // 401错误会被apiClient自动处理，这里只处理其他错误
      if (!error.message?.includes('401')) {
        message.error('创建失败');
      }
    }
  };

  // 保存用户更新
  const handleSave = async (record: UserData) => {
    try {
      const updateData = {
        email: record.email,
        display_name: record.display_name,
        role: record.role,
        status: record.status,
        email_verified: record.email_verified,
        max_access_level: record.max_access_level,
      };

      const data = await apiPutJson<{ success: boolean; error?: string }>(`/api/users/${record.id}`, updateData);

      if (data.success) {
        message.success('用户信息更新成功');
        fetchUsers(); // 重新获取数据
      } else {
        message.error(data.error || '更新失败');
      }
    } catch (error: any) {
      console.error('更新用户信息失败:', error);
      // 401错误会被apiClient自动处理，这里只处理其他错误
      if (!error.message?.includes('401')) {
        message.error('更新失败');
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const components = {
    body: {
      row: EditableRow,
      cell: EditableCell,
    },
  };

  const columns: (ColumnTypes[number] & {
    editable?: boolean;
    dataIndex: string;
    inputType?: 'text' | 'select' | 'number' | 'switch';
    options?: Array<{ value: string | number | boolean; label: string }>;
  })[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      width: '12%',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: '18%',
      editable: true,
      inputType: 'text',
    },
    {
      title: '显示名称',
      dataIndex: 'display_name',
      width: '15%',
      editable: true,
      inputType: 'text',
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: '10%',
      editable: true,
      inputType: 'select',
      options: [
        { value: 'user', label: '普通用户' },
        { value: 'moderator', label: '版主' },
        { value: 'admin', label: '管理员' },
      ],
      render: (role: string) => {
        const roleMap = {
          admin: '管理员',
          moderator: '版主',
          user: '普通用户',
        };
        return roleMap[role as keyof typeof roleMap] || role;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: '10%',
      editable: true,
      inputType: 'select',
      options: [
        { value: 'active', label: '正常' },
        { value: 'suspended', label: '暂停' },
        { value: 'deleted', label: '已删除' },
      ],
      render: (status: string) => {
        const statusMap = {
          active: '正常',
          suspended: '暂停',
          deleted: '已删除',
        };
        return statusMap[status as keyof typeof statusMap] || status;
      },
    },
    {
      title: '邮箱验证',
      dataIndex: 'email_verified',
      width: '10%',
      editable: true,
      inputType: 'switch',
      render: (verified: boolean) => verified ? '✓' : '✗',
    },
    {
      title: '访问等级',
      dataIndex: 'max_access_level',
      width: '10%',
      editable: true,
      inputType: 'number',
    },
  ];

  const tableColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: UserData) => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: col.title,
        handleSave,
        inputType: col.inputType,
        options: col.options,
      }),
    };
  });

  return (
    <>
      <Header />
      <div style={{ paddingTop: '8vh', minHeight: '100vh', background: '#f0f2f5', padding: '80px 24px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <Title level={1}>⚙️ 管理面板</Title>
          <div style={{ marginTop: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={3} style={{ margin: 0 }}>👥 用户管理</Title>
              <Button type="primary" onClick={() => setIsModalVisible(true)}>
                添加用户
              </Button>
            </div>
            <div style={{ marginTop: '20px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: '16px', color: '#666' }}>
                    加载用户数据中...
                  </div>
                </div>
              ) : (
                <Table<UserData>
                  components={components}
                  rowClassName={() => 'editable-row'}
                  bordered
                  dataSource={dataSource}
                  columns={tableColumns as ColumnTypes}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                  }}
                  scroll={{ x: 1200 }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="添加用户"
        open={isModalVisible}
        onOk={handleCreateUser}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: 'user',
          }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '用户名必须是3-20个字符，只能包含字母、数字和下划线' },
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少需要6个字符' },
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item
            name="role"
            label="身份"
            rules={[{ required: true, message: '请选择身份' }]}
          >
            <Select>
              <Option value="user">普通用户</Option>
              <Option value="moderator">版主</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

