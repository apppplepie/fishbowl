import { NextRequest } from 'next/server';
import { gptHandler, jsonBody } from '@/lib/gptHttp';
import { downloadRemoteImage, storeImage } from '@/lib/gptMedia';
import { keys } from '@/lib/gptContracts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  return gptHandler(request, async () => {
    const body = await jsonBody(request); keys(body, ['url']);
    return storeImage(await downloadRemoteImage(body.url));
  });
}
