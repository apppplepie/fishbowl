import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasRole } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/garden/baseline - 获取基准线配置
 * 公开接口，无需登录
 */
export async function GET(req: NextRequest) {
  try {
    // 查询基准线配置（只取第一条，全局单一配置）
    const configs = await query<any[]>(
      `SELECT id, baseline_y_ratio, updated_by, updated_at
       FROM garden_baseline_config
       ORDER BY updated_at DESC
       LIMIT 1`
    );

    if (configs.length === 0) {
      // 如果没有配置，返回默认值
      return NextResponse.json({
        success: true,
        baseline: {
          baseline_y_ratio: 0.6, // 默认60%
          updated_at: null,
        },
      });
    }

    const config = configs[0];

    return NextResponse.json({
      success: true,
      baseline: {
        baseline_y_ratio: parseFloat(config.baseline_y_ratio),
        updated_at: config.updated_at,
      },
    });
  } catch (error: any) {
    console.error('获取基准线配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取基准线配置失败: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/garden/baseline - 保存基准线配置
 * 需要登录，且角色为 user、moderator 或 admin
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 验证用户登录
    const currentUser = getCurrentUser(req);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登录或token已过期' },
        { status: 401 }
      );
    }

    // 2. 验证用户角色（user、moderator、admin 都可以）
    // 这里不需要额外检查，因为只要登录了就可以

    // 3. 从数据库获取最新用户信息（验证用户状态）
    const users = await query<any[]>(
      `SELECT id, role, status
       FROM users
       WHERE id = ?`,
      [currentUser.id]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = users[0];

    // 检查用户状态
    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '账号状态异常' },
        { status: 403 }
      );
    }

    // 4. 解析请求体
    const body = await req.json();
    const { baseline_y_ratio } = body;

    // 5. 验证参数
    if (typeof baseline_y_ratio !== 'number' || baseline_y_ratio < 0 || baseline_y_ratio > 1) {
      return NextResponse.json(
        { success: false, error: 'baseline_y_ratio 必须是 0-1 之间的数字' },
        { status: 400 }
      );
    }

    // 6. 更新或插入配置（使用 INSERT ... ON DUPLICATE KEY UPDATE）
    // 先检查是否存在配置
    const existing = await query<any[]>(
      'SELECT id FROM garden_baseline_config LIMIT 1'
    );

    if (existing.length === 0) {
      // 插入新配置
      await query(
        `INSERT INTO garden_baseline_config (id, baseline_y_ratio, updated_by)
         VALUES (?, ?, ?)`,
        ['default-baseline-config', baseline_y_ratio, currentUser.id]
      );
    } else {
      // 更新现有配置
      await query(
        `UPDATE garden_baseline_config
         SET baseline_y_ratio = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [baseline_y_ratio, currentUser.id, existing[0].id]
      );
    }

    // 7. 返回更新后的配置
    const updated = await query<any[]>(
      `SELECT id, baseline_y_ratio, updated_by, updated_at
       FROM garden_baseline_config
       ORDER BY updated_at DESC
       LIMIT 1`
    );

    return NextResponse.json({
      success: true,
      message: '基准线配置已更新',
      baseline: {
        baseline_y_ratio: parseFloat(updated[0].baseline_y_ratio),
        updated_at: updated[0].updated_at,
      },
    });
  } catch (error: any) {
    console.error('保存基准线配置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存基准线配置失败: ' + error.message },
      { status: 500 }
    );
  }
}

