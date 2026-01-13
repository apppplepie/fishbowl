import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/garden/config - 获取当前用户的花园配置和植物
 * 需要登录
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 尝试获取当前用户（允许未登录）
    const currentUser = getCurrentUser(req);
    const ADMIN_USER_ID = 'd67b823a-2336-4931-8c5e-02c7724297f0';

    // 2. 获取查询参数
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('page_id') || null;

    let userId = currentUser?.id;
    let useAdminFallback = false;

    // 3. 如果未登录或没有用户ID，使用管理员ID作为回退
    if (!userId) {
      userId = ADMIN_USER_ID;
      useAdminFallback = true;
    }

    // 4. 查询用户配置
    const configs = await query<any[]>(
      `SELECT id, baseline_y_ratio, baseline_color, updated_at
       FROM user_garden_configs
       WHERE user_id = ? AND (page_id = ? OR (page_id IS NULL AND ? IS NULL))
       LIMIT 1`,
      [userId, pageId, pageId]
    );

    // 5. 查询该用户在该页面的所有植物
    const plants = await query<any[]>(
      `SELECT id, position_x_ratio, position_y_offset, dna_json, created_at
       FROM plant_instances
       WHERE user_id = ? AND (page_id = ? OR (page_id IS NULL AND ? IS NULL))
       ORDER BY created_at ASC`,
      [userId, pageId, pageId]
    );

    // 6. 如果当前用户没有植物且不是管理员回退，尝试使用管理员的花园配置
    if (plants.length === 0 && !useAdminFallback && userId !== ADMIN_USER_ID) {
      const adminConfigs = await query<any[]>(
        `SELECT id, baseline_y_ratio, baseline_color, updated_at
         FROM user_garden_configs
         WHERE user_id = ? AND (page_id = ? OR (page_id IS NULL AND ? IS NULL))
         LIMIT 1`,
        [ADMIN_USER_ID, pageId, pageId]
      );

      const adminPlants = await query<any[]>(
        `SELECT id, position_x_ratio, position_y_offset, dna_json, created_at
         FROM plant_instances
         WHERE user_id = ? AND (page_id = ? OR (page_id IS NULL AND ? IS NULL))
         ORDER BY created_at ASC`,
        [ADMIN_USER_ID, pageId, pageId]
      );

      // 如果管理员有植物，使用管理员的配置和植物
      if (adminPlants.length > 0) {
        const adminConfig = adminConfigs.length > 0 ? adminConfigs[0] : {
          baseline_y_ratio: 0.6,
          baseline_color: 'rgba(0, 0, 0, 0.1)',
        };

        return NextResponse.json({
          success: true,
          config: {
            baseline_y_ratio: parseFloat(adminConfig.baseline_y_ratio),
            baseline_color: adminConfig.baseline_color,
            updated_at: adminConfig.updated_at,
          },
          plants: adminPlants.map(plant => ({
            id: plant.id,
            position_x_ratio: parseFloat(plant.position_x_ratio),
            position_y_offset: parseFloat(plant.position_y_offset),
            dna: JSON.parse(plant.dna_json),
            created_at: plant.created_at,
          })),
        });
      }
      // 如果管理员也没有植物，继续使用当前用户的配置（即使没有植物）
    }

    // 7. 返回结果
    if (configs.length === 0) {
      // 没有配置，返回默认值
      return NextResponse.json({
        success: true,
        config: {
          baseline_y_ratio: 0.6,
          baseline_color: 'rgba(0, 0, 0, 0.1)',
        },
        plants: [],
      });
    }

    const config = configs[0];

    return NextResponse.json({
      success: true,
      config: {
        baseline_y_ratio: parseFloat(config.baseline_y_ratio),
        baseline_color: config.baseline_color,
        updated_at: config.updated_at,
      },
      plants: plants.map(plant => ({
        id: plant.id,
        position_x_ratio: parseFloat(plant.position_x_ratio),
        position_y_offset: parseFloat(plant.position_y_offset),
        dna: JSON.parse(plant.dna_json),
        created_at: plant.created_at,
      })),
    });
  } catch (error: any) {
    console.error('获取花园配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取花园配置失败: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/garden/config - 保存当前用户的花园配置和植物
 * 需要登录
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

    // 2. 从数据库获取最新用户信息（验证用户状态）
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

    // 3. 解析请求体
    const body = await req.json();
    const { baseline_y_ratio, baseline_color, plants, page_id } = body;

    // 4. 验证参数
    if (typeof baseline_y_ratio !== 'number' || baseline_y_ratio < 0 || baseline_y_ratio > 1) {
      return NextResponse.json(
        { success: false, error: 'baseline_y_ratio 必须是 0-1 之间的数字' },
        { status: 400 }
      );
    }

    if (!baseline_color || typeof baseline_color !== 'string') {
      return NextResponse.json(
        { success: false, error: 'baseline_color 必须是字符串' },
        { status: 400 }
      );
    }

    if (!Array.isArray(plants)) {
      return NextResponse.json(
        { success: false, error: 'plants 必须是数组' },
        { status: 400 }
      );
    }

    // 5. 保存/更新配置（UPSERT）
    // 先检查是否已存在配置
    const existing = await query<any[]>(
      `SELECT id FROM user_garden_configs
       WHERE user_id = ? AND (page_id = ? OR (page_id IS NULL AND ? IS NULL))
       LIMIT 1`,
      [currentUser.id, page_id || null, page_id || null]
    );

    if (existing.length > 0) {
      // 更新现有配置
      await query(
        `UPDATE user_garden_configs
         SET baseline_y_ratio = ?, baseline_color = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [baseline_y_ratio, baseline_color, existing[0].id]
      );
    } else {
      // 插入新配置
      const configId = uuidv4();
      await query(
        `INSERT INTO user_garden_configs (id, user_id, page_id, baseline_y_ratio, baseline_color)
         VALUES (?, ?, ?, ?, ?)`,
        [configId, currentUser.id, page_id || null, baseline_y_ratio, baseline_color]
      );
    }

    // 6. 删除该用户在该页面的所有旧植物
    await query(
      `DELETE FROM plant_instances
       WHERE user_id = ? AND (page_id = ? OR (page_id IS NULL AND ? IS NULL))`,
      [currentUser.id, page_id || null, page_id || null]
    );

    // 7. 批量插入新植物
    if (plants.length > 0) {
      const values = plants.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const params: any[] = [];
      
      plants.forEach((plant: any) => {
        const plantId = uuidv4();
        params.push(
          plantId,
          currentUser.id,
          page_id || null,
          plant.position_x_ratio,
          plant.position_y_offset,
          JSON.stringify(plant.dna)
        );
      });

      await query(
        `INSERT INTO plant_instances (id, user_id, page_id, position_x_ratio, position_y_offset, dna_json)
         VALUES ${values}`,
        params
      );
    }

    // 8. 返回成功响应
    return NextResponse.json({
      success: true,
      message: '配置已保存',
      saved: {
        config: {
          baseline_y_ratio,
          baseline_color,
        },
        plants_count: plants.length,
      },
    });
  } catch (error: any) {
    console.error('保存花园配置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存花园配置失败: ' + error.message },
      { status: 500 }
    );
  }
}

