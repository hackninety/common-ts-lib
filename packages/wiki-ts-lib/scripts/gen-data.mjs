// 从 novel-wiki 的现实参考材料库（references/）生成本包 data/。
// 只收古籍书目与篇目正文（含藏经楼 AI 译注层）；不读 wiki/（小说 Canon、人物设定），
// 去掉 novel-wiki 本机快照路径、react-scripture 本机仓库路径和 Novel Web 的修订时间戳。
//
//   node scripts/gen-data.mjs [novel-wiki 目录]     默认 D:/Ai/Novel/novel-wiki，也可设 NOVEL_WIKI_ROOT
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import * as OpenCC from 'opencc-js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const wikiRoot = path.resolve(process.argv[2] ?? process.env.NOVEL_WIKI_ROOT ?? 'D:/Ai/Novel/novel-wiki');
const refRoot = path.join(wikiRoot, 'references');
const out = path.join(root, 'data');
const SHARD_CHARS = 400_000;

if (!existsSync(refRoot)) throw new Error(`找不到参考材料库：${refRoot}`);

const zhNumeric = new Intl.Collator('zh', { numeric: true });
const zh = new Intl.Collator('zh');
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  const text = JSON.stringify(value) + '\n';
  // 篇目索引与正文分片 gzip 存放（仓库与发布包体积约为明文的三成）；哈希记的是解压后的 JSON 文本。
  writeFileSync(file, file.endsWith('.gz') ? gzipSync(text, { level: 9 }) : text);
  return text;
};

// 本机快照路径只在 novel-wiki 仓库里有意义，发布包里去掉；来源 URL、修订号、哈希、许可都保留。
const LOCAL_KEYS = /^(snapshotPath|renderBatchSnapshotPath|rawSnapshotPath|sourcePath|repositoryPath)$/;
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) if (!LOCAL_KEYS.test(key)) result[key] = sanitize(child);
  return result;
}

function git(args) {
  try { return execFileSync('git', args, { cwd: wikiRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}

rmSync(out, { recursive: true, force: true });

const books = [];
const corpusChars = new Set();
const excluded = [];
let totalEntries = 0;
let totalChars = 0;

for (const bookId of readdirSync(refRoot).sort()) {
  const dir = path.join(refRoot, bookId);
  if (!statSync(dir).isDirectory()) continue;
  const book = readJson(path.join(dir, 'book.json'));
  if (book.id !== bookId) throw new Error(`${bookId}: book.json id 不一致`);
  if (book.status !== 'active') { excluded.push({ book: bookId, reason: `书目状态 ${book.status}` }); continue; }

  const entries = [];
  const skipped = { archived: 0 };
  for (const name of readdirSync(path.join(dir, 'entries'))) {
    const e = readJson(path.join(dir, 'entries', name));
    if (e.bookId !== bookId) throw new Error(`${bookId}/${name}: bookId 不一致`);
    if (e.status !== 'active') { skipped.archived++; continue; }
    entries.push(e);
  }
  entries.sort((a, b) => zhNumeric.compare(a.volume ?? '', b.volume ?? '') || a.order - b.order || zh.compare(a.title, b.title) || a.id.localeCompare(b.id));
  if (skipped.archived) excluded.push({ book: bookId, reason: '已归档篇目', count: skipped.archived });

  // 按正文字数切片，大书（太平广记、夷坚志）按需只读一片。
  const index = [];
  const shards = [];
  let current = {};
  let currentChars = 0;
  const flush = () => {
    if (!Object.keys(current).length) return;
    shards.push(current);
    current = {};
    currentChars = 0;
  };
  const volumes = new Map();
  const kinds = {};
  let bookChars = 0;
  for (const e of entries) {
    const content = e.content ?? '';
    const chars = Array.from(content).length;
    if (currentChars && currentChars + chars > SHARD_CHARS) flush();
    // 三层：source 来源材料（原文、底本注）；editorial 入库整理说明；ai 现代 AI 译文、点评、总结（react-scripture 藏经楼）。
    const layer = e.source?.aiGenerated ? 'ai' : e.source?.editorial ? 'editorial' : 'source';
    const ai = layer === 'ai' ? {
      provider: e.source.aiProvider,
      role: e.id.startsWith('summary-') ? 'summary' : e.contentKind === 'translation' ? 'translation' : 'commentary',
      segmentIds: e.source.segmentIds ?? [],
    } : undefined;
    const record = { content, contentSha256: sha256(content), source: sanitize(e.source ?? {}) };
    if (ai) record.ai = ai;
    if (e.notes?.trim()) record.note = e.notes.trim();
    if (e.sourceUrl) record.sourceUrl = e.sourceUrl;
    current[e.id] = record;
    currentChars += chars;
    index.push({
      id: e.id,
      title: e.title,
      volume: e.volume ?? '',
      order: e.order,
      kind: e.contentKind,
      layer,
      ai: ai ? { provider: ai.provider, role: ai.role } : undefined,
      tags: e.tags ?? [],
      section: e.source?.section || undefined,
      chars,
      shard: shards.length,
      uri: e.uri,
      sourceUrl: e.sourceUrl || undefined,
    });
    volumes.set(e.volume ?? '', (volumes.get(e.volume ?? '') ?? 0) + 1);
    kinds[e.contentKind] = (kinds[e.contentKind] ?? 0) + 1;
    bookChars += chars;
    for (const ch of content) corpusChars.add(ch);
    for (const ch of e.title) corpusChars.add(ch);
  }
  flush();

  const shardFiles = shards.map((shard, i) => {
    const file = `books/${bookId}/text-${String(i).padStart(3, '0')}.json.gz`;
    const text = writeJson(path.join(out, file), shard);
    return { file, entries: Object.keys(shard).length, sha256: sha256(text) };
  });
  const indexText = writeJson(path.join(out, `books/${bookId}/index.json.gz`), index);

  const sourceLayerCount = index.filter(i => i.layer === 'source').length;
  books.push({
    id: bookId,
    title: book.title,
    workTitle: book.workTitle ?? book.title,
    author: book.author ?? '',
    era: book.era ?? '',
    category: book.category ?? '',
    tradition: book.tradition ?? '',
    edition: book.edition ?? '',
    summary: book.summary ?? '',
    tags: book.tags ?? [],
    uri: book.uri,
    sourceUrl: book.sourceUrl ?? '',
    source: sanitize(book.source ?? {}),
    fullText: sourceLayerCount > 0,
    entryCount: index.length,
    charCount: bookChars,
    kinds,
    volumes: [...volumes].map(([name, count]) => ({ name, count })),
    layers: { source: sourceLayerCount, editorial: index.filter(i => i.layer === 'editorial').length, ai: index.filter(i => i.layer === 'ai').length },
    aiProviders: [...new Set(index.filter(i => i.ai).map(i => i.ai.provider))].sort(),
    excluded: skipped.archived ? skipped : undefined,
    files: { index: `books/${bookId}/index.json.gz`, indexSha256: sha256(indexText), shards: shardFiles },
  });
  totalEntries += index.length;
  totalChars += bookChars;
}

books.sort((a, b) => zh.compare(a.title, b.title) || a.id.localeCompare(b.id));

// 简繁折叠表：只存逐字转换后有变化的字。覆盖语料用字和 CJK 基本区、扩展 A，
// 查询用繁体、正文用简体（或反之）都能对上。异体字仍保持底本字形，表只用于检索。
const converters = ['t', 'tw', 'hk'].map(from => OpenCC.Converter({ from, to: 'cn' }));
const candidates = new Set(corpusChars);
for (let cp = 0x3400; cp <= 0x4dbf; cp++) candidates.add(String.fromCodePoint(cp));
for (let cp = 0x4e00; cp <= 0x9fff; cp++) candidates.add(String.fromCodePoint(cp));
const fold = {};
for (const ch of [...candidates].sort()) {
  if (!/\p{Script=Han}/u.test(ch)) continue;
  for (const convert of converters) {
    const simplified = convert(ch);
    if (simplified !== ch && simplified.length === ch.length) { fold[ch] = simplified; break; }
  }
}
writeJson(path.join(out, 'fold.json'), fold);

const head = git(['rev-parse', 'HEAD']);
const dirty = git(['status', '--porcelain', '--', 'references']);
writeJson(path.join(out, 'catalog.json'), {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  origin: {
    project: 'novel-wiki',
    directory: 'references/',
    revision: head || null,
    workingTreeClean: head ? dirty === '' : null,
    note: '只收现实参考材料：古籍原文、底本注、整理说明（layer source／editorial），以及 react-scripture 藏经楼的 AI 现代译文、点评、总结（layer ai）；不含小说 Canon、人物设定和创作笔记。',
  },
  rights: '古代原作属公有领域。维基文库录入、标点与校注按 CC BY-SA 4.0 署名并相同方式共享；ctext、CBETA 等其他来源见各篇 source.rights／rightsNote／licenseUrl。本包代码 MIT 不覆盖材料自身许可。',
  totals: { books: books.length, entries: totalEntries, chars: totalChars },
  excluded,
  books,
});

console.log(`data/: ${books.length} 部书，${totalEntries} 篇，${totalChars} 字；简繁折叠表 ${Object.keys(fold).length} 字`);
for (const x of excluded) console.log(`  剔除 ${x.book}：${x.reason}${x.count ? ` ${x.count} 篇` : ''}`);
