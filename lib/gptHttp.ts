import { NextRequest, NextResponse } from 'next/server';
import { authenticateGptRequest } from './gptAuth';
import { getGptActor } from './gptContent';
import { GptError, object } from './gptContracts';

export function siteOrigin(request: NextRequest) {
  return new URL(process.env.GPT_SITE_URL || request.nextUrl.origin).origin;
}
export async function jsonBody(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw new GptError(400, 'JSON body required');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 90000) { await reader.cancel(); throw new GptError(413, 'Request exceeds 90000 bytes; use smaller edits or registered media'); }
    chunks.push(value);
  }
  try { return object(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
  catch (error) { if (error instanceof GptError) throw error; throw new GptError(400, 'Invalid JSON'); }
}
export async function gptHandler(request: NextRequest, work: (actor: Awaited<ReturnType<typeof getGptActor>>) => Promise<unknown>) {
  try {
    const auth = authenticateGptRequest(request);
    if (!auth.success) throw new GptError(auth.status ?? 401, auth.error ?? 'Unauthorized');
    const actor = await getGptActor(auth.authorId!);
    return NextResponse.json(await work(actor), {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof GptError) return NextResponse.json({success: false, error: error.message}, {status: error.status});
    console.error('[GPT Tools] Request failed:', error instanceof Error ? error.name : 'Unknown error');
    return NextResponse.json({success: false, error: 'Internal error; check server logs and required migration'}, {status: 500});
  }
}
