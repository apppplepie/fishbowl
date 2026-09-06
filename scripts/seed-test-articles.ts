/**
 * 瀑布流测试数据
 *
 *   npx ts-node --project tsconfig.node.json scripts/seed-test-articles.ts
 *   npx ts-node --project tsconfig.node.json scripts/seed-test-articles.ts --count=120
 *   npx ts-node --project tsconfig.node.json scripts/seed-test-articles.ts --clean
 *
 * 所有生成的行 id 都以 `seedtest-` 开头，--clean 会按这个前缀整体删除，
 * 不会碰到你自己的数据。重复执行是幂等的：先清后插。
 *
 * 卡片高度由不同来源决定，所以这里刻意把几种类型的"高度输入"都拉开：
 *   text    → 摘要字数（最多 4 行）+ 标签行
 *   diary   → 摘要字数换算行数
 *   code    → 代码块行数
 *   image / drawing → 封面宽高比
 */
// 注意：项目里没有 .env，只有 .env.local（Next 自己会读它）。
// `dotenv/config` 默认只加载 .env，那样会静默回退到 db-config 的默认值
// （database: 'test'），把数据写进另一个库。这里必须显式指定 .env.local。
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { query, pool } from '../lib/db';

const ID_PREFIX = 'seedtest-';

type ArticleType = 'text' | 'diary' | 'code' | 'image' | 'drawing';

/** 固定种子的伪随机，保证每次生成的数据一致，便于反复比对布局 */
function makeRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
const rand = makeRandom(20260906);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const TITLE_HEAD = [
  '关于', '重读', '记一次', '聊聊', '深入', '闲谈', '复盘', '拆解', '试验',
  '午后的', '雨天的', '路过', '重构', '整理', '关于我', '一个人的',
];
const TITLE_TAIL = [
  '瀑布流布局', '滚动加载', '玻璃拟态', '配色实验', '字体排印', '缓存策略',
  '状态管理', '动画曲线', '响应式断点', '夜间模式', '图片压缩', '构建速度',
  '一杯咖啡', '窗外的猫', '旧照片', '通勤路上', '深夜食堂', '书桌一角',
  '未命名草稿', '海边的风', '一场大雨', '搬家记事',
];

const PARA = [
  '把内容从上到下铺开，再让列自己去找最短的那一列，这就是瀑布流最朴素的样子。',
  '真正麻烦的从来不是布局本身，而是图片加载完成之前你并不知道它有多高。',
  '滚动加载的哨兵元素必须能被观察到状态跃迁，否则它会安静地停在那里什么也不做。',
  '有时候一个下午就耗在把间距从 12px 调成 14px，然后第二天又改回去。',
  '深色和浅色不是互为反色，把亮度直接取反通常只会得到一坨发灰的东西。',
  '缓存的难点在于失效，而不在于存。',
  '窗外一直在下雨，屏幕的光把桌面照成了淡蓝色，键盘声比雨声还密。',
  '我一直觉得，代码写得好不好，翻半年前自己写的那份就知道了。',
  '把复杂度藏起来和把复杂度消灭掉，是完全不同的两件事。',
  '早上煮了咖啡，忘记喝，中午热了一次，又忘记喝。',
  '动画时长超过 300ms 就开始显得迟钝，低于 150ms 又几乎看不见。',
  '列表页最容易被忽略的是空状态，而用户第一次打开看到的往往正是它。',
];

const CODE_SNIPPETS: Array<{ language: string; lines: string[] }> = [
  {
    language: 'typescript',
    lines: [
      'const observer = new IntersectionObserver((entries) => {',
      '  if (entries[0]?.isIntersecting) load(true);',
      '}, { rootMargin: "400px" });',
      'observer.observe(sentinel);',
    ],
  },
  {
    language: 'css',
    lines: [
      '.masonry {',
      '  display: grid;',
      '  grid-auto-rows: 4px;',
      '  gap: 0 12px;',
      '}',
      '.masonry-item {',
      '  break-inside: avoid;',
      '}',
    ],
  },
  {
    language: 'typescript',
    lines: [
      'export function useDebounced<T>(value: T, delay = 300): T {',
      '  const [v, setV] = useState(value);',
      '  useEffect(() => {',
      '    const t = setTimeout(() => setV(value), delay);',
      '    return () => clearTimeout(t);',
      '  }, [value, delay]);',
      '  return v;',
      '}',
    ],
  },
  {
    language: 'sql',
    lines: [
      'SELECT a.id, a.title, COUNT(ab.block_id) AS blocks',
      'FROM articles a',
      'LEFT JOIN article_blocks ab ON ab.article_id = a.id',
      'WHERE a.status = "published"',
      'GROUP BY a.id',
      'ORDER BY a.published_at DESC',
      'LIMIT 20;',
    ],
  },
  {
    language: 'bash',
    lines: [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'npm run build',
      'if [ -d .next ]; then',
      '  echo "build ok"',
      'fi',
    ],
  },
];

/** 复用库里已有的真实图片，保证封面能真的加载出来 */
const COVER_URLS = [
  '/uploads/2026/01/6a7149f0-9432-47fe-99fe-ad86c725fe41.png',
  '/uploads/2025/12/d4104da4-e947-4ee7-a575-842130b3f93c.png',
  '/uploads/2026/02/ad0dbdaa-2dc8-40dc-933e-31f0fa27da01.png',
  '/uploads/2026/02/9b146c53-84d7-4045-9ccb-1ed2b4b9ca2d.png',
  '/uploads/2026/02/9b8f3398-506a-4c99-b317-f12882a2c793.png',
  '/uploads/2026/02/6a78596e-9109-4b70-b172-f3026a9d1df5.png',
  '/uploads/2026/01/7090d689-4159-4988-b55d-4a3335d36c43.png',
  '/uploads/2025/12/aeed1ea2-4ccf-42f3-9593-8a49786e597e.png',
];
/** 宽高比拉开，卡片高度才会有层次 */
const COVER_SIZES: Array<[number, number]> = [
  [1200, 800], [1000, 1000], [900, 1350], [1600, 900], [800, 1200], [1400, 1050],
];

const CATEGORIES: Record<ArticleType, string[]> = {
  text: ['cat_blog', 'cat_blog_frontend', 'cat_blog_backend', 'cat_life', 'cat_uncategorized'],
  diary: ['cat_diary', 'cat_life'],
  code: ['cat_blog', 'cat_blog_frontend', 'cat_blog_backend'],
  image: ['cat_life', 'cat_uncategorized'],
  drawing: ['cat_drawing', 'cat_drawing_character', 'cat_drawing_practice', 'cat_drawing_scene'],
};

const TYPE_POOL: ArticleType[] = [
  ...Array(8).fill('text'),
  ...Array(4).fill('diary'),
  ...Array(3).fill('code'),
  ...Array(3).fill('image'),
  ...Array(2).fill('drawing'),
];

function paragraphs(minChars: number, maxChars: number): string {
  const target = int(minChars, maxChars);
  let out = '';
  while (out.length < target) out += pick(PARA);
  return out.slice(0, target);
}

async function clean(): Promise<void> {
  // article_blocks 有 ON DELETE CASCADE，删 articles 会带走关联行；blocks 需要自己删
  const [{ n: aN }] = await query<any[]>(
    'SELECT COUNT(*) n FROM articles WHERE id LIKE ?', [ID_PREFIX + '%']
  );
  await query('DELETE FROM article_tags WHERE article_id LIKE ?', [ID_PREFIX + '%']);
  await query('DELETE FROM articles WHERE id LIKE ?', [ID_PREFIX + '%']);
  const [{ n: bN }] = await query<any[]>(
    'SELECT COUNT(*) n FROM blocks WHERE id LIKE ?', [ID_PREFIX + '%']
  );
  await query('DELETE FROM blocks WHERE id LIKE ?', [ID_PREFIX + '%']);
  console.log(`🧹 已清理 ${aN} 篇测试文章、${bN} 个测试块`);
}

async function seed(count: number): Promise<void> {
  const users = await query<any[]>(
    "SELECT id, username FROM users WHERE status = 'active' ORDER BY username"
  );
  if (users.length === 0) throw new Error('users 表里没有可用账号，先建个用户再跑');

  const tags = await query<any[]>('SELECT id, name FROM tags');

  await clean();
  console.log(`\n🌱 开始生成 ${count} 篇测试文章...`);

  const now = Date.now();
  let blockSeq = 0;
  const typeCount: Record<string, number> = {};

  for (let i = 0; i < count; i++) {
    const type = TYPE_POOL[i % TYPE_POOL.length];
    typeCount[type] = (typeCount[type] ?? 0) + 1;

    const id = `${ID_PREFIX}a${String(i + 1).padStart(4, '0')}`;
    const user = pick(users);
    const title = `${pick(TITLE_HEAD)}${pick(TITLE_TAIL)}`;
    // 时间从近到远铺开，列表按 published_at DESC 排序时顺序自然
    const publishedAt = new Date(now - i * 3.7 * 3600 * 1000 - int(0, 3600) * 1000);

    let excerpt: string;
    let coverImage: string | null = null;

    switch (type) {
      case 'diary':
        excerpt = paragraphs(30, 420);
        break;
      case 'code':
        excerpt = paragraphs(20, 90);
        break;
      case 'image':
      case 'drawing': {
        excerpt = paragraphs(0, 60);
        const [w, h] = pick(COVER_SIZES);
        coverImage = JSON.stringify({
          url: pick(COVER_URLS),
          title: '',
          description: '',
          width: w,
          height: h,
          aspect_ratio: Number((w / h).toFixed(6)),
        });
        break;
      }
      default:
        excerpt = paragraphs(40, 260);
    }

    // visible_access_level / full_access_level 都给 1，游客（level 2）也能看到测试数据。
    // full_access_level 是 NOT NULL 且没有默认值，必须显式写。
    await query(
      `INSERT INTO articles
         (id, title, author, author_id, published_at, excerpt, type, status,
          likes, shares, comments, category_id, order_index,
          visible_access_level, full_access_level, cover_image, cover_access_level,
          created_at, updated_at)
       VALUES (?,?,?,?,?,?,?, 'published', ?,?,0,?,?, 1, 1, ?, 1, ?, ?)`,
      [
        id, title, user.username, user.id, publishedAt, excerpt, type,
        int(0, 180), int(0, 30),
        pick(CATEGORIES[type]), i,
        coverImage, publishedAt, publishedAt,
      ]
    );

    // 正文块：让点进详情页也有内容可看
    const bodyBlocks: Array<{ type: string; content: string }> = [];
    if (type === 'code') {
      const snippet = pick(CODE_SNIPPETS);
      const repeat = int(1, 4);
      const code = Array.from({ length: repeat }, () => snippet.lines.join('\n')).join('\n\n');
      bodyBlocks.push({ type: 'code', content: JSON.stringify({ code, language: snippet.language }) });
      bodyBlocks.push({ type: 'text', content: JSON.stringify({ content: paragraphs(40, 160) }) });
    } else if (type === 'image' || type === 'drawing') {
      bodyBlocks.push({
        type: 'image',
        content: JSON.stringify({ url: pick(COVER_URLS), title: '', description: '' }),
      });
      bodyBlocks.push({ type: 'text', content: JSON.stringify({ content: paragraphs(30, 140) }) });
    } else {
      for (let k = 0, n = int(2, 5); k < n; k++) {
        bodyBlocks.push({ type: 'text', content: JSON.stringify({ content: paragraphs(60, 320) }) });
      }
    }

    for (let order = 0; order < bodyBlocks.length; order++) {
      const blockId = `${ID_PREFIX}b${String(++blockSeq).padStart(5, '0')}`;
      await query(
        'INSERT INTO blocks (id, type, content, author, access_level) VALUES (?,?,?,?,1)',
        [blockId, bodyBlocks[order].type, bodyBlocks[order].content, user.username]
      );
      await query(
        'INSERT INTO article_blocks (article_id, block_id, `order`) VALUES (?,?,?)',
        [id, blockId, order]
      );
    }

    // 标签：0~3 个，标签行会影响 text 卡高度
    if (tags.length > 0) {
      const picked = new Set<string>();
      for (let t = 0, n = int(0, 3); t < n; t++) picked.add(pick(tags).id);
      for (const tagId of picked) {
        await query(
          'INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?,?)',
          [id, tagId]
        );
      }
    }

    if ((i + 1) % 20 === 0) console.log(`   ... 已插入 ${i + 1}/${count}`);
  }

  console.log('\n✅ 完成。类型分布：');
  for (const [t, n] of Object.entries(typeCount)) console.log(`   ${t.padEnd(8)} ${n}`);
  const [{ total }] = await query<any[]>(
    "SELECT COUNT(*) total FROM articles WHERE status = 'published'"
  );
  console.log(`\n📊 库中 published 文章总数：${total}`);
  console.log(`   清理测试数据：--clean`);
}

(async () => {
  const [{ db }] = await query<any[]>('SELECT DATABASE() db');
  console.log(`📚 目标数据库: ${db}`);

  const args = process.argv.slice(2);
  const countArg = args.find((a) => a.startsWith('--count='));
  const count = countArg ? Math.max(1, parseInt(countArg.split('=')[1], 10) || 60) : 60;

  if (args.includes('--clean')) await clean();
  else await seed(count);

  await pool.end();
})().catch((e) => {
  console.error('❌ 失败:', e);
  process.exit(1);
});
