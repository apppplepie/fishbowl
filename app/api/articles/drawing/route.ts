/**
 * 绘画作品专用 API
 * 优化：直接在列表查询中返回封面图片，避免 N+1 查询
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, refreshAccessToken, TOKEN_EXPIRATION, verifyRefreshToken } from '@/lib/auth';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // 支持 page 参数（用于横向瀑布流）和 offset 参数（用于纵向瀑布流）
    const page = searchParams.get('page');
    const offsetParam = searchParams.get('offset');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    // 如果提供了 page 参数，计算 offset；否则使用 offset 参数
    const offset = page 
      ? (parseInt(page, 10) - 1) * limit 
      : parseInt(offsetParam || '0', 10);

    // 获取当前用户权限（如果 access token 过期但 refresh token 仍有效，尝试补齐权限）
    const currentUser = getCurrentUser(request);
    let userAccessLevel = currentUser ? (currentUser.max_access_level || 3) : 2; // 登录用户默认3级，游客2级
    let refreshedTokens: { accessToken: string; refreshToken: string } | null = null;
    if (!currentUser) {
      const refreshToken = request.cookies.get('refresh-token')?.value;
      if (refreshToken) {
        const refreshPayload = verifyRefreshToken(refreshToken);
        if (refreshPayload) {
          userAccessLevel = refreshPayload.max_access_level || 3;
          refreshedTokens = refreshAccessToken(refreshToken);
        }
      }
    }

    // 查询绘画作品：使用预设封面而非动态查询blocks
    const articles = await query<any[]>(
      `SELECT
        a.id,
        a.title,
        a.author,
        a.author_id,
        a.published_at,
        a.created_at,
        a.updated_at,
        a.excerpt,
        a.type,
        a.likes,
        a.comments,
        a.shares,
        a.visible_access_level,
        a.full_access_level,
        -- 封面图片处理：根据权限返回真实封面或占位符，并带上 media 的 width/height 供瀑布流按比例占位
        CASE
          WHEN a.cover_image IS NOT NULL AND a.cover_access_level <= ? THEN
            JSON_OBJECT(
              'url', JSON_UNQUOTE(JSON_EXTRACT(a.cover_image, '$.url')),
              'title', JSON_UNQUOTE(JSON_EXTRACT(a.cover_image, '$.title')),
              'description', JSON_UNQUOTE(JSON_EXTRACT(a.cover_image, '$.description')),
              'width', m.width,
              'height', m.height,
              'aspect_ratio', m.aspect_ratio
            )
          WHEN a.cover_image IS NOT NULL THEN
            JSON_OBJECT(
              'url', '${PLACEHOLDER_IMAGE_URL}',
              'title', '内容受限',
              'description', CONCAT('需要', a.cover_access_level, '级权限'),
              'width', m.width,
              'height', m.height,
              'aspect_ratio', m.aspect_ratio
            )
          ELSE NULL
        END as cover_image,
        -- 是否为占位符封面
        CASE
          WHEN a.cover_image IS NOT NULL AND a.cover_access_level > ? THEN true
          ELSE false
        END as cover_is_placeholder
       FROM articles a
       LEFT JOIN (
         SELECT article_id, block_id FROM (
           SELECT ab.article_id, ab.block_id,
             ROW_NUMBER() OVER (PARTITION BY ab.article_id ORDER BY ab.\`order\`) as rn
           FROM article_blocks ab
           INNER JOIN blocks b ON b.id = ab.block_id AND b.type = 'image'
         ) t WHERE rn = 1
       ) first_img ON first_img.article_id = a.id
       LEFT JOIN blocks b_cover ON b_cover.id = first_img.block_id
       LEFT JOIN media m ON m.id = b_cover.media_id
       WHERE a.type = 'drawing'
         AND a.status = 'published'
       ORDER BY a.updated_at DESC, a.published_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [userAccessLevel, userAccessLevel]
    );

    const normalizeCoverImage = (value: any) => {
      if (!value) return null;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return null;
        }
      }
      return value;
    };

    // 处理封面数据
    const processedArticles = articles.map(article => {
      const coverImage = normalizeCoverImage(article.cover_image);
      return {
        ...article,
        cover_image: coverImage,
        cover_image_url: coverImage?.url || null, // 提取封面图片URL供前端使用
        cover_is_placeholder: article.cover_is_placeholder || false,
      };
    });

    // 获取每篇文章的标签
    for (const article of processedArticles) {
      const tags = await query<any[]>(
        `SELECT t.id, t.name 
         FROM tags t
         JOIN article_tags at ON t.id = at.tag_id
         WHERE at.article_id = ?
         ORDER BY t.name ASC`,
        [article.id]
      );
      article.tags = tags.map((t: any) => t.name);
    }

    const response = NextResponse.json({
      success: true,
      articles: processedArticles,
      count: processedArticles.length,
    });
    
    // 如果通过 refresh token 补齐了权限，同时刷新 cookie
    if (refreshedTokens) {
      response.cookies.set('access-token', refreshedTokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: TOKEN_EXPIRATION.ACCESS_TOKEN_COOKIE,
        path: '/',
      });
      response.cookies.set('refresh-token', refreshedTokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: TOKEN_EXPIRATION.REFRESH_TOKEN_COOKIE,
        path: '/',
      });
    }

    return response;

  } catch (error: any) {
    console.error('获取绘画作品失败:', error);
    return NextResponse.json(
      { success: false, error: '获取绘画作品失败: ' + error.message },
      { status: 500 }
    );
  }
}

