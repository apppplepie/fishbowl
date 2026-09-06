import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { query, pool } from '../lib/db';
import { getGptActor, readArticle, curateArticle, saveRatedArticle, attachArticleImages, searchArticles } from '../lib/gptContent';
import { storeImage } from '../lib/gptMedia';
import { POST as curateRoute } from '../app/api/gpt/curate/route';
import { GET as publicArticle } from '../app/api/articles/[id]/route';
import { GET as publicList } from '../app/api/articles/list/route';
import { POST as upload } from '../app/api/gpt/upload/route';
import { createGptArticle } from '../lib/gptPublish';

test('MySQL content workflow and HTTP authorization', {skip: process.env.FISHBOWL_TEST_DB !== '1'}, async t => {
  t.after(async () => { await pool.end(); });
  assert.equal(process.env.DB_NAME,'fishbowl_tools_test','Refuse to initialize any other database');
  assert.equal(process.env.DB_HOST,'127.0.0.1','Test database must be local');
  for (const file of ['tests/fixtures/gpt-schema.sql','scripts/migrations/20260906-gpt-content-tools.sql']) {
    const sql = readFileSync(file,'utf8').replace(/^--.*$/gm,'');
    for (const statement of sql.split(';').map(s=>s.trim()).filter(Boolean)) await query(statement);
  }
  const adminId=randomUUID(), modId=randomUUID(), otherId=randomUUID(), category=randomUUID();
  await query('INSERT INTO categories (id,name,order_index,depth,path) VALUES (?,?,1,1,?)',[category,'Test category',category]);
  for (const [id,role,access] of [[adminId,'admin',5],[modId,'moderator',4],[otherId,'moderator',2]]) {
    await query('INSERT INTO users (id,username,email,role,status,max_access_level) VALUES (?,?,?,?,?,?)',[id,id,'test@example.invalid',role,'active',access]);
  }
  const admin=await getGptActor(adminId), mod=await getGptActor(modId), other=await getGptActor(otherId);
  const origin='https://creepender.top';
  const text='原文第一段。\n\n第二段保留所有空格。  ';
  const create={request_id:randomUUID(),title:'Public-safe title',summary:'Neutral preview',rating_reason:'General introduction and adult-only second block',category_id:category,tags:['Original'],blocks:[{type:'text',content:text,access_level:1},{type:'code',content:'  const x = 1;\n',language:'js',access_level:4}]};
  let id='', revision='';
  let mediaId='';
  try {
    await t.test('draft create persists real ratings, exact content, summary and idempotent response', async()=>{
      const [first,repeat]=await Promise.all([saveRatedArticle(mod,create,origin),saveRatedArticle(mod,create,origin)]);
      assert.deepEqual(first,repeat);id=first.article_id as string;revision=first.revision as string;
      assert.equal(first.status,'draft'); assert.equal(first.visible_access_level,1);assert.equal(first.full_access_level,4);
      const page=await readArticle(mod,id,origin);assert.equal(page.article.summary,create.summary);assert.equal(JSON.parse(page.blocks[0].content_json as string).content,text);
      assert.equal(JSON.parse(page.blocks[1].content_json as string).code,'  const x = 1;\n');
      assert.equal((await query<any[]>('SELECT published_at FROM articles WHERE id=?',[id]))[0].published_at,null);
      await assert.rejects(()=>saveRatedArticle(mod,{...create,title:'different'},origin),{status:409});
    });
    await t.test('draft is hidden in public detail/list; missing key, cross-author and insufficient level are denied',async()=>{
      assert.equal((await publicArticle(new NextRequest(`${origin}/api/articles/${id}`),{params:Promise.resolve({id})})).status,404);
      assert.equal((await publicList(new NextRequest(`${origin}/api/articles/list?status=draft`))).status,403);
      assert.equal((await curateRoute(new NextRequest(`${origin}/api/gpt/curate`,{method:'POST',body:'{}'}))).status,401);
      await assert.rejects(()=>readArticle(other,id,origin),{status:403});
      await assert.rejects(()=>readArticle({...admin,max_access_level:2},id,origin),{status:403});
      assert.equal((await searchArticles(other,'','all',0)).articles.length,0);
      assert.ok((await readArticle(admin,id,origin)).article_id);
    });
    await t.test('tags-only update preserves content, category, type, author, cover and rating; retry does not append twice',async()=>{
      const before=await query<any[]>('SELECT * FROM articles WHERE id=?',[id]);
      const blocks=await query<any[]>('SELECT b.* FROM blocks b JOIN article_blocks ab ON ab.block_id=b.id WHERE ab.article_id=?',[id]);
      const edit={article_ref:`${origin}/article/${id}`,request_id:randomUUID(),expected_revision:revision,tags:[' New ','new']};
      const result=await curateArticle(admin,edit,origin);revision=result.revision as string;
      assert.deepEqual(await curateArticle(admin,edit,origin),result);
      assert.deepEqual((result.tags as string[]).sort(),['New','Original']);
      const after=await query<any[]>('SELECT * FROM articles WHERE id=?',[id]);
      for (const field of ['category_id','type','cover_image','cover_access_level','author_id','full_access_level','visible_access_level','excerpt']) assert.deepEqual(after[0][field],before[0][field]);
      assert.deepEqual(await query('SELECT b.* FROM blocks b JOIN article_blocks ab ON ab.block_id=b.id WHERE ab.article_id=?',[id]),blocks);
      await assert.rejects(()=>curateArticle(admin,{...edit,request_id:randomUUID()},origin),{status:409});
    });
    await t.test('split validates exact preservation, rolls back earlier tags on failure and uses copy-on-write',async()=>{
      const page=await readArticle(admin,id,origin);const blockId=page.blocks[0].id;
      const shared=await createGptArticle({title:'Shared article',authorId:adminId,authorName:admin.username,categoryId:category,blocks:[{type:'text',content:'temp'}],status:'draft'});
      await query('INSERT INTO article_blocks(article_id,block_id,`order`) VALUES (?,?,?)',[shared.articleId,blockId,1]);
      const edit={article_ref:id,request_id:randomUUID(),expected_revision:revision,tags:['RollbackTag'],block_splits:[{block_id:blockId,parts:['bad','text']}]};
      await assert.rejects(()=>curateArticle(admin,edit,origin),{status:400});
      assert.equal((await readArticle(admin,id,origin)).revision,revision);
      const result=await curateArticle(admin,{...edit,request_id:randomUUID(),tags:['Structured'],block_splits:[{block_id:blockId,parts:['原文第一段。\n\n','第二段保留所有空格。  ']}]},origin);revision=result.revision as string;
      const now=await readArticle(admin,id,origin);assert.equal(now.blocks.length,3);
      assert.equal(now.blocks.slice(0,2).map(b=>JSON.parse(b.content_json as string).content).join(''),text);
      assert.equal((await readArticle(admin,shared.articleId,origin)).blocks[1].id,blockId);
      assert.equal(JSON.parse((await query<any[]>('SELECT content FROM blocks WHERE id=?',[blockId]))[0].content).content,text);
    });
    await t.test('optimistic version catches simultaneous changes; reorder and metadata persist',async()=>{
      const body={article_ref:id,expected_revision:revision};
      const results=await Promise.allSettled([curateArticle(admin,{...body,request_id:randomUUID(),summary:'summary A'},origin),curateArticle(admin,{...body,request_id:randomUUID(),summary:'summary B'},origin)]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      assert.equal(results.filter(r=>r.status==='rejected').length,1);
      const page=await readArticle(admin,id,origin);
      const result=await curateArticle(admin,{...body,expected_revision:page.revision,request_id:randomUUID(),metadata:{language:'zh-CN'},block_order:page.blocks.map(b=>b.id).reverse()},origin);revision=result.revision as string;
      assert.equal((await readArticle(admin,id,origin)).blocks[0].type,'code');
    });
    await t.test('real image registration deduplicates; placement respects anchor, rating, cover and retry',async()=>{
      const png=await sharp({create:{width:2,height:2,channels:3,background:'#abcdef'}}).png().toBuffer();
      const media=await storeImage(png);mediaId=media.media_id;assert.deepEqual(await storeImage(png),media);
      const page=await readArticle(admin,id,origin); const anchor=page.blocks[0].id;
      const base={article_ref:id,expected_revision:revision,request_id:randomUUID(),images:[{media_id:mediaId,after_block_id:anchor,description:'Illustration',prompt:'Non-explicit abstract illustration',access_level:1}]};
      await assert.rejects(()=>attachArticleImages(admin,base,origin),{status:400});
      const valid={...base,request_id:randomUUID(),images:[{...base.images[0],access_level:4,set_cover:true}]};
      const result=await attachArticleImages(admin,valid,origin);revision=result.revision as string;
      assert.deepEqual(await attachArticleImages(admin,valid,origin),result);assert.equal(result.cover_access_level,4);
      const now=await readArticle(admin,id,origin);assert.equal(now.blocks[1].media_id,mediaId);assert.equal(now.blocks[1].type,'image');
      assert.equal(now.full_access_level,4);
      const bad={...valid,request_id:randomUUID(),expected_revision:revision,images:[valid.images[0],{...valid.images[0],media_id:randomUUID(),set_cover:false}]};
      await assert.rejects(()=>attachArticleImages(admin,bad,origin),{status:400});
      assert.equal((await readArticle(admin,id,origin)).revision,revision);
    });
    await t.test('publish transition exposes only allowed blocks to guests and reuses article ID',async()=>{
      const result=await saveRatedArticle(admin,{article_ref:id,expected_revision:revision,request_id:randomUUID(),status:'published'},origin);revision=result.revision as string;
      assert.equal(result.article_id,id);assert.equal(result.status,'published');
      const response=await publicArticle(new NextRequest(`${origin}/api/articles/${id}`),{params:Promise.resolve({id})});
      assert.equal(response.status,200);const data=await response.json();
      assert.equal(data.article.blocks[0].type,'placeholder');assert.equal(data.article.blocks[1].type,'placeholder');
    });
    await t.test('malformed media, rating and block input fail without creating articles',async()=>{
      for (const blocks of [[{type:'text',content:'x',access_level:6}],[{type:'image',media_id:randomUUID(),access_level:1}],[{type:'text',access_level:1}]]) {
        await assert.rejects(()=>saveRatedArticle(admin,{...create,request_id:randomUUID(),blocks},origin),{status:400});
      }
      await assert.rejects(()=>storeImage(Buffer.from('not an image')),{status:400});
    });
    await t.test('legacy uploader ignores supplied filesystem names and returns the canonical media URL',async()=>{
      process.env.GPT_API_KEYS=`test-token:${adminId}`;
      const png=await sharp({create:{width:2,height:2,channels:3,background:'#abcdef'}}).png().toBuffer();
      const response=await upload(new NextRequest(`${origin}/api/gpt/upload`,{method:'POST',headers:{Authorization:'Bearer test-token'},body:JSON.stringify({base64:`data:image/png;base64,${png.toString('base64')}`,filename:'../../escape.png'})}));
      assert.equal(response.status,200);const result=await response.json();assert.equal(result.media_id,mediaId);assert.ok(!result.url.includes('escape'));
    });
    await t.test('large legacy block reads paginate without losing a single character',async()=>{
      const raw='Long content 😀\n'.repeat(4000);
      const result=await createGptArticle({title:'Long',authorId:adminId,authorName:admin.username,categoryId:category,blocks:[{type:'text',content:raw}],status:'draft'});
      let next:{offset:number;block_offset:number}|null={offset:0,block_offset:0};let stored='';let count=0;
      while (next) {
        const page=await readArticle(admin,result.articleId,origin,next.offset,next.block_offset);stored+=page.blocks[0].content_json;next=page.next;
        assert.ok(JSON.stringify(page).length<100000);assert.ok(++count<30);
      }
      assert.equal(JSON.parse(stored).content,raw);
    });
  } finally {
    // The test context closes the pool even when setup fails.
  }
});
