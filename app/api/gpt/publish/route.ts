import { NextRequest, NextResponse } from 'next/server';
import { authenticateGptRequest } from '@/lib/gptAuth';
import { createGptArticle, GptBlockInput, markdownToBlocks, resolveArticleType, validateMomentType } from '@/lib/gptPublish';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PublishRequest {
  title: string;
  summary?: string;
  excerpt?: string | null;
  moment_type?: string;
  article_type?: string;
  category_id?: string | null;
  tags?: string[];
  blocks?: GptBlockInput[];
  content?: string;
  images?: Array<{ url: string; name?: string; description?: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateGptRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const body: PublishRequest = await request.json();
    const momentType = body.moment_type ? validateMomentType(body.moment_type) : undefined;
    const articleType = resolveArticleType(body.article_type, momentType);
    const blocks = Array.isArray(body.blocks) && body.blocks.length > 0
      ? body.blocks
      : markdownToBlocks(body.content || '', body.images || []);

    const result = await createGptArticle({
      title: body.title,
      authorId: auth.authorId!,
      summary: body.summary,
      excerpt: body.excerpt,
      categoryId: body.category_id,
      tags: body.tags || [],
      blocks,
      momentType,
      articleType,
    });

    const baseUrl = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost'}`;

    return NextResponse.json({
      success: true,
      article_id: result.articleId,
      articleId: result.articleId,
      url: `${baseUrl}/article/${result.articleId}`,
      title: body.title.trim(),
      article_type: result.articleType,
      category_id: result.categoryId,
      categoryId: result.categoryId,
      tags: result.tags,
      blockCount: result.blockCount,
      imageCount: result.imageCount,
      message: 'Article published successfully',
    });
  } catch (error: any) {
    console.error('[GPT Publish] publish failed:', error);
    const message = error?.message || 'Internal server error';
    const status = /required|must be|invalid|too large/i.test(message) ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
