import { randomUUID } from 'crypto';
import { query } from './db';
import { transaction, type Sql } from './gptDb';
import { canEditArticle, type JWTPayload } from './auth';
import { createGptArticle, insertTags, type GptBlockInput, type ArticleType } from './gptPublish';
import { GptError, object, keys, string, level, array, tags, digest, articleId } from './gptContracts';

type Row = Record<string, unknown>;
type Actor = JWTPayload & { status: string };
interface Snapshot { article: Row; blocks: Row[]; tags: string[]; details: Row; revision: string }
type Result = Record<string, unknown>;

export async function getGptActor(authorId: string, sql: Sql = query): Promise<Actor> {
  const users = await sql<Actor[]>('SELECT id, username, email, role, status, max_access_level FROM users WHERE id = ?', [authorId]);
  const user = users[0];
  if (!user || user.status !== 'active' || !['admin', 'moderator'].includes(user.role)) throw new GptError(403, 'GPT key must map to an active admin or moderator');
  return user;
}

function parseJson(value: unknown): unknown {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

async function snapshot(sql: Sql, id: string, actor: Actor, lock = false): Promise<Snapshot> {
  const rows = await sql<Row[]>(`SELECT id, title, author, author_id, excerpt, type, category_id, status,
    published_at, updated_at, visible_access_level, full_access_level, cover_image, cover_access_level
    FROM articles WHERE id = ?${lock ? ' FOR UPDATE' : ''}`, [id]);
  const article = rows[0];
  if (!article) throw new GptError(404, 'Article not found');
  if (!canEditArticle(actor, article.author as string, article.author_id as string)) throw new GptError(403, 'Cannot manage this article with this GPT identity');
  const blocks = await sql<Row[]>(`SELECT b.id, b.type, b.content, b.access_level, b.media_id, ab.\`order\`
    FROM article_blocks ab JOIN blocks b ON b.id = ab.block_id
    WHERE ab.article_id = ? ORDER BY ab.\`order\`, b.id${lock ? ' FOR UPDATE' : ''}`, [id]);
  if (blocks.some(b => Number(b.access_level ?? 1) > Number(actor.max_access_level ?? 3))) throw new GptError(403, 'GPT identity cannot read all article blocks; increase its access level explicitly');
  const tagRows = await sql<Array<{name: string}>>('SELECT t.name FROM tags t JOIN article_tags at ON at.tag_id = t.id WHERE at.article_id = ? ORDER BY t.name', [id]);
  const details = (await sql<Row[]>('SELECT summary, metadata, rating_reason FROM gpt_article_details WHERE article_id = ?', [id]))[0] ?? {};
  if (details.metadata) details.metadata = parseJson(details.metadata);
  const state = { article, blocks, tags: tagRows.map(t => t.name), details };
  return { ...state, revision: digest(state) };
}

function checkRevision(body: Row, state: Snapshot) {
  if (string(body.expected_revision, 'expected_revision', 64) !== state.revision) throw new GptError(409, 'Article changed. Read it again and reapply the edit to the new revision.');
}

async function once(actor: Actor, operation: string, body: Row, work: (sql: Sql) => Promise<Result>): Promise<Result> {
  const requestId = string(body.request_id, 'request_id', 80);
  if (!/^[\w-]+$/.test(requestId)) throw new GptError(400, 'request_id must contain only letters, numbers, underscore or hyphen');
  const hash = digest(body);
  return transaction(async sql => {
    await sql('INSERT INTO gpt_requests (author_id, request_id, operation, payload_hash) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE request_id = request_id', [actor.id, requestId, operation, hash]);
    const [entry] = await sql<Row[]>('SELECT operation, payload_hash, result FROM gpt_requests WHERE author_id = ? AND request_id = ? FOR UPDATE', [actor.id, requestId]);
    if (entry.operation !== operation || entry.payload_hash !== hash) throw new GptError(409, 'request_id was already used for different input');
    if (entry.result) return parseJson(entry.result) as Result;
    const result = await work(sql);
    await sql('UPDATE gpt_requests SET result = ? WHERE author_id = ? AND request_id = ?', [JSON.stringify(result), actor.id, requestId]);
    return result;
  });
}

function receipt(state: Snapshot) {
  return { success: true, article_id: state.article.id, revision: state.revision, status: state.article.status,
    block_count: state.blocks.length, tags: state.tags, visible_access_level: state.article.visible_access_level,
    full_access_level: state.article.full_access_level, cover_access_level: state.article.cover_access_level };
}

export async function readArticle(actor: Actor, ref: string, origin: string, offset = 0, blockOffset = 0) {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(blockOffset) || blockOffset < 0) throw new GptError(400, 'Offsets must be nonnegative integers');
  return transaction(async sql => {
    const state = await snapshot(sql, articleId(ref, origin), actor);
    if (offset > state.blocks.length || (offset === state.blocks.length && blockOffset)) throw new GptError(400, 'Offset is outside the article');
    const page: Row[] = [];
    let next: {offset: number; block_offset: number} | null = null;
    let budget = 24000;
    for (let i = offset; i < state.blocks.length; i++) {
      const b = state.blocks[i];
      const raw = typeof b.content === 'string' ? b.content : JSON.stringify(b.content);
      const start = i === offset ? blockOffset : 0;
      if (start > raw.length) throw new GptError(400, 'block_offset is outside the block');
      const chunk = raw.slice(start, start + Math.min(8000, budget));
      page.push({ id: b.id, type: b.type, access_level: b.access_level, media_id: b.media_id, order: b.order,
        content_json: chunk, content_offset: start, content_length: raw.length });
      budget -= chunk.length;
      if (start + chunk.length < raw.length) { next = {offset: i, block_offset: start + chunk.length}; break; }
      if (page.length >= 10 || budget <= 0) { if (i + 1 < state.blocks.length) next = {offset: i + 1, block_offset: 0}; break; }
    }
    return { ...receipt(state), article: { title: state.article.title, excerpt: state.article.excerpt,
      article_type: state.article.type, category_id: state.article.category_id,
      summary: state.details.summary ?? null, metadata: state.details.metadata ?? {}, rating_reason: state.details.rating_reason ?? null }, blocks: page, next,
      hint: 'content_json is a slice of the stored JSON string. Concatenate slices for a block before parsing. Keep one revision across pages; restart if it changes.' };
  });
}

function metadata(value: unknown): Row {
  const data = object(value);
  keys(data, ['source_url', 'language', 'description']);
  for (const [key, value] of Object.entries(data)) {
    string(value, key, key === 'language' ? 35 : 2000, true);
  }
  if (data.source_url) {
    let url: URL;
    try { url = new URL(data.source_url as string); } catch { throw new GptError(400, 'Invalid source_url'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new GptError(400, 'Invalid source_url');
  }
  return data;
}

async function saveDetails(sql: Sql, id: string, prior: Row, body: Row) {
  const summary = body.summary === undefined ? prior.summary ?? null : string(body.summary, 'summary', 2000, true);
  const merged = { ...object(prior.metadata ?? {}), ...(body.metadata === undefined ? {} : metadata(body.metadata)) };
  const reason = body.rating_reason === undefined ? prior.rating_reason ?? null : string(body.rating_reason, 'rating_reason', 2000);
  await sql(`INSERT INTO gpt_article_details (article_id, summary, metadata, rating_reason) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE summary = VALUES(summary), metadata = VALUES(metadata), rating_reason = VALUES(rating_reason)`,
    [id, summary, JSON.stringify(merged), reason]);
}

export async function curateArticle(actor: Actor, body: Row, origin: string) {
  keys(body, ['article_ref', 'request_id', 'expected_revision', 'tags', 'tag_mode', 'summary', 'excerpt', 'metadata', 'block_order', 'block_splits']);
  if (!['tags', 'summary', 'excerpt', 'metadata', 'block_order', 'block_splits'].some(k => body[k] !== undefined)) throw new GptError(400, 'No curation changes supplied');
  const id = articleId(body.article_ref, origin);
  if (body.tag_mode !== undefined && !['append', 'replace'].includes(body.tag_mode as string)) throw new GptError(400, 'tag_mode must be append or replace');
  return once(actor, 'curate', body, async sql => {
    const state = await snapshot(sql, id, actor, true);
    checkRevision(body, state);
    if (body.tags !== undefined) {
      const incoming = tags(body.tags);
      if (body.tag_mode === 'replace') await sql('DELETE FROM article_tags WHERE article_id = ?', [id]);
      await insertTags(id, incoming, sql);
    }
    let order = state.blocks.map(b => b.id as string);
    if (body.block_order !== undefined) {
      const requested = array(body.block_order, 'block_order', 500).map(v => string(v, 'block id', 36));
      if (requested.length !== order.length || new Set(requested).size !== order.length || requested.some(v => !order.includes(v))) throw new GptError(400, 'block_order must list every current block ID exactly once');
      order = requested;
    }
    const splitIds = new Set<string>();
    for (const value of body.block_splits === undefined ? [] : array(body.block_splits, 'block_splits', 20)) {
      const split = object(value); keys(split, ['block_id', 'parts']);
      const target = state.blocks.find(b => b.id === split.block_id);
      if (!target || target.type !== 'text' || splitIds.has(target.id as string)) throw new GptError(400, 'Each split must target a distinct existing text block');
      splitIds.add(target.id as string);
      const parts = array(split.parts, 'parts', 20).map(p => string(p, 'part', 60000));
      const content = object(parseJson(target.content));
      if (parts.length < 2 || parts.join('') !== content.content) throw new GptError(400, 'Split parts must concatenate exactly to the original text, including whitespace');
      const ids: string[] = [];
      for (const part of parts) {
        const blockId = randomUUID(); ids.push(blockId);
        await sql('INSERT INTO blocks (id, type, content, author, access_level, media_id) VALUES (?, ?, ?, ?, ?, ?)', [blockId, 'text', JSON.stringify({...content, content: part}), state.article.author, target.access_level ?? 1, null]);
        await sql('INSERT INTO article_blocks (article_id, block_id, `order`) VALUES (?, ?, ?)', [id, blockId, 0]);
      }
      await sql('DELETE FROM article_blocks WHERE article_id = ? AND block_id = ?', [id, target.id]);
      order.splice(order.indexOf(target.id as string), 1, ...ids);
      // Shared blocks are never rewritten or deleted: other articles retain their original content.
    }
    if (body.block_order !== undefined || splitIds.size) {
      for (let i = 0; i < order.length; i++) await sql('UPDATE article_blocks SET `order` = ? WHERE article_id = ? AND block_id = ?', [i, id, order[i]]);
    }
    await saveDetails(sql, id, state.details, body);
    if (body.excerpt !== undefined || body.summary !== undefined) {
      const excerpt = body.excerpt === undefined ? string(body.summary, 'summary', 2000, true).slice(0, 500) : string(body.excerpt, 'excerpt', 500, true);
      await sql('UPDATE articles SET excerpt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [excerpt, id]);
    } else await sql('UPDATE articles SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return receipt(await snapshot(sql, id, actor));
  });
}

function ratedBlocks(value: unknown, actor: Actor): GptBlockInput[] {
  const blocks = array(value, 'blocks', 80).map(value => {
    const b = object(value); keys(b, ['type', 'content', 'language', 'media_id', 'title', 'description', 'access_level']);
    const access = level(b.access_level);
    if (access > Number(actor.max_access_level ?? 3)) throw new GptError(403, 'Cannot assign a level above the GPT identity access level');
    if (!['text', 'code', 'image'].includes(b.type as string)) throw new GptError(400, 'Block type must be text, code or image');
    if (b.type === 'image') string(b.media_id, 'media_id', 36);
    else string(b.content, 'content', 60000);
    if (b.language !== undefined) string(b.language, 'language', 80);
    if (b.title !== undefined) string(b.title, 'block title', 255, true);
    if (b.description !== undefined) string(b.description, 'description', 2000, true);
    return b as unknown as GptBlockInput;
  });
  if (!blocks.length) throw new GptError(400, 'blocks must not be empty');
  return blocks;
}

export async function saveRatedArticle(actor: Actor, body: Row, origin: string) {
  keys(body, ['article_ref', 'expected_revision', 'request_id', 'title', 'summary', 'excerpt', 'tags', 'category_id', 'article_type', 'blocks', 'status', 'rating_reason', 'metadata']);
  const status = body.status ?? 'draft';
  if (!['draft', 'published'].includes(status as string)) throw new GptError(400, 'status must be draft or published');
  // Existing drafts use the same tool for their state transition; curation handles non-destructive edits.
  if (body.article_ref !== undefined) {
    keys(body, ['article_ref', 'expected_revision', 'request_id', 'status']);
    if (body.status === undefined) throw new GptError(400, 'status is required for existing articles');
    const id = articleId(body.article_ref, origin);
    return once(actor, 'save-rated', body, async sql => {
      const state = await snapshot(sql, id, actor, true); checkRevision(body, state);
      if (!state.blocks.length) throw new GptError(400, 'Cannot publish an empty article');
      for (const block of state.blocks) level(block.access_level ?? 1);
      await sql("UPDATE articles SET status = ?, published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, status, id]);
      return receipt(await snapshot(sql, id, actor));
    });
  }
  if (body.expected_revision !== undefined) throw new GptError(400, 'expected_revision is only for existing articles');
  string(body.title, 'title', 255); string(body.summary, 'summary', 2000); string(body.rating_reason, 'rating_reason', 2000);
  if (body.excerpt !== undefined) string(body.excerpt, 'excerpt', 500, true);
  const articleType = (body.article_type ?? 'text') as ArticleType;
  if (!['default', 'text', 'image', 'code', 'diary', 'drawing'].includes(articleType)) throw new GptError(400, 'Invalid article_type');
  const blocks = ratedBlocks(body.blocks, actor);
  const cleanTags = tags(body.tags ?? []);
  return once(actor, 'save-rated', body, async sql => {
    if (body.category_id !== undefined) {
      string(body.category_id, 'category_id', 36);
      if (!(await sql<Row[]>('SELECT id FROM categories WHERE id = ?', [body.category_id])).length) throw new GptError(400, 'Unknown category_id');
    }
    for (const block of blocks.filter(b => b.type === 'image')) {
      const media = (await sql<Row[]>('SELECT mime FROM media WHERE id = ?', [block.media_id]))[0];
      if (!media || !String(media.mime).startsWith('image/')) throw new GptError(400, 'Unknown image media_id');
    }
    const result = await createGptArticle({ title: body.title as string, summary: body.summary as string, excerpt: body.excerpt as string | undefined,
      authorId: actor.id, authorName: actor.username, categoryId: body.category_id as string | undefined, articleType,
      tags: cleanTags, blocks, status: status as 'draft' | 'published' }, sql);
    await saveDetails(sql, result.articleId, {}, body);
    return receipt(await snapshot(sql, result.articleId, actor));
  });
}

export async function attachArticleImages(actor: Actor, body: Row, origin: string) {
  keys(body, ['article_ref', 'expected_revision', 'request_id', 'images']);
  const id = articleId(body.article_ref, origin);
  const images = array(body.images, 'images', 5).map(object);
  if (!images.length) throw new GptError(400, 'images must not be empty');
  return once(actor, 'attach-images', body, async sql => {
    const state = await snapshot(sql, id, actor, true); checkRevision(body, state);
    const order = state.blocks.map(b => b.id as string);
    const anchors = new Map<string | null, string>();
    let coverChosen = false;
    const added: string[] = [];
    for (const image of images) {
      keys(image, ['media_id', 'after_block_id', 'title', 'description', 'prompt', 'access_level', 'set_cover']);
      const mediaId = string(image.media_id, 'media_id', 36);
      const access = level(image.access_level);
      if (access > Number(actor.max_access_level ?? 3)) throw new GptError(403, 'Cannot assign a level above the GPT identity access level');
      if (image.after_block_id !== null) string(image.after_block_id, 'after_block_id', 36);
      const anchor = image.after_block_id === null ? null : state.blocks.find(b => b.id === image.after_block_id);
      if (image.after_block_id !== null && !anchor) throw new GptError(400, 'after_block_id is not in this article');
      if (anchor && access < Number(anchor.access_level ?? 1)) throw new GptError(400, 'Image access_level cannot be lower than its anchor block');
      if (image.set_cover !== undefined && typeof image.set_cover !== 'boolean') throw new GptError(400, 'set_cover must be boolean');
      if (image.set_cover && coverChosen) throw new GptError(400, 'Select at most one cover');
      const media = (await sql<Row[]>('SELECT id, url, mime FROM media WHERE id = ?', [mediaId]))[0];
      if (!media || !String(media.mime).startsWith('image/')) throw new GptError(400, 'Unknown image media_id; register/upload the image first');
      const content = { url: media.url, media_id: mediaId,
        title: image.title === undefined ? '' : string(image.title, 'title', 255, true),
        description: string(image.description, 'description', 2000),
        ...(image.prompt === undefined ? {} : { generation_prompt: string(image.prompt, 'prompt', 2000) }) };
      const blockId = randomUUID(); added.push(blockId);
      await sql('INSERT INTO blocks (id, type, content, author, access_level, media_id) VALUES (?, ?, ?, ?, ?, ?)', [blockId, 'image', JSON.stringify(content), actor.username, access, mediaId]);
      await sql('INSERT INTO article_blocks (article_id, block_id, `order`) VALUES (?, ?, ?)', [id, blockId, 0]);
      const anchorId = image.after_block_id as string | null;
      const preceding = anchors.get(anchorId) ?? anchorId;
      order.splice(preceding === null ? 0 : order.indexOf(preceding) + 1, 0, blockId);
      anchors.set(anchorId, blockId);
      if (image.set_cover) {
        coverChosen = true;
        // Prompts are block metadata, never copied into public cover previews.
        const cover = {url: content.url, media_id: content.media_id, title: content.title, description: content.description};
        await sql('UPDATE articles SET cover_image = ?, cover_access_level = ? WHERE id = ?', [JSON.stringify(cover), access, id]);
      }
    }
    for (let i = 0; i < order.length; i++) await sql('UPDATE article_blocks SET `order` = ? WHERE article_id = ? AND block_id = ?', [i, id, order[i]]);
    await sql(`UPDATE articles SET visible_access_level = (SELECT MIN(b.access_level) FROM blocks b JOIN article_blocks ab ON ab.block_id = b.id WHERE ab.article_id = ?),
      full_access_level = (SELECT MAX(b.access_level) FROM blocks b JOIN article_blocks ab ON ab.block_id = b.id WHERE ab.article_id = ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id, id, id]);
    return { ...receipt(await snapshot(sql, id, actor)), added_block_ids: added };
  });
}

export async function searchArticles(actor: Actor, term: string, status: string, offset: number) {
  string(term, 'q', 100, true);
  if (!['all', 'draft', 'published'].includes(status)) throw new GptError(400, 'Invalid status');
  if (!Number.isSafeInteger(offset) || offset < 0) throw new GptError(400, 'Invalid offset');
  const conditions = ['(a.title LIKE ? OR a.excerpt LIKE ?)'];
  const params: unknown[] = [`%${term}%`, `%${term}%`];
  if (actor.role !== 'admin') { conditions.push('(a.author_id = ? OR a.author = ?)'); params.push(actor.id, actor.username); }
  conditions.push('NOT EXISTS (SELECT 1 FROM article_blocks ab JOIN blocks b ON b.id = ab.block_id WHERE ab.article_id = a.id AND COALESCE(b.access_level, 1) > ?)');
  params.push(actor.max_access_level ?? 3);
  if (status !== 'all') { conditions.push('a.status = ?'); params.push(status); }
  const rows = await query<Row[]>(`SELECT a.id, a.title, LEFT(a.excerpt, 240) AS excerpt, a.status, a.type, a.category_id
    FROM articles a WHERE ${conditions.join(' AND ')} ORDER BY a.created_at DESC, a.id LIMIT 21 OFFSET ${offset}`, params);
  return { success: true, articles: rows.slice(0, 20), next_offset: rows.length > 20 ? offset + 20 : null };
}
