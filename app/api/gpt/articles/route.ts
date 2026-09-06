import { NextRequest, NextResponse } from 'next/server';
import { authenticateGptRequest } from '@/lib/gptAuth';
import { createGptArticle, type GptBlockInput } from '@/lib/gptPublish';
import { searchArticles } from '@/lib/gptContent';
import { gptHandler } from '@/lib/gptHttp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  return gptHandler(request, actor => searchArticles(actor, p.get('q') ?? '', p.get('status') ?? 'all', Number(p.get('offset') ?? 0)));
}

// Legacy POST remains available; new GPTs use saveRatedArticle.
interface GptPublishRequest {
  title: string;                     // 必填：文章标题
  blocks?: GptBlockInput[];          // 新版：文章内容块
  content?: GptBlockInput[];         // 旧版兼容：文章内容块
  tags?: string[];                   // 可选：标签列表
  category_id?: string;              // 可选：分类 ID
  summary?: string;                  // 可选：总结
  excerpt?: string;                  // 可选：摘要，不传则自动生成
  article_type?: string;             // 可选：文章类型
  moment_type?: string;              // 可选：语义类型
}


export async function POST(request: NextRequest) {
  try {
    // 1. 认证 GPT 请求
    const auth = await authenticateGptRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body: GptPublishRequest = await request.json();

    // 3. 参数验证
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Article title is required (string)' },
        { status: 400 }
      );
    }

    const inputBlocks = Array.isArray(body.blocks) && body.blocks.length > 0 ? body.blocks : body.content;
    if (!inputBlocks || !Array.isArray(inputBlocks) || inputBlocks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'blocks is required (non-empty array)' },
        { status: 400 }
      );
    }

    // 4. 发布文章
    const result = await createGptArticle({
      title: body.title,
      authorId: auth.authorId!,
      blocks: inputBlocks,
      summary: body.summary,
      tags: body.tags || [],
      categoryId: body.category_id || null,
      excerpt: body.excerpt,
      articleType: body.article_type as any,
      momentType: body.moment_type as any,
    });

    // 5. 返回成功响应
    const articleUrl = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost'}/article/${result.articleId}`;

    return NextResponse.json({
      success: true,
      article_id: result.articleId,
      articleId: result.articleId,
      url: articleUrl,
      title: body.title,
      article_type: result.articleType,
      category_id: result.categoryId,
      tags: result.tags,
      blockCount: result.blockCount,
      imageCount: result.imageCount,
      message: 'Article published successfully',
    });

  } catch (error: any) {
    console.error('[GPT Actions] POST /api/gpt/articles error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: error.message?.includes('required') ? 400 : 500 }
    );
  }
}
