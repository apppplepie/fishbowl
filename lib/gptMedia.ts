import { lookup } from 'dns/promises';
import { request as httpsRequest } from 'https';
import { BlockList, isIP } from 'net';
import { createHash, randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { query } from './db';
import { generateBlurDataURL } from './blur';
import { GptError, string } from './gptContracts';

const MAX_BYTES = 5 * 1024 * 1024;
const blocked = new BlockList();
for (const [network, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]] as const) blocked.addSubnet(network, prefix, 'ipv4');
const globalV6 = new BlockList(); globalV6.addSubnet('2000::', 3, 'ipv6');
const blockedV6 = new BlockList();
blockedV6.addSubnet('2001::', 23, 'ipv6'); blockedV6.addSubnet('2001:db8::', 32, 'ipv6'); blockedV6.addSubnet('2002::', 16, 'ipv6');
export function publicAddress(address: string) {
  const family = isIP(address);
  return family === 4 ? !blocked.check(address, 'ipv4') : family === 6 && globalV6.check(address, 'ipv6') && !blockedV6.check(address, 'ipv6');
}
export function remoteImageUrl(value: unknown): URL {
  let url: URL;
  try { url = new URL(string(value, 'url', 4000)); } catch { throw new GptError(400, 'Invalid image URL'); }
  const hosts = (process.env.GPT_IMAGE_ALLOWED_HOSTS ?? '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !hosts.includes(url.hostname)) {
    throw new GptError(400, 'Image URL must use HTTPS and an exact host in GPT_IMAGE_ALLOWED_HOSTS');
  }
  return url;
}

/** Custom GPT Actions file bridge: runtime fills openaiFileIdRefs with objects (or URLs). */
export function actionFileDownloadLinks(refs: unknown): string[] {
  if (!Array.isArray(refs) || refs.length === 0) {
    throw new GptError(400, 'openaiFileIdRefs must be a non-empty array of conversation files');
  }
  if (refs.length > 10) throw new GptError(400, 'openaiFileIdRefs allows at most 10 files');
  const links: string[] = [];
  for (const item of refs) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (/^https:\/\//i.test(trimmed)) {
        links.push(trimmed);
        continue;
      }
      throw new GptError(
        400,
        'openaiFileIdRefs still looks like a local path or file id. Pass conversation image files so Actions can bridge them to download_link HTTPS URLs.'
      );
    }
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      const link = typeof row.download_link === 'string' ? row.download_link.trim()
        : typeof row.url === 'string' ? row.url.trim()
        : '';
      if (/^https:\/\//i.test(link)) {
        links.push(link);
        continue;
      }
      throw new GptError(
        400,
        'openaiFileIdRefs entry missing https download_link (Actions file bridge did not convert the file)'
      );
    }
    throw new GptError(400, 'Invalid openaiFileIdRefs entry');
  }
  return links;
}

async function downloadHttpsPublicImage(url: URL): Promise<Buffer> {
  const addresses = await Promise.race([
    lookup(url.hostname, {all: true}),
    new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new GptError(504, 'Image DNS lookup timed out')), 3000); timer.unref(); }),
  ]);
  if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new GptError(400, 'Image host resolves to a non-public address');
  // Pin the validated address in lookup. No redirect following, cookies or authorization forwarding.
  return new Promise((resolve, reject) => {
    const chosen = addresses[0];
    const req = httpsRequest(url, {lookup: (_host, options, callback) => {
      if (options.all) callback(null, [chosen]);
      else callback(null, chosen.address, chosen.family);
    }}, response => {
      if (response.statusCode !== 200) { response.resume(); reject(new GptError(400, 'Image host must return 200 directly (redirects are not accepted)')); return; }
      const chunks: Buffer[] = []; let bytes = 0;
      response.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) req.destroy(new GptError(400, 'Image exceeds 5 MB'));
        else chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    const timer = setTimeout(() => req.destroy(new GptError(504, 'Image download timed out')), 12000);
    req.on('close', () => clearTimeout(timer));
    req.on('error', reject); req.end();
  });
}

export async function downloadRemoteImage(value: unknown): Promise<Buffer> {
  return downloadHttpsPublicImage(remoteImageUrl(value));
}

/** Download a short-lived Actions file URL (openaiFileIdRefs). Host allowlist is not used; SSRF checks still apply. */
export async function downloadActionFile(value: unknown): Promise<Buffer> {
  let url: URL;
  try { url = new URL(string(value, 'download_link', 4000)); } catch { throw new GptError(400, 'Invalid action file download_link'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new GptError(400, 'Action file download_link must be HTTPS on port 443');
  }
  return downloadHttpsPublicImage(url);
}

export async function storeImage(buffer: Buffer) {
  if (!buffer.length || buffer.length > MAX_BYTES) throw new GptError(400, 'Image must contain 1 byte to 5 MB');
  let info: sharp.Metadata;
  try { info = await sharp(buffer, {limitInputPixels: 40000000}).metadata(); }
  catch { throw new GptError(400, 'Invalid image data'); }
  if (!info.format || !['jpeg','png','webp','gif'].includes(info.format) || !info.width || !info.height) throw new GptError(400, 'Supported formats: JPEG, PNG, WebP, GIF');
  const sha = createHash('sha256').update(buffer).digest('hex');
  const existing = await query<Array<{id: string; url: string}>>('SELECT id, url FROM media WHERE sha256 = ? LIMIT 1', [sha]);
  if (existing.length) return {success: true, media_id: existing[0].id, url: existing[0].url};
  const now = new Date();
  const directory = `/uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth()+1).padStart(2,'0')}`;
  const filename = `${sha}.${info.format === 'jpeg' ? 'jpg' : info.format}`;
  const disk = path.join(process.cwd(), 'public', directory);
  await mkdir(disk, {recursive: true});
  await writeFile(path.join(disk, filename), buffer);
  const id = randomUUID(); const url = `${directory}/${filename}`;
  const blur = await generateBlurDataURL(buffer).catch(() => null);
  await query(`INSERT INTO media (id, url, mime, width, height, aspect_ratio, size_bytes, sha256, source, blur_data_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, url, `image/${info.format}`, info.width, info.height, info.width/info.height, buffer.length, sha, 'chatgpt_action', blur]);
  return {success: true, media_id: id, url};
}
