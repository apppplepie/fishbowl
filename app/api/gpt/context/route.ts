import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { gptHandler } from '@/lib/gptHttp';
import { GptError, ratingPolicy, string } from '@/lib/gptContracts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  return gptHandler(request, async actor => {
    const q = string(request.nextUrl.searchParams.get('q') ?? '', 'q', 100, true);
    const offset = Number(request.nextUrl.searchParams.get('offset') ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new GptError(400, 'Invalid offset');
    const options = await query<Array<{name: string}>>(`SELECT name FROM tags WHERE name LIKE ? ORDER BY name LIMIT 31 OFFSET ${offset}`, [`%${q}%`]);
    return {success: true, tags: options.slice(0,30).map(t => t.name), next_offset: options.length > 30 ? offset + 30 : null,
      rating_policy: ratingPolicy, identity: {role: actor.role, max_access_level: actor.max_access_level ?? 3},
      image_allowed_hosts: (process.env.GPT_IMAGE_ALLOWED_HOSTS ?? '').split(',').map(s => s.trim()).filter(Boolean)};
  });
}
