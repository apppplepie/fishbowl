import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { DEFAULT_FISH_CONFIG } from '../../../config/fishConfig';
import { PATH_BODY, PATH_TAIL, PATH_DORSAL, EYE_POSITION, EYE_RADIUS } from '@/lib/fish-paths';

export interface FishConfig {
  colors: {
    body: string;
    bodyAccent: string;
    tail: string;
    tailAccent: string;
    dorsal: string;
    dorsalAccent: string;
    eye: string;
  };
  behavior: {
    agility: number;
    energy: number;
    scale: number;
  };
}

/**
 * 生成鱼的SVG字符串
 */
function generateFishSVG(config: FishConfig): string {
  return `
<svg width="256" height="256" viewBox="-128 -128 256 256"
     xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${config.colors.body}" />
      <stop offset="100%" stop-color="${config.colors.bodyAccent}" />
    </linearGradient>
    <linearGradient id="tailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${config.colors.tail}" />
      <stop offset="100%" stop-color="${config.colors.tailAccent}" />
    </linearGradient>
    <linearGradient id="dorsalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${config.colors.dorsal}" />
      <stop offset="100%" stop-color="${config.colors.dorsalAccent}" />
    </linearGradient>
  </defs>

  <g transform="scale(${config.behavior.scale})">
    <path d="${PATH_BODY}" fill="url(#bodyGrad)" />
    <path d="${PATH_TAIL}" fill="url(#tailGrad)" />
    <path d="${PATH_DORSAL}" fill="url(#dorsalGrad)" />
    <circle cx="${EYE_POSITION.x}" cy="${EYE_POSITION.y}" r="${EYE_RADIUS}" fill="${config.colors.eye}" />
  </g>
</svg>
`;
}

/**
 * GET /api/fish/config - 获取当前用户的鱼配置
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 尝试获取当前用户（允许未登录）
    const currentUser = getCurrentUser(req);

    let userId = currentUser?.id;

    // 2. 如果未登录，使用默认配置
    if (!userId) {
      return NextResponse.json({
        success: true,
        config: DEFAULT_FISH_CONFIG,
      });
    }

    // 3. 查询用户配置
    const configs = await query<any[]>(
      `SELECT id, colors, behavior, updated_at
       FROM user_fish_configs
       WHERE user_id = ? AND is_active = 1
       LIMIT 1`,
      [userId]
    );

    // 4. 如果没有配置，返回默认值
    if (configs.length === 0) {
      return NextResponse.json({
        success: true,
        config: DEFAULT_FISH_CONFIG,
      });
    }

    const config = configs[0];

    // 解析存储的 JSON 数据，增加错误处理
    let colors, behavior;
    try {
      // MySQL JSON 类型会自动解析为对象，如果是字符串则需要手动解析
      if (typeof config.colors === 'string') {
        colors = JSON.parse(config.colors);
      } else if (config.colors && typeof config.colors === 'object') {
        colors = config.colors;
      } else {
        throw new Error('Invalid colors format');
      }

      if (typeof config.behavior === 'string') {
        behavior = JSON.parse(config.behavior);
      } else if (config.behavior && typeof config.behavior === 'object') {
        behavior = config.behavior;
      } else {
        throw new Error('Invalid behavior format');
      }
    } catch (parseError) {
      console.error('解析配置数据失败:', parseError, '原始数据:', { colors: config.colors, behavior: config.behavior });
      // 如果解析失败，使用默认配置
      return NextResponse.json({
        success: true,
        config: DEFAULT_FISH_CONFIG,
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        colors,
        behavior,
        updated_at: config.updated_at,
      },
    });
  } catch (error: any) {
    console.error('获取鱼配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取鱼配置失败: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fish/config - 保存当前用户的鱼配置
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
    const { colors, behavior } = body;

    // 4. 验证参数
    if (!colors || typeof colors !== 'object') {
      return NextResponse.json(
        { success: false, error: 'colors 必须是对象' },
        { status: 400 }
      );
    }

    if (!behavior || typeof behavior !== 'object') {
      return NextResponse.json(
        { success: false, error: 'behavior 必须是对象' },
        { status: 400 }
      );
    }

    // 5. 先将其他配置设为非活跃状态
    await query(
      `UPDATE user_fish_configs
       SET is_active = 0
       WHERE user_id = ?`,
      [currentUser.id]
    );

    // 6. 插入新配置
    const configId = uuidv4();

    // 确保数据是有效的 JSON
    const colorsJson = JSON.stringify(colors);
    const behaviorJson = JSON.stringify(behavior);

    // 验证 JSON 字符串是否有效
    try {
      JSON.parse(colorsJson);
      JSON.parse(behaviorJson);
    } catch (jsonError) {
      return NextResponse.json(
        { success: false, error: '配置数据格式无效' },
        { status: 400 }
      );
    }

    await query(
      `INSERT INTO user_fish_configs (id, user_id, colors, behavior, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [configId, currentUser.id, colorsJson, behaviorJson]
    );

    // 7. 生成静态头像
    try {
      const svg = generateFishSVG({ colors, behavior });
      const pngBuffer = await sharp(Buffer.from(svg))
        .resize(256, 256)
        .png()
        .toBuffer();

      const base64Avatar = `data:image/png;base64,${pngBuffer.toString('base64')}`;

      // 更新用户的头像
      await query(
        `UPDATE users SET avatar_base64 = ? WHERE id = ?`,
        [base64Avatar, currentUser.id]
      );
    } catch (avatarError) {
      console.error('生成头像失败:', avatarError);
      // 头像生成失败不影响配置保存，继续执行
    }

    // 8. 返回成功响应
    return NextResponse.json({
      success: true,
      message: '鱼配置已保存',
      saved: {
        id: configId,
        colors,
        behavior,
      },
    });
  } catch (error: any) {
    console.error('保存鱼配置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存鱼配置失败: ' + error.message },
      { status: 500 }
    );
  }
}
