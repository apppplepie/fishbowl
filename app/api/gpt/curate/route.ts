import { NextRequest } from 'next/server';
import { curateArticle } from '@/lib/gptContent';
import { gptHandler, jsonBody, siteOrigin } from '@/lib/gptHttp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  return gptHandler(request, async actor => { return curateArticle(actor, await jsonBody(request), siteOrigin(request)); });
}
