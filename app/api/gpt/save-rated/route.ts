import { NextRequest } from 'next/server';
import { saveRatedArticle } from '@/lib/gptContent';
import { gptHandler, jsonBody, siteOrigin } from '@/lib/gptHttp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  return gptHandler(request, async actor => { return saveRatedArticle(actor, await jsonBody(request), siteOrigin(request)); });
}
