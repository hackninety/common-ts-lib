// 核对 data/：总表记录的哈希、每篇在分片里都有正文且哈希相符、篇数字数与总表一致。
// 给了 novel-wiki 目录（参数或 NOVEL_WIKI_ROOT）时，再逐篇对照来源正文，确认没有漏收、改字。
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const data = path.join(root, 'data');
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const read = (file) => {
  const bytes = readFileSync(path.join(data, file));
  return (file.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8');
};
const errors = [];
const fail = (message) => { errors.push(message); if (errors.length <= 20) console.error(`✗ ${message}`); };

const catalog = JSON.parse(read('catalog.json'));
let entries = 0;
let chars = 0;
const content = new Map();
for (const book of catalog.books) {
  const indexText = read(book.files.index);
  if (sha256(indexText) !== book.files.indexSha256) fail(`${book.id}: index.json 哈希不符`);
  const index = JSON.parse(indexText);
  const shards = book.files.shards.map(s => {
    const text = read(s.file);
    if (sha256(text) !== s.sha256) fail(`${s.file}: 哈希不符`);
    return JSON.parse(text);
  });
  if (index.length !== book.entryCount) fail(`${book.id}: 篇数 ${index.length} ≠ 总表 ${book.entryCount}`);
  if (new Set(index.map(e => e.id)).size !== index.length) fail(`${book.id}: 篇目 ID 重复`);
  let bookChars = 0;
  for (const e of index) {
    const record = shards[e.shard]?.[e.id];
    if (!record) { fail(`${book.id}/${e.id}: 分片 ${e.shard} 里没有正文`); continue; }
    if (sha256(record.content) !== record.contentSha256) fail(`${book.id}/${e.id}: 正文哈希不符`);
    if (Array.from(record.content).length !== e.chars) fail(`${book.id}/${e.id}: 字数不符`);
    if (e.uri !== `reference://${book.id}/${e.id}`) fail(`${book.id}/${e.id}: uri 不规范`);
    if (JSON.stringify(record.source).match(/snapshotPath|"sourcePath"|repositoryPath/)) fail(`${book.id}/${e.id}: 残留本机路径`);
    if ((e.layer === 'ai') !== Boolean(record.ai) || (e.layer === 'ai' && (!e.ai?.provider || !record.ai.segmentIds))) fail(`${book.id}/${e.id}: ai 层标记不一致`);
    content.set(`${book.id}/${e.id}`, record.content);
    bookChars += e.chars;
  }
  const inShards = shards.reduce((n, s) => n + Object.keys(s).length, 0);
  if (inShards !== index.length) fail(`${book.id}: 分片篇数 ${inShards} ≠ 索引 ${index.length}`);
  if (bookChars !== book.charCount) fail(`${book.id}: 字数 ${bookChars} ≠ 总表 ${book.charCount}`);
  entries += index.length;
  chars += bookChars;
}
if (entries !== catalog.totals.entries || chars !== catalog.totals.chars || catalog.books.length !== catalog.totals.books) fail('总数与总表不符');

const wikiRoot = process.argv[2] ?? process.env.NOVEL_WIKI_ROOT ?? 'D:/Ai/Novel/novel-wiki';
const refRoot = path.join(wikiRoot, 'references');
let compared = 0;
let skipped = 0;
if (existsSync(refRoot)) {
  for (const bookId of readdirSync(refRoot)) {
    const dir = path.join(refRoot, bookId, 'entries');
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const e = JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
      const key = `${bookId}/${e.id}`;
      if (e.status !== 'active') {
        skipped++;
        if (content.has(key)) fail(`${key}: 已归档篇目被收入`);
        continue;
      }
      if (!content.has(key)) { fail(`${key}: 来源有、本库缺`); continue; }
      if (content.get(key) !== e.content) fail(`${key}: 正文与来源不一致`);
      compared++;
    }
  }
  if (compared !== entries) fail(`对照来源 ${compared} 篇 ≠ 本库 ${entries} 篇`);
}

if (errors.length) {
  console.error(`共 ${errors.length} 处问题`);
  process.exit(1);
}
console.log(`data ok: ${catalog.books.length} 部书，${entries} 篇，${chars} 字` +
  (existsSync(refRoot) ? `；逐篇对照 novel-wiki 一致 ${compared} 篇，已归档跳过 ${skipped} 篇` : '；未找到 novel-wiki，跳过来源对照'));
