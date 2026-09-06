import { NextRequest } from 'next/server';
import { readArticle } from '@/lib/gptContent';
import { gptHandler, siteOrigin } from '@/lib/gptHttp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const p = request.nextUrl.searchParams;
  return gptHandler(request, actor => readArticle(actor, id, siteOrigin(request), Number(p.get('offset') ?? 0), Number(p.get('block_offset') ?? 0)));
}
