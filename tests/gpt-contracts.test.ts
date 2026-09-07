import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { articleId, digest, level, tags } from '../lib/gptContracts';
import { buildGptOpenapi } from '../lib/gptOpenapi';
import { publicAddress, remoteImageUrl, actionFileDownloadLinks } from '../lib/gptMedia';
import { jsonBody } from '../lib/gptHttp';
import { NextRequest } from 'next/server';

test('article references accept real site links but reject arbitrary fetch targets', () => {
  assert.equal(articleId('old-article_1','https://creepender.top'),'old-article_1');
  assert.equal(articleId('https://creepender.top/article/old-1?x=1#b','https://creepender.top'),'old-1');
  for (const ref of ['https://evil.test/article/old-1','https://creepender.top/articles/1','../a','https://u:p@creepender.top/article/a']) assert.throws(()=>articleId(ref,'https://creepender.top'));
});
test('ratings follow actual frontend enum and tags deduplicate without destroying case', () => {
  for (const n of [1,2,3,4,5]) assert.equal(level(n),n);
  for (const n of [0,6,10,1.5,'4',null]) assert.throws(()=>level(n));
  assert.deepEqual(tags([' Docker ','docker','后端']),['Docker','后端']);
  assert.throws(()=>tags(['']));
  assert.equal(digest({b:2,a:1}),digest({a:1,b:2}));
});
test('remote media rejects private, loopback, mapped IPv6, unapproved hosts and unsafe URL forms', () => {
  for (const ip of ['127.0.0.1','10.1.2.3','169.254.169.254','192.168.1.1','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','2001:db8::1','2002:7f00:1::']) assert.equal(publicAddress(ip),false,ip);
  assert.equal(publicAddress('8.8.8.8'),true); assert.equal(publicAddress('2606:4700:4700::1111'),true);
  process.env.GPT_IMAGE_ALLOWED_HOSTS = 'images.example.com';
  assert.equal(remoteImageUrl('https://images.example.com/a.png').hostname,'images.example.com');
  for (const url of ['http://images.example.com/a','https://images.example.com.evil/a','https://u:p@images.example.com/a','https://images.example.com:8080/a']) assert.throws(()=>remoteImageUrl(url));
  delete process.env.GPT_IMAGE_ALLOWED_HOSTS;
});
test('openaiFileIdRefs accepts bridged HTTPS objects/URLs and rejects sandbox paths', () => {
  assert.deepEqual(
    actionFileDownloadLinks([{name:'cat.png',id:'file-1',mime_type:'image/png',download_link:'https://files.oaiusercontent.com/file-1'}]),
    ['https://files.oaiusercontent.com/file-1']
  );
  assert.deepEqual(actionFileDownloadLinks(['https://files.oaiusercontent.com/file-2']),['https://files.oaiusercontent.com/file-2']);
  assert.throws(()=>actionFileDownloadLinks(['/mnt/data/cat.png']));
  assert.throws(()=>actionFileDownloadLinks([{id:'file-1'}]));
});
test('bounded JSON transport rejects malformed, scalar and oversized requests', async () => {
  for (const body of ['null','{',JSON.stringify({value:'a'.repeat(90000)})]) {
    await assert.rejects(()=>jsonBody(new NextRequest('https://creepender.top/api/gpt/curate',{method:'POST',body})));
  }
});
test('all schema bundles are generated consistently, references resolve, and Actions descriptions fit', () => {
  for (const bundle of [undefined,'curate','publish','illustrate']) {
    const spec = buildGptOpenapi(undefined,bundle);
    assert.deepEqual(parse(readFileSync(`docs/gpt/${bundle ? `${bundle}-tool` : 'openapi'}.yaml`,'utf8')),spec);
    const ids = new Set<string>();
    for (const methods of Object.values(spec.paths)) for (const op of Object.values(methods)) {
      assert.ok(String(op.summary).length <= 300); assert.ok(!ids.has(String(op.operationId))); ids.add(String(op.operationId));
    }
    const visit = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      for (const [key,child] of Object.entries(value)) {
        if (key === '$ref') assert.ok(spec.components.schemas[String(child).split('/').pop()!]);
        if (key === 'description') assert.ok(String(child).length <= 700);
        visit(child);
      }
    }; visit(spec);
    assert.ok(JSON.stringify(spec).length < 100000);
  }
  assert.deepEqual(parse(readFileSync('public/gpt-openapi.yaml','utf8')),buildGptOpenapi());
});
