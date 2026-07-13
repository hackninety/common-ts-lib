/**
 * 生成管线：docs/corpus → src/data/*.json + src/chunks/*.ts
 *
 * 1. 十八卷经文：逐段条目化，繁→简（opencc-js），抽取条目主名（head）
 * 2. 实体百科：引文用「去句读 + 繁简折叠」在底本内定位，锚定 章/条 并回采
 *    原文精确引文（繁体带原句读）——引文若无法命中底本即报错，保证语料可溯源
 * 3. 山川地望：校验坐标/置信度/被实体引用的完整性
 * 4. 图像元数据：校验 assets 文件落盘与实体引用
 * 5. 繁简折叠表：由语料实际用字生成（供运行时检索归一化）
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as OpenCC from 'opencc-js';
import { CHAPTERS } from './chapters.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const corpusDir = path.join(root, 'docs/corpus');
const dataDir = path.join(root, 'src/data');
const chunksDir = path.join(root, 'src/chunks');
rmSync(dataDir, { recursive: true, force: true });
rmSync(chunksDir, { recursive: true, force: true });
mkdirSync(dataDir, { recursive: true });
mkdirSync(chunksDir, { recursive: true });

const t2s = OpenCC.Converter({ from: 't', to: 'cn' });
const errors = [];
const warnings = [];

// ---------- 工具 ----------
const PUNCT_RE = /[\s　。，、；：？！「」『』（）()《》〈〉«»·．.\-—–_,;:?!'"‘’“”[\]{}…‧]/g;

/** 单字折叠：繁→简（转换结果非单码点时保留原字，保证 1:1 对齐） */
function foldChar(ch) {
  const c = t2s(ch);
  return Array.from(c).length === 1 ? c : ch;
}

/** 折叠：去句读空白 + 逐字繁→简，返回码点数组（勿用 UTF-16 下标！） */
function fold(str) {
  const out = [];
  for (const ch of String(str).replace(PUNCT_RE, '')) out.push(foldChar(ch));
  return out;
}

/** 返回 { folded, map }：均按码点计，map[i] = folded 第 i 个字在原文 chars 中的下标 */
function foldWithMap(str) {
  const chars = Array.from(str);
  const folded = [];
  const map = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    PUNCT_RE.lastIndex = 0;
    if (PUNCT_RE.test(ch)) continue;
    folded.push(foldChar(ch));
    map.push(i);
  }
  return { folded, map, chars };
}

/** 码点数组子串查找 */
function indexOfArr(hay, needle, from = 0) {
  outer: for (let i = from; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/** 条目主名启发式（繁体）：山名 → 国名 → 名曰 X */
function extractHead(t) {
  let m = t.match(/曰([^，。、；]{1,12}?之?(?:山|丘|淵|臺))/);
  if (m) return m[1];
  m = t.match(/^([^，。、；]{2,10}?(?:國|国))[在，]/);
  if (m) return m[1];
  m = t.match(/有([^，。、；]{2,10}?之國)/);
  if (m) return m[1];
  m = t.match(/名曰([^，。、；]{1,10})/);
  if (m) return m[1];
  const head = Array.from(t).slice(0, 10).join('');
  return head;
}

function writeJson(rel, obj) {
  writeFileSync(path.join(dataDir, rel), JSON.stringify(obj) + '\n');
}

function writeChunk(name, doc) {
  const src = `/**\n * ${doc}\n * 生成文件（scripts/gen-data.mjs），勿手改；仅供各入口动态 import 分包使用。\n */\nimport data from '../data/${name}.json';\n\nexport const payload: unknown = data;\n`;
  writeFileSync(path.join(chunksDir, `${name}.ts`), src);
}

// ---------- 1. 经文 ----------
const chapterEntries = new Map(); // slug -> entries [{i, head, headSimp, t, s}]
const chapterIndex = [];
let totalChars = 0;
let totalEntries = 0;

for (const ch of CHAPTERS) {
  const file = path.join(corpusDir, 'text', `${String(ch.n).padStart(2, '0')}-${ch.slug}.json`);
  if (!existsSync(file)) {
    errors.push(`缺少底本：${file}（先运行 npm run fetch:text）`);
    continue;
  }
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const entries = raw.paragraphs.map((p, i) => {
    const t = p.trim();
    const head = extractHead(t);
    return { i, head, headSimp: t2s(head), t, s: t2s(t) };
  });
  chapterEntries.set(ch.slug, entries);
  const chars = entries.reduce((n, e) => n + Array.from(e.t).length, 0);
  totalChars += chars;
  totalEntries += entries.length;
  chapterIndex.push({
    id: ch.slug, n: ch.n, title: ch.title, titleSimp: ch.titleSimp,
    book: ch.book, group: ch.group, entryCount: entries.length, charCount: chars,
  });
  writeJson(`text-${ch.slug}.json`, { id: ch.slug, entries });
  writeChunk(`text-${ch.slug}`, `《山海经·${ch.titleSimp}》经文载荷（${entries.length} 条）`);
}
writeJson('text-index.json', chapterIndex);

// ---------- 2. 山川地望 ----------
const locFile = path.join(corpusDir, 'locations/locations.json');
let locations = [];
if (existsSync(locFile)) {
  locations = JSON.parse(readFileSync(locFile, 'utf8'));
  const seen = new Set();
  for (const l of locations) {
    if (seen.has(l.id)) errors.push(`地望 id 重复：${l.id}`);
    seen.add(l.id);
    if (!CHAPTERS.some((c) => c.slug === l.chapter)) errors.push(`地望 ${l.id} 卷别无效：${l.chapter}`);
    if (typeof l.lat !== 'number' || typeof l.lng !== 'number' || Math.abs(l.lat) > 90 || Math.abs(l.lng) > 180) {
      errors.push(`地望 ${l.id} 坐标非法：${l.lat},${l.lng}`);
    }
    if (!['identified', 'disputed', 'legendary'].includes(l.confidence)) {
      errors.push(`地望 ${l.id} confidence 非法：${l.confidence}`);
    }
  }
} else {
  warnings.push('locations/locations.json 缺失，地望数据输出为空');
}

// ---------- 3. 图像 ----------
const imgManifestFile = path.join(corpusDir, 'images/manifest.json');
let images = [];
let collections = {};
if (existsSync(imgManifestFile)) {
  const manifest = JSON.parse(readFileSync(imgManifestFile, 'utf8'));
  collections = manifest.collections ?? {};
  images = manifest.images ?? [];
  const seen = new Set();
  for (const img of images) {
    if (seen.has(img.id)) errors.push(`图像 id 重复：${img.id}`);
    seen.add(img.id);
    if (!collections[img.collection]) errors.push(`图像 ${img.id} 画集未登记：${img.collection}`);
    const file = path.join(root, 'assets/images', img.file);
    if (!existsSync(file)) {
      errors.push(`图像文件缺失：assets/images/${img.file}（先运行 npm run fetch:images）`);
    } else {
      img.bytes = statSync(file).size;
    }
  }
} else {
  warnings.push('images/manifest.json 缺失，图像数据输出为空');
}
const imageIds = new Set(images.map((i) => i.id));

// ---------- 4. 实体百科 ----------
const entDir = path.join(corpusDir, 'entities');
let entities = [];
if (existsSync(entDir)) {
  for (const f of readdirSync(entDir).sort()) {
    if (f.endsWith('.json')) entities.push(...JSON.parse(readFileSync(path.join(entDir, f), 'utf8')));
  }
}
if (entities.length === 0) warnings.push('entities/*.json 缺失，实体数据输出为空');

const CATEGORIES = ['beast', 'bird', 'fish', 'snake', 'dragon', 'deity', 'human', 'nation', 'plant', 'mineral'];
const locIds = new Set(locations.map((l) => l.id));
const entIndex = [];
const entBodies = {};
const seenEnt = new Set();

for (const e of entities) {
  if (seenEnt.has(e.id)) errors.push(`实体 id 重复：${e.id}`);
  seenEnt.add(e.id);
  if (!CATEGORIES.includes(e.category)) errors.push(`实体 ${e.id} 类别非法：${e.category}`);
  if (e.locationId && !locIds.has(e.locationId)) errors.push(`实体 ${e.id} 地望未登记：${e.locationId}`);
  for (const img of e.images ?? []) {
    if (!imageIds.has(img)) errors.push(`实体 ${e.id} 图像未登记：${img}`);
  }

  const occurrences = [];
  let primaryChapter = null;
  for (const occ of e.occurrences ?? []) {
    const entries = chapterEntries.get(occ.chapter);
    if (!entries) {
      errors.push(`实体 ${e.id} 卷别无效：${occ.chapter}`);
      continue;
    }
    const needle = fold(occ.quote);
    if (needle.length === 0) {
      errors.push(`实体 ${e.id} 引文为空`);
      continue;
    }
    const hits = [];
    for (const entry of entries) {
      const { folded, map, chars } = foldWithMap(entry.t);
      const idx = indexOfArr(folded, needle);
      if (idx >= 0) {
        const from = map[idx];
        const to = map[idx + needle.length - 1];
        const quoteTrad = chars.slice(from, to + 1).join('');
        // 回环校验：回采引文折叠后必须与检索串一致，防切片错位
        if (fold(quoteTrad).join('') !== needle.join('')) {
          errors.push(`实体 ${e.id} 引文回采错位（${occ.chapter}#${entry.i}）`);
          continue;
        }
        hits.push({ entry: entry.i, head: entry.headSimp, quoteTrad });
      }
    }
    if (hits.length === 0) {
      errors.push(`实体 ${e.id} 引文未命中底本（${occ.chapter}）：${occ.quote.slice(0, 30)}…`);
      continue;
    }
    if (hits.length > 1 && occ.entry == null) {
      errors.push(`实体 ${e.id} 引文命中 ${hits.length} 条（${occ.chapter} 第 ${hits.map((h) => h.entry).join('/')} 条），请加长引文或指明 entry`);
      continue;
    }
    const hit = occ.entry != null ? hits.find((h) => h.entry === occ.entry) : hits[0];
    if (!hit) {
      errors.push(`实体 ${e.id} 指定 entry=${occ.entry} 与命中不符`);
      continue;
    }
    const quoteSimp = t2s(hit.quoteTrad);
    occurrences.push({
      chapter: occ.chapter, entry: hit.entry, head: hit.head,
      quoteTrad: hit.quoteTrad, quote: quoteSimp,
      ...(occ.primary ? { primary: true } : {}),
    });
    if (occ.primary || !primaryChapter) primaryChapter = occ.chapter;
  }
  if (occurrences.length === 0) errors.push(`实体 ${e.id} 无有效原文出处`);
  if (occurrences.length > 0 && !occurrences.some((o) => o.primary)) occurrences[0].primary = true;

  entIndex.push({
    id: e.id, name: e.name, nameTrad: e.nameTrad ?? e.name, pinyin: e.pinyin ?? '',
    aliases: e.aliases ?? [], category: e.category, tags: e.tags ?? [], brief: e.brief ?? '',
    chapter: primaryChapter, locationId: e.locationId ?? null,
    image: (e.images ?? [])[0] ?? null, imageCount: (e.images ?? []).length,
  });
  entBodies[e.id] = {
    occurrences, images: e.images ?? [],
    ...(e.lore ? { lore: e.lore } : {}),
  };
}

// 地望 → 实体反向引用；实体所居地必须有坐标
const locOut = locations.map((l) => ({
  ...l,
  entityIds: entIndex.filter((e) => e.locationId === l.id).map((e) => e.id),
}));
for (const l of locOut) {
  if (l.entityIds.length === 0 && !l.keep) warnings.push(`地望 ${l.id}（${l.name}）未被任何实体引用`);
}

writeJson('entities-index.json', entIndex);
writeJson('entities-bodies.json', entBodies);
writeChunk('entities-bodies', `实体百科正文载荷（${entIndex.length} 条：原文出处/引文/白话/图像）`);
writeJson('locations.json', locOut);
writeJson('images.json', { collections, images });

// ---------- 5. 繁简折叠表（语料实际用字） ----------
const foldPairs = [];
const seenChar = new Set();
const collect = (str) => {
  for (const ch of str) {
    if (seenChar.has(ch)) continue;
    seenChar.add(ch);
    const s = t2s(ch);
    if (s !== ch && Array.from(s).length === 1) foldPairs.push(ch + s);
  }
};
for (const entries of chapterEntries.values()) for (const e of entries) collect(e.t);
for (const e of entities) collect((e.nameTrad ?? '') + (e.aliases ?? []).join(''));
for (const l of locations) collect(l.name ?? '');
writeJson('fold.json', foldPairs);

// ---------- 6. 统计 ----------
writeJson('stats.json', {
  chapters: chapterIndex.length, entries: totalEntries, chars: totalChars,
  entities: entIndex.length, locations: locOut.length, images: images.length,
  foldPairs: foldPairs.length,
});

// ---------- 汇报 ----------
for (const w of warnings) console.warn(`warn: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.error(`gen failed: ${errors.length} 处错误`);
  process.exit(1);
}
console.log(
  `gen ok: ${chapterIndex.length} 卷 ${totalEntries} 条 ${totalChars} 字；` +
  `实体 ${entIndex.length}，地望 ${locOut.length}，图像 ${images.length}，折叠 ${foldPairs.length} 对`,
);
