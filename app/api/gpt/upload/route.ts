import { NextRequest, NextResponse } from 'next/server';
import { authenticateGptRequest } from '@/lib/gptAuth';
import { actionFileDownloadLinks, downloadActionFile, storeImage } from '@/lib/gptMedia';
import { GptError } from '@/lib/gptContracts';
import { query } from '@/lib/db';
import { siteOrigin } from '@/lib/gptHttp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Prefer openaiFileIdRefs (Actions file bridge). base64 remains a fallback. */
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateGptRequest(request);
    if (!auth.success) return NextResponse.json({success:false,error:auth.error},{status:auth.status ?? 401});
    const reader = request.body?.getReader();
    if (!reader) throw new GptError(400, 'JSON body required');
    const chunks: Uint8Array[] = []; let total = 0;
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      total += value.length;
      if (total > 7100000) { await reader.cancel(); throw new GptError(413, 'Upload exceeds 5 MB decoded'); }
      chunks.push(value);
    }
    let body: any;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new GptError(400, 'Invalid JSON'); }

    let buffer: Buffer;
    if (body?.openaiFileIdRefs != null) {
      const links = actionFileDownloadLinks(body.openaiFileIdRefs);
      buffer = await downloadActionFile(links[0]);
    } else if (typeof body?.base64 === 'string') {
      const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(body.base64);
      if (!match) throw new GptError(400, 'Invalid image base64 data URL');
      buffer = Buffer.from(match[2], 'base64');
      if (buffer.toString('base64') !== match[2]) throw new GptError(400, 'Invalid base64 encoding');
    } else {
      throw new GptError(400, 'Provide openaiFileIdRefs (preferred) or base64');
    }

    const saved = await storeImage(buffer);
    const [media] = await query<Array<{mime:string;size_bytes:number;width:number;height:number;aspect_ratio:number}>>('SELECT mime, size_bytes, width, height, aspect_ratio FROM media WHERE id = ?', [saved.media_id]);
    return NextResponse.json({...saved,fullUrl:`${siteOrigin(request)}${saved.url}`,filename:saved.url.split('/').pop(),mimeType:media.mime,sizeBytes:media.size_bytes,width:media.width,height:media.height,aspect_ratio:media.aspect_ratio});
  } catch (error) {
    const status = error instanceof GptError ? error.status : 500;
    return NextResponse.json({success:false,error:error instanceof GptError ? error.message : 'Image upload failed'}, {status});
  }
}
