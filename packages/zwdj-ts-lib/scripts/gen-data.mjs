// 从来源仓库的公版原文库（docs/kb/*.md）整理出 data/：catalog.json（书目与篇目）、books/<id>.json（正文）、fold.json（简繁折叠表）。
//
// 来源仓库是私有的，本脚本只在维护者本机运行；生成的 data/ 随包提交，构建与发布不再需要来源仓库。
// 书目配置见同目录 books.mjs（各包自己的一份），本脚本与 zwdj-ts-lib 的同名脚本逐字相同。
// 用法：node scripts/gen-data.mjs            默认读 ../../../<来源仓库>/docs/kb
//       SOURCE_DIR=<目录> node scripts/gen-data.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';
import { BOOKS, CORPUS } from './books.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceDir = process.env.SOURCE_DIR ? path.resolve(process.env.SOURCE_DIR) : path.resolve(root, '../../..', CORPUS.sourceRepo, 'docs/kb');
const out = path.join(root, 'data');

const git = (...args) => execFileSync('git', ['-C', sourceDir, ...args], { encoding: 'utf8', windowsHide: true }).trim();
// 只记录来源仓库里 docs/kb 最后一次提交，生成结果与本机时间无关，可重复
const sourceRevision = git('log', '-1', '--format=%H', '--', '.');
const sourceDate = git('log', '-1', '--format=%cI', '--', '.');
if (git('status', '--porcelain', '--', '.')) throw new Error(`来源目录有未提交改动，先提交再生成：${sourceDir}`);

const files = readdirSync(sourceDir);
const chars = (text) => Array.from(text).length;
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value)}\n`);

/**
 * 一份原文库 Markdown → 若干篇。
 * 文件形如：`# 书题`、若干 `> ` 说明行，其后按 `## 篇` 分节（阐微、四库本等再按 `### ` 分小节）；
 * 每节开头可有 `> 源：<地址>` 一行，取作该篇来源地址并从正文剔除。
 */
function parse(text, level) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let h1 = '';
  if (lines[i]?.startsWith('# ')) h1 = lines[i++].slice(2).trim();
  const notes = [];
  while (i < lines.length && (lines[i].startsWith('>') || !lines[i].trim())) {
    if (lines[i].startsWith('>')) notes.push(lines[i].replace(/^>\s?/, ''));
    i++;
  }
  // 地址后常跟全角括注说明，不算地址的一部分
  const noteUrl = notes.map((n) => /源：\s*(https?:\/\/[^\s（]+)/.exec(n)?.[1]).find(Boolean);
  const body = lines.slice(i).join('\n');
  // level 0：整份文件就是一篇（文内小标题留在正文里）
  if (level === 0) return { h1, notes, noteUrl, entries: [{ title: h1, group: '', raw: body }] };
  const heading = level === 3 ? /^### (.+)$/gm : /^## (.+)$/gm;
  const marks = [...body.matchAll(heading)];
  if (!marks.length) throw new Error(`《${h1}》没有 ${level} 级标题，无法分篇；整份成篇请在 books.mjs 标 split 0`);
  // 第一个标题之前不应有正文，否则会被悄悄丢掉
  const lead = body.slice(0, marks[0].index).replace(/^## .+$/gm, '').trim();
  if (lead) throw new Error(`《${h1}》首个标题前有未归篇的正文：${lead.slice(0, 40)}`);
  // 按三级标题分篇时，二级标题是卷名或大类，记作 group
  const groups = level === 3 ? [...body.matchAll(/^## (.+)$/gm)] : [];
  const groupAt = (index) => groups.filter((g) => g.index < index).at(-1)?.[1].trim() ?? '';
  const entries = marks.map((m, k) => {
    const end = k + 1 < marks.length ? marks[k + 1].index : body.length;
    let raw = body.slice(m.index + m[0].length, end);
    // 下一个二级标题属于下一卷，不归本篇
    if (level === 3) raw = raw.replace(/\n## .+\n?[\s\S]*$/, '\n');
    return { title: m[1].trim(), group: groupAt(m.index), raw };
  });
  return { h1, notes, noteUrl, entries };
}

function finish(entry, fallbackUrl) {
  let sourceUrl = fallbackUrl ?? '';
  const content = entry.raw
    .split('\n')
    .filter((line) => {
      const m = /^>\s*源：\s*(https?:\/\/[^\s（]+)(?:（.*）)?\s*$/.exec(line);
      if (m) sourceUrl = m[1];
      return !m;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { title: entry.title, group: entry.group, content, sourceUrl };
}

rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, 'books'), { recursive: true });

const corpusChars = new Set();
const books = [];
for (const cfg of BOOKS) {
  const entries = [];
  const notes = [];
  for (const prefix of cfg.files) {
    const name = files.find((f) => f.startsWith(prefix) && f.endsWith('.md'));
    if (!name) throw new Error(`来源目录缺文件：${prefix}*.md`);
    const parsed = parse(readFileSync(path.join(sourceDir, name), 'utf8'), cfg.split?.[prefix] ?? cfg.defaultSplit ?? 2);
    // 说明行里「校记」「主源」「校源」是该书的版本信息，随书目保留
    for (const n of parsed.notes) if (/^(校记|主源|校源)：/.test(n)) notes.push(n);
    // 来源地址：篇内「> 源：」行 > 文件说明行里的地址 > 按文件配置 > 全书地址；确无网页地址的留空
    const fallbackUrl = parsed.noteUrl ?? cfg.sourceUrlByFile?.[prefix] ?? cfg.sourceUrl;
    for (const e of parsed.entries) {
      const done = finish(e, fallbackUrl);
      if (!done.content) continue; // 只有小标题、没有正文的节（如卷名）不成篇
      // 一部书由多份文件组成、其中某份又拆成多篇时（如诸星问答论），该文件书题记作这些篇的大类
      entries.push({ ...done, group: done.group || (cfg.groupByFile && done.title !== parsed.h1 ? parsed.h1 : '') });
    }
  }
  if (entries.length < (cfg.minEntries ?? 1)) throw new Error(`${cfg.id}：只整理出 ${entries.length} 篇，少于预期 ${cfg.minEntries}`);
  const width = String(entries.length).length;
  const content = {};
  const index = entries.map((e, n) => {
    const id = String(n + 1).padStart(Math.max(2, width), '0');
    content[id] = e.content;
    for (const ch of e.content) corpusChars.add(ch);
    return { id, title: e.title, group: e.group, chars: chars(e.content), sourceUrl: e.sourceUrl };
  });
  writeJson(path.join(out, 'books', `${cfg.id}.json`), content);
  books.push({
    id: cfg.id, title: cfg.title, workTitle: cfg.workTitle, author: cfg.author, dynasty: cfg.dynasty,
    script: cfg.script, edition: cfg.edition, summary: cfg.summary, sourceUrl: cfg.sourceUrl,
    notes, file: `books/${cfg.id}.json`, entryCount: index.length, chars: index.reduce((sum, e) => sum + e.chars, 0), entries: index,
  });
}

// 简繁折叠表：只存逐字转换后有变化的字。覆盖语料用字和 CJK 基本区、扩展 A，
// 查询用繁体、正文用简体（或反之）都能对上。正文保持底本字形，表只用于检索。
const converters = ['t', 'tw', 'hk'].map((from) => OpenCC.Converter({ from, to: 'cn' }));
const candidates = new Set(corpusChars);
for (let cp = 0x3400; cp <= 0x4dbf; cp++) candidates.add(String.fromCodePoint(cp));
for (let cp = 0x4e00; cp <= 0x9fff; cp++) candidates.add(String.fromCodePoint(cp));
const fold = {};
for (const ch of [...candidates].sort()) {
  if (!/\p{Script=Han}/u.test(ch)) continue;
  for (const convert of converters) {
    const simplified = convert(ch);
    if (simplified !== ch && simplified.length === ch.length) {
      fold[ch] = simplified;
      break;
    }
  }
}
writeJson(path.join(out, 'fold.json'), fold);

const totals = { books: books.length, entries: books.reduce((s, b) => s + b.entryCount, 0), chars: books.reduce((s, b) => s + b.chars, 0) };
writeJson(path.join(out, 'catalog.json'), {
  schemaVersion: 1,
  corpus: CORPUS.id,
  system: CORPUS.system,
  title: CORPUS.title,
  origin: { repository: CORPUS.sourceRepo, path: 'docs/kb', revision: sourceRevision, committedAt: sourceDate },
  rights: CORPUS.rights,
  excluded: CORPUS.excluded,
  totals,
  books,
});
console.log(`data/: ${totals.books} 部书，${totals.entries} 篇，${totals.chars} 字；简繁折叠表 ${Object.keys(fold).length} 字；来源 ${CORPUS.sourceRepo}@${sourceRevision.slice(0, 7)}`);
