import { NextRequest } from 'next/server';
import { attachArticleImages } from '@/lib/gptContent';
import { gptHandler, jsonBody, siteOrigin } from '@/lib/gptHttp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  return gptHandler(request, async actor => { return attachArticleImages(actor, await jsonBody(request), siteOrigin(request)); });
}
