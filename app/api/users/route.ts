import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/users - 获取用户列表（管理员权限）
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 获取当前用户并验证管理员权限
    const currentUser = getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登录或token已过期' },
        { status: 401 }
      );
    }

    // 2. 验证管理员权限
    const adminCheck = await query(
      'SELECT role FROM users WHERE id = ?',
      [currentUser.id]
    ) as any[];

    if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '无管理员权限' },
        { status: 403 }
      );
    }

    // 3. 解析查询参数
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // 4. 构建查询条件
    let whereConditions = [];
    let queryParams: any[] = [];

    if (role) {
      whereConditions.push('role = ?');
      queryParams.push(role);
    }

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (search) {
      whereConditions.push('(username LIKE ? OR email LIKE ? OR display_name LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 5. 查询用户列表
    // 使用字符串拼接而不是参数绑定（LIMIT 和 OFFSET 不支持 ? 占位符）
    const userQuery = `SELECT id, username, email, display_name, avatar_url, bio, role, status,
              email_verified, last_login_at, created_at, max_access_level
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`;

    const users = await query(
      userQuery,
      queryParams.length > 0 ? queryParams : undefined
    ) as any[];

    // 6. 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    let countResult: any[];

    if (whereClause) {
      // 有WHERE条件时传递参数
      countResult = await query(countQuery, queryParams) as any[];
    } else {
      // 没有WHERE条件时不传递参数
      countResult = await query(countQuery) as any[];
    }

    const total = countResult[0].total;

    // 7. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error: any) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户列表失败: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - 创建用户（管理员权限）
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 获取当前用户并验证管理员权限
    const currentUser = getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登录或token已过期' },
        { status: 401 }
      );
    }

    // 2. 验证管理员权限
    const adminCheck = await query(
      'SELECT role FROM users WHERE id = ?',
      [currentUser.id]
    ) as any[];

    if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '无管理员权限' },
        { status: 403 }
      );
    }

    // 3. 解析请求体
    const body = await req.json();
    const { username, password, role } = body;

    // 4. 验证必填字段
    if (!username || !password || !role) {
      return NextResponse.json(
        { success: false, error: '用户名、密码和身份不能为空' },
        { status: 400 }
      );
    }

    // 5. 验证用户名格式（3-20字符，字母数字下划线）
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { success: false, error: '用户名必须是3-20个字符，只能包含字母、数字和下划线' },
        { status: 400 }
      );
    }

    // 6. 验证密码强度（至少6个字符）
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少需要6个字符' },
        { status: 400 }
      );
    }

    // 7. 验证角色
    if (!['admin', 'moderator', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, error: '无效的用户角色' },
        { status: 400 }
      );
    }

    // 8. 检查用户名是否已存在
    const existingUser = await query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    ) as any[];

    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, error: '用户名已被使用' },
        { status: 400 }
      );
    }

    // 9. 生成邮箱（自动生成，格式：username@fishbowl.local）
    const email = `${username}@fishbowl.local`;

    // 检查邮箱是否已存在（虽然不太可能，但为了安全）
    const existingEmail = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    ) as any[];

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { success: false, error: '邮箱已被使用' },
        { status: 400 }
      );
    }

    // 10. 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 11. 创建用户
    const userId = uuidv4();
    await query(
      `INSERT INTO users 
       (id, username, email, password_hash, display_name, role, status, email_verified, max_access_level) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username,
        email,
        passwordHash,
        username, // 显示名使用用户名
        role,
        'active', // 默认状态为正常
        false, // 邮箱未验证
        3 // 默认访问等级为3
      ]
    );

    // 12. 创建用户设置
    await query(
      'INSERT INTO user_settings (user_id) VALUES (?)',
      [userId]
    );

    // 13. 返回创建结果
    return NextResponse.json({
      success: true,
      message: '用户创建成功',
      user: {
        id: userId,
        username,
        email,
        display_name: username,
        role,
      },
    });

  } catch (error: any) {
    console.error('创建用户失败:', error);
    return NextResponse.json(
      { success: false, error: '创建用户失败: ' + error.message },
      { status: 500 }
    );
  }
}
