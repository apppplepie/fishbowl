import { NextRequest, NextResponse } from 'next/server';
import { buildGptOpenapi } from '@/lib/gptOpenapi';
import { siteOrigin } from '@/lib/gptHttp';
export async function GET(request: NextRequest) {
  const bundle = request.nextUrl.searchParams.get('tool') ?? undefined;
  if (bundle && !['curate', 'publish', 'illustrate'].includes(bundle)) return NextResponse.json({error:'Unknown tool bundle'}, {status:400});
  return NextResponse.json(buildGptOpenapi(`${siteOrigin(request)}/api/gpt`, bundle));
}
