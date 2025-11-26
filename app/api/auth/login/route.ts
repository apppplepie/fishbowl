import { NextRequest, NextResponse } from 'next/server';

// 模拟用户数据库（实际项目中应该从真实数据库读取）
const MOCK_USERS = [
  {
    id: 1,
    username: 'A',
    password: '123', // 实际项目中应该存储加密后的密码
    displayName: '用户A',
    email: 'userA@example.com',
  },
  {
    id: 2,
    username: 'admin',
    password: 'admin123',
    displayName: '管理员',
    email: 'admin@fishbowl.com',
  },
  {
    id: 3,
    username: 'test',
    password: 'test123',
    displayName: '测试用户',
    email: 'test@fishbowl.com',
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 验证输入
    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: '用户名和密码不能为空',
        },
        { status: 400 }
      );
    }

    // 模拟数据库查询延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 查找用户
    const user = MOCK_USERS.find(
      u => u.username === username && u.password === password
    );

    if (user) {
      // 登录成功
      // 实际项目中应该：
      // 1. 生成 JWT token
      // 2. 设置 httpOnly cookie
      // 3. 记录登录日志
      
      return NextResponse.json({
        success: true,
        message: '登录成功',
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
        },
      });
    } else {
      // 登录失败
      return NextResponse.json(
        {
          success: false,
          message: '用户名或密码错误',
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('登录 API 错误:', error);
    return NextResponse.json(
      {
        success: false,
        message: '服务器错误，请稍后重试',
      },
      { status: 500 }
    );
  }
}

// 获取当前用户信息（可选）
export async function GET(request: NextRequest) {
  // 实际项目中应该验证 token 或 session
  // 这里只是演示
  return NextResponse.json({
    success: true,
    message: '请先登录',
  });
}

