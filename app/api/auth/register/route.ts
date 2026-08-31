import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { generateVisualsFromId } from '@/app/components/ui/colorUtils';

/**
 * POST /api/auth/register - 用户注册
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password, display_name } = body;

    // 1. 验证必填字段
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: '用户名、邮箱和密码不能为空' },
        { status: 400 }
      );
    }

    // 2. 验证用户名格式（3-20字符，字母数字下划线）
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { success: false, error: '用户名必须是3-20个字符，只能包含字母、数字和下划线' },
        { status: 400 }
      );
    }

    // 3. 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 4. 验证密码强度（至少6个字符）
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少需要6个字符' },
        { status: 400 }
      );
    }

    // 5. 检查用户名是否已存在
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

    // 6. 检查邮箱是否已存在
    const existingEmail = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    ) as any[];

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { success: false, error: '邮箱已被注册' },
        { status: 400 }
      );
    }

    // 7. 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 8. 创建用户
    const userId = uuidv4();
    await query(
      `INSERT INTO users 
       (id, username, email, password_hash, display_name, role, status, email_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username,
        email,
        passwordHash,
        display_name || username,
        'user', // 默认角色
        'active',
        false // 邮箱未验证
      ]
    );

    // 9. 创建用户设置
    await query(
      'INSERT INTO user_settings (user_id) VALUES (?)',
      [userId]
    );

    // 10. 根据用户ID生成渐变色头像
    let avatarBase64: string | null = null;
    try {
      const gradientConfig = generateVisualsFromId(userId);
      
      // 从渐变配置中提取颜色
      const hslMatch = gradientConfig.background.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/g);
      if (hslMatch && hslMatch.length >= 2) {
        const hsl1 = hslMatch[0].match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        const hsl2 = hslMatch[1].match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        
        if (hsl1 && hsl2) {
          const h1 = parseInt(hsl1[1]), s1 = parseInt(hsl1[2]), l1 = parseInt(hsl1[3]);
          const h2 = parseInt(hsl2[1]), s2 = parseInt(hsl2[2]), l2 = parseInt(hsl2[3]);
          
          // HSL to RGB conversion
          const hslToRgb = (h: number, s: number, l: number) => {
            h /= 360; s /= 100; l /= 100;
            const hue2rgb = (p: number, q: number, t: number) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1/6) return p + (q - p) * 6 * t;
              if (t < 1/2) return q;
              if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
              return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
            const g = Math.round(hue2rgb(p, q, h) * 255);
            const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
            return { r, g, b };
          };
          
          const color1 = hslToRgb(h1, s1, l1);
          const color2 = hslToRgb(h2, s2, l2);
          
          // 提取渐变角度并转换为 SVG 坐标
          const angleMatch = gradientConfig.background.match(/linear-gradient\((\d+)deg/);
          const angle = angleMatch ? parseInt(angleMatch[1]) : 45;
          
          // 将角度转换为弧度，计算渐变方向
          const radians = (angle * Math.PI) / 180;
          const x1 = 128 - 128 * Math.cos(radians);
          const y1 = 128 - 128 * Math.sin(radians);
          const x2 = 128 + 128 * Math.cos(radians);
          const y2 = 128 + 128 * Math.sin(radians);
          
          // 生成 SVG（圆形渐变色头像）
          const svg = `
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="avatarGradient" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <stop offset="0%" stop-color="rgb(${color1.r}, ${color1.g}, ${color1.b})" />
      <stop offset="100%" stop-color="rgb(${color2.r}, ${color2.g}, ${color2.b})" />
    </linearGradient>
  </defs>
  <circle cx="128" cy="128" r="128" fill="url(#avatarGradient)" />
</svg>`;
          
          // 使用 sharp 将 SVG 转换为 PNG base64
          const pngBuffer = await sharp(Buffer.from(svg))
            .resize(256, 256)
            .png()
            .toBuffer();
          
          avatarBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;
          
          // 更新用户的头像
          await query(
            'UPDATE users SET avatar_base64 = ? WHERE id = ?',
            [avatarBase64, userId]
          );
        }
      }
    } catch (avatarError) {
      console.error('生成头像失败:', avatarError);
      // 头像生成失败不影响注册，继续执行
    }

    const session = generateSession({
      id: userId,
      username,
      email,
      role: 'user',
      max_access_level: 3, // 默认用户权限
    });

    const response = NextResponse.json({
      success: true,
      message: '注册成功',
      user: {
        id: userId,
        username,
        email,
        display_name: display_name || username,
        role: 'user',
        max_access_level: 3,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('注册失败:', error);
    return NextResponse.json(
      { success: false, error: '注册失败: ' + error.message },
      { status: 500 }
    );
  }
}

