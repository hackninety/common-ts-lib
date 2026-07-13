/**
 * 抓取《山海经》十八卷经文底本 → docs/corpus/text/NN-<slug>.json
 *
 * 底本来源：ctext.org（中國哲學書電子化計劃）章节级 gettext API，
 * 文本为公有领域先秦典籍（据郝懿行《山海经笺疏》系统的通行整理本）。
 * 仅在刷新底本时运行；引入记录写入 docs/corpus/_meta/sources.json。
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CHAPTERS } from './chapters.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'docs/corpus/text');
const metaDir = path.join(root, 'docs/corpus/_meta');
mkdirSync(outDir, { recursive: true });
mkdirSync(metaDir, { recursive: true });

const UA = 'shj-ts-lib corpus builder/0.1 (contact: hackninety@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ok = 0;
for (const ch of CHAPTERS) {
  const file = path.join(outDir, `${String(ch.n).padStart(2, '0')}-${ch.slug}.json`);
  if (existsSync(file) && !process.argv.includes('--force')) {
    console.log(`skip (exists): ${ch.title}`);
    ok++;
    continue;
  }
  const url = `https://api.ctext.org/gettext?urn=${encodeURIComponent(ch.urn)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${ch.urn}: HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`${ch.urn}: ${data.error.code} ${data.error.description ?? ''}`);
  const paragraphs = data.fulltext;
  if (!Array.isArray(paragraphs) || paragraphs.length === 0 || paragraphs.some((p) => typeof p !== 'string')) {
    throw new Error(`${ch.urn}: fulltext 缺失或格式异常`);
  }
  const record = {
    id: ch.slug,
    n: ch.n,
    title: ch.title,
    urn: ch.urn,
    source: 'ctext.org gettext API',
    fetchedAt: new Date().toISOString().slice(0, 10),
    paragraphs,
  };
  writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
  console.log(`ok: ${ch.title} ${paragraphs.length} 段，共 ${paragraphs.join('').length} 字`);
  ok++;
  await sleep(800); // 礼貌间隔
}

const sourcesFile = path.join(metaDir, 'sources.json');
const sources = existsSync(sourcesFile) ? JSON.parse(readFileSync(sourcesFile, 'utf8')) : {};
sources.text = {
  provider: 'ctext.org（中國哲學書電子化計劃）',
  api: 'https://api.ctext.org/gettext?urn=ctp:shan-hai-jing/*',
  license: '先秦典籍原文属公有领域；ctext 数据服务要求署名、非商业批量再分发前请核阅其条款',
  url: 'https://ctext.org/shan-hai-jing',
  chapters: ok,
  fetchedAt: new Date().toISOString().slice(0, 10),
};
writeFileSync(sourcesFile, JSON.stringify(sources, null, 2) + '\n');
console.log(`done: ${ok}/${CHAPTERS.length} 卷`);
