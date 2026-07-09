import { NextRequest, NextResponse } from 'next/server';
import { authenticateGptRequest } from '@/lib/gptAuth';
import { createGptArticle, GptBlockInput, resolveArticleType, validateMomentType } from '@/lib/gptPublish';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MomentCreateRequest {
  title: string;
  moment_type: string;
  article_type?: string;
  summary: string;
  excerpt?: string | null;
  category_id?: string | null;
  tags?: string[];
  blocks: GptBlockInput[];
}

export async function POST(request: NextRequest) {
  console.log("[GPT ping] /moments", {
    time: new Date().toISOString(),
    ua: request.headers.get("user-agent"),
    authPrefix: request.headers.get("authorization")?.slice(0, 25),
    ip: request.headers.get("x-forwarded-for") || (request as any).ip || "unknown",
  });

  try {
    const auth = authenticateGptRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const body: MomentCreateRequest = await request.json();
    const momentType = validateMomentType(body.moment_type);
    const articleType = resolveArticleType(body.article_type, momentType);

    if (!body.summary || typeof body.summary !== 'string' || !body.summary.trim()) {
      return NextResponse.json(
        { success: false, error: 'summary is required' },
        { status: 400 }
      );
    }

    const result = await createGptArticle({
      title: body.title,
      authorId: auth.authorId!,
      summary: body.summary,
      excerpt: body.excerpt,
      categoryId: body.category_id,
      tags: body.tags || [],
      blocks: body.blocks,
      momentType,
      articleType,
    });

    const baseUrl = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost'}`;

    return NextResponse.json({
      success: true,
      article_id: result.articleId,
      articleId: result.articleId,
      momentId: result.articleId,
      url: `${baseUrl}/article/${result.articleId}`,
      message: 'Moment saved successfully',
      title: body.title.trim(),
      moment_type: momentType,
      article_type: result.articleType,
      category_id: result.categoryId,
      categoryId: result.categoryId,
      tags: result.tags,
      blockCount: result.blockCount,
      imageCount: result.imageCount,
    });
  } catch (error: any) {
    console.error('[GPT Moments] save failed:', error);
    const message = error?.message || 'Internal server error';
    const status = /required|must be|invalid|too large/i.test(message) ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
