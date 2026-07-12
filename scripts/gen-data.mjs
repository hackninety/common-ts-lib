/**
 * 语料生成：docs/corpus/（规范底本，含源 frontmatter）→ src/data/*.json + src/chunks/*.ts
 *
 *   讲稿库    docs/corpus/<slug>/<group>/*.md → docs-manifest.json（轻量全库篇目）
 *                                             + docs-<slug>.json（按书分包懒加载载荷）
 *   医案库    docs/corpus/_cases/<group>/*.md → cases-index.json + cases-<group>.json
 *   结构化    docs/corpus/_structured/{herbs,acupoints,formulas} → *-index.json + *-bodies.json
 *   逐字稿    docs/corpus/_transcripts/*.json → transcripts-index.json + transcripts-<book>.json
 *   64 卦     docs/corpus/_gua64/*.md → gua64.json
 *   注册表    books.json（书目/分组/保真度/来源）、corpus-stats.json（测试锚点）
 *
 * 保真度（fidelity）：first-party 倪师亲笔｜lecture-notes 听课整理稿｜transcript 视频逐字稿
 *                    ｜attributed 传为倪师所述（整理者自注存疑）｜third-party 第三方整理/补充。
 * 底本文字不做任何改写；仅剥离引入期 frontmatter、统一标题行。异常记 textualIssues。
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import yaml from 'js-yaml';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CORPUS = path.join(root, 'docs/corpus');
const DATA = path.join(root, 'src/data');
const CHUNKS = path.join(root, 'src/chunks');
mkdirSync(DATA, { recursive: true });
mkdirSync(CHUNKS, { recursive: true });

const textualIssues = [];
const stats = { books: {}, cases: {}, transcripts: {}, structured: {}, gua: 0 };

// ---------------------------------------------------------------- 注册表
const R_NIVANCE = 'github:nivance/nihaixia-kb';
const R_QMZZ = 'github:qmzz/ni-haisha-tcm-skill';
const R_ZHONGLI = 'github:wesky-online/zhongli_data';
const R_DREAMS = 'github:dreams-flying/nihaixia-tianji';
const R_GUA = 'github:wh149728915-stack/nihaixia-64gua';

/** 讲稿书目（docs 库）。group.fidelity 缺省承书级。 */
const BOOKS = [
  { slug: 'zhenjiu', name: '针灸大成', series: '人纪', fidelity: 'lecture-notes', sourceRepo: R_NIVANCE,
    groups: [{ id: 'ben', title: '正文' }] },
  { slug: 'neijing', name: '黄帝内经', series: '人纪', fidelity: 'lecture-notes', sourceRepo: R_NIVANCE,
    groups: [{ id: 'ben', title: '正文' }] },
  { slug: 'bencao', name: '神农本草经', series: '人纪', fidelity: 'lecture-notes', sourceRepo: R_NIVANCE,
    groups: [
      { id: 'zonglun', title: '总论' },
      { id: 'shang', title: '上经' },
      { id: 'zhong', title: '中经' },
      { id: 'xia', title: '下经' },
      { id: 'buchong', title: '倪师补充' },
      { id: 'buchong-bianji', title: '小编补充药物', fidelity: 'third-party' },
    ] },
  { slug: 'shanghan', name: '伤寒论', series: '人纪', fidelity: 'lecture-notes', sourceRepo: R_NIVANCE,
    groups: [{ id: 'ben', title: '正文' }] },
  { slug: 'jingui', name: '金匮要略', series: '人纪', fidelity: 'lecture-notes', sourceRepo: R_NIVANCE,
    groups: [
      { id: 'ben', title: '正文' },
      { id: 'anli', title: '临床案例与方剂补充' },
      { id: 'liangong', title: '练功方法' },
      { id: 'zhenjiu-buchong', title: '临床针灸补充' },
    ] },
  { slug: 'bimen', name: '人纪班闭门课', series: '人纪', fidelity: 'lecture-notes', sourceRepo: R_NIVANCE,
    groups: [
      { id: 'ben', title: '专病讲座' },
      { id: 'dizi-ketang', title: '弟子课堂' },
    ] },
  { slug: 'fulu', name: '人纪附录', series: '人纪', fidelity: 'third-party', sourceRepo: R_NIVANCE,
    groups: [
      { id: 'zongjie', title: '整理者总结' },
      { id: 'dizi', title: '弟子经验分享' },
    ] },
  { slug: 'tianji', name: '天纪', series: '天纪', fidelity: 'lecture-notes', sourceRepo: R_NIVANCE,
    groups: [
      { id: '01-tianjidao', title: '天机道' },
      { id: '02-ziwei', title: '紫微斗数' },
      { id: '02-ziwei-gong', title: '紫微十二宫详解' },
      { id: '02-ziwei-anli', title: '紫微斗数案例' },
      { id: '03-dimai', title: '地脉道' },
      { id: '04-renjian', title: '人间道' },
      { id: '05-kanyu', title: '堪舆学' },
      { id: '06-liushen', title: '六神占断' },
      { id: '07-shouxiang', title: '手相' },
      { id: '08-sizhu', title: '四柱命卦' },
      { id: '09-guina', title: '归纳总结' },
      { id: '10-xingzuo', title: '星座' },
    ] },
  { slug: 'zimu', name: '天纪视频字幕', series: '天纪', fidelity: 'transcript', sourceRepo: R_DREAMS,
    groups: [{ id: 'ben', title: '字幕全集' }] },
  { slug: 'diji', name: '地纪', series: '地纪', fidelity: 'first-party', sourceRepo: R_NIVANCE,
    groups: [{ id: 'ben', title: '遗稿八篇' }] },
  { slug: 'jiangzuo', name: '讲座演讲', series: '讲演', fidelity: 'transcript', sourceRepo: R_NIVANCE,
    groups: [
      { id: 'zhongjing', title: '仲景心法' },
      { id: 'fuyang', title: '扶阳论坛演讲' },
      { id: 'stanford', title: '斯坦福演讲' },
      { id: 'liangdong', title: '梁冬对话倪海厦' },
      { id: 'jingfang', title: '经方妙用' },
    ] },
  { slug: 'zhuanti', name: '专题文章', series: '文集', fidelity: 'first-party', sourceRepo: R_NIVANCE,
    groups: [{ id: 'ben', title: '专题' }] },
  { slug: 'fangjie', name: '汉唐方剂讲解', series: '文集', fidelity: 'attributed', sourceRepo: R_NIVANCE,
    groups: [{ id: 'ben', title: '方剂' }] },
  { slug: 'xiangxue', name: '相学注解', series: '文集', fidelity: 'lecture-notes', sourceRepo: R_NIVANCE,
    groups: [{ id: 'ben', title: '正文' }] },
];

/** 医案分组（结构化分支） */
const CASE_GROUPS = [
  { id: 'riji2005', title: '2005 年诊疗日志', fidelity: 'first-party' },
  { id: 'riji2006', title: '2006 年诊疗日志', fidelity: 'first-party' },
  { id: 'riji2007', title: '2007 年诊疗日志', fidelity: 'first-party' },
  { id: 'riji2008', title: '2008 年诊疗日志', fidelity: 'first-party' },
  { id: 'zhenliao2005', title: '2005 年诊疗日志·补', fidelity: 'first-party' },
  { id: 'zhenliao2006', title: '2006 年诊疗日志·补', fidelity: 'first-party' },
  { id: 'bianhao', title: '诊所医案编号档（神州医料库）', fidelity: 'third-party' },
  { id: 'shenzhou358', title: '08 年医案 358 篇（神州医料库）', fidelity: 'third-party' },
  { id: 'jilu', title: '医案记录', fidelity: 'third-party' },
  { id: 'renjiban', title: '人纪班诊疗案例', fidelity: 'third-party' },
  { id: 'luyin', title: '录音坐诊医案', fidelity: 'transcript' },
];

/** 逐字稿书目（book_id ← 源 json 文件名） */
const TRANSCRIPT_BOOKS = [
  { book: 'zhenjiu', title: '针灸大成·视频逐字稿', file: 'zhenjiu_wenzi.json' },
  { book: 'neijing', title: '黄帝内经·视频逐字稿', file: 'neijing_wenzi.json' },
  { book: 'bencao', title: '神农本草经·视频逐字稿', file: 'bencao_wenzi.json' },
  { book: 'shanghan', title: '伤寒论·视频逐字稿', file: 'shanghan_wenzi.json' },
  { book: 'jingui', title: '金匮要略·视频逐字稿', file: 'jkyl_wenzi.json' },
];

// ---------------------------------------------------------------- 工具
const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cn = (s) => {
  if (!s) return NaN;
  if (s.length === 1) return CN_NUM[s] ?? NaN;
  if (s.includes('十')) {
    const [a, b = ''] = s.split('十');
    return (a ? CN_NUM[a] : 1) * 10 + (b ? CN_NUM[b] : 0);
  }
  return NaN;
};

/** 剥 frontmatter：容忍未闭合（002.md 等医案档）；返回 { meta, body } */
function splitFrontmatter(raw, file) {
  const src = raw.replace(/^﻿/, '');
  if (!src.startsWith('---')) return { meta: {}, body: src.trim() };
  const lines = src.split(/\r?\n/);
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (/^---\s*$/.test(lines[i])) { end = i; break; }
    // 未闭合 frontmatter：遇到非 `key: v`/续行 即视为正文开始
    if (!/^[\w一-鿿_-]+:/.test(lines[i]) && !/^\s+\S/.test(lines[i]) && lines[i].trim() !== '') {
      end = i; break;
    }
  }
  if (end === -1) return { meta: {}, body: src.trim() };
  const fmRaw = lines.slice(1, /^---\s*$/.test(lines[end]) ? end : end).join('\n');
  const bodyStart = /^---\s*$/.test(lines[end]) ? end + 1 : end;
  let meta = {};
  try {
    meta = yaml.load(fmRaw) ?? {};
  } catch {
    // 源 YAML 破损（qmzz 部分 quote 字段含未转义引号/换行）：按行回退，
    // 顶层 key 逐行取值，source_refs 用状态机重建，不丢引用证据。
    textualIssues.push(`frontmatter 解析失败（按行回退）：${file}`);
    const refs = [];
    let cur = null;
    let inQuote = false;
    for (const l of fmRaw.split('\n')) {
      let m;
      if ((m = l.match(/^\s*-\s*source_file:\s*"?(.*?)"?\s*$/))) {
        cur = { source_file: m[1], page_num: null, quote: '' };
        refs.push(cur);
        inQuote = false;
      } else if (cur && (m = l.match(/^\s*page_num:\s*(\S+)/))) {
        cur.page_num = m[1] === 'null' ? null : Number(m[1]);
      } else if (cur && (m = l.match(/^\s*quote:\s*"?(.*)$/))) {
        cur.quote = m[1].replace(/"\s*$/, '');
        inQuote = !/"\s*$/.test(m[1]);
      } else if (inQuote && cur) {
        cur.quote += '\n' + l.replace(/"\s*$/, '');
        if (/"\s*$/.test(l)) inQuote = false;
      } else if ((m = l.match(/^([\w一-鿿_-]+):\s*(.*)$/))) {
        meta[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
    if (refs.length) meta.source_refs = refs;
  }
  if (typeof meta !== 'object' || Array.isArray(meta)) meta = {};
  return { meta, body: lines.slice(bodyStart).join('\n').trim() };
}

/** 文件名 → { order, rawTitle, date? }（多种编号风格） */
function parseName(base) {
  const name = base.replace(/\.md$/i, '');
  let m;
  if ((m = name.match(/^(\d{6})(.*)$/))) {
    const d = m[1];
    return { order: Number(d), rawTitle: m[2].replace(/^[-.、\s]+/, '') || name, date: `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}` };
  }
  if ((m = name.match(/^(\d+)[.\-、_]\s*(.+)$/))) return { order: Number(m[1]), rawTitle: m[2] };
  if ((m = name.match(/^(\d+)$/))) return { order: Number(m[1]), rawTitle: name };
  // 编号方（汉唐 HT-100历节丸 等）：按编号排序，标题保留全名
  if ((m = name.match(/^[A-Za-z]{1,4}-?(\d+)/))) return { order: Number(m[1]), rawTitle: name };
  if ((m = name.match(/-(\d+)$/))) return { order: Number(m[1]), rawTitle: name };
  if ((m = name.match(/^第([一二三四五六七八九十]+)(部分|讲|章|节|课)/))) {
    const n = cn(m[1]);
    if (!Number.isNaN(n)) return { order: n, rawTitle: name.replace(/^第[一二三四五六七八九十]+(部分|讲|章|节|课)[：:，、\s]*/, '') || name };
  }
  if (/^(结尾|附录|后记)/.test(name)) return { order: 900, rawTitle: name };
  if (/^(README|readme)/.test(name)) return { order: -1, rawTitle: '前言' };
  return { order: 500, rawTitle: name };
}

/** 标题清理：去序号前缀（仅「数字+分隔符+非数字」形态）与结尾句读 */
function cleanTitle(t) {
  return String(t).trim()
    .replace(/^\d+[.\-、_]\s*(?=\D)/, '')
    .replace(/\.md$/i, '')
    .replace(/[。，,]$/, '')
    .trim();
}

const readDirFiles = (dir) => existsSync(dir)
  ? readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md') && statSync(path.join(dir, f)).isFile()).sort()
  : [];

const jsonOut = (name, obj) => {
  const s = JSON.stringify(obj);
  writeFileSync(path.join(DATA, name), s);
  return s.length;
};

/** 生成载荷 TS 模块（供 docs/cases/transcripts 等动态 import 分包） */
function chunkModule(fileBase, jsonName, doc) {
  writeFileSync(path.join(CHUNKS, `${fileBase}.ts`), `/**
 * ${doc}
 * 生成文件（scripts/gen-data.mjs），勿手改；仅供各入口动态 import 分包使用。
 */
import data from '../data/${jsonName}';

export const payload: unknown = data;
`);
}

// ---------------------------------------------------------------- 讲稿库
const manifest = [];
const booksOut = [];

for (const book of BOOKS) {
  const docs = {};
  let bookCount = 0;
  const groupsOut = [];
  for (const g of book.groups) {
    const dir = path.join(CORPUS, book.slug, g.id);
    const files = readDirFiles(dir);
    if (!files.length) textualIssues.push(`空分组：${book.slug}/${g.id}`);
    const entries = [];
    for (const f of files) {
      // 递归引入的子目录文件名形如「第二部分：美国临床案例·1.xxx.md」
      const [subPrefix, rest] = f.includes('·') ? [f.slice(0, f.indexOf('·')), f.slice(f.indexOf('·') + 1)] : [null, f];
      const p = parseName(rest);
      let order = p.order;
      let subTitle = '';
      if (subPrefix) {
        const pm = subPrefix.match(/^第([一二三四五六七八九十]+)部分/);
        const major = pm ? cn(pm[1]) : 50;
        order = major * 100 + (p.order === 500 ? 50 : p.order);
        subTitle = subPrefix.replace(/^第[一二三四五六七八九十]+部分[：:，、\s]*/, '');
      }
      const { meta, body } = splitFrontmatter(readFileSync(path.join(dir, f), 'utf8'), `${book.slug}/${g.id}/${f}`);
      if (!body) { textualIssues.push(`空文档弃收：${book.slug}/${g.id}/${f}`); continue; }
      let title = cleanTitle(meta.title || p.rawTitle);
      if (subTitle) title = `${subTitle}·${title}`;
      entries.push({ order, title, date: p.date, body, file: f });
    }
    entries.sort((a, b) => a.order - b.order || a.file.localeCompare(b.file, 'zh'));
    const seen = new Map();
    for (const e of entries) {
      const n = (seen.get(e.title) ?? 0) + 1;
      seen.set(e.title, n);
      const uniqTitle = n > 1 ? `${e.title}（${n}）` : e.title;
      const docPath = `${book.slug}/${g.id}/${String(bookCount + 1).padStart(3, '0')}-${uniqTitle.replace(/[\\/:*?"<>|#%]/g, '·')}.md`;
      // 正文若以与标题重复的标题行开头则去重，统一由 H1 承载
      let body = e.body.replace(/^#{1,6}\s*(.+)\s*\n+/, (m0, h) => (cleanTitle(h) === e.title ? '' : m0));
      body = `# ${uniqTitle}\n\n${body.trim()}\n`;
      docs[docPath] = body;
      manifest.push({
        path: docPath, title: uniqTitle, group: g.id, book: book.name, series: book.series,
        fidelity: g.fidelity ?? book.fidelity, ...(e.date ? { date: e.date } : {}),
      });
      bookCount++;
    }
    groupsOut.push({ id: g.id, title: g.title, count: entries.length, fidelity: g.fidelity ?? book.fidelity });
  }
  jsonOut(`docs-${book.slug}.json`, { docs });
  chunkModule(`docs-${book.slug}`, `docs-${book.slug}.json`, `《${book.name}》文档载荷`);
  booksOut.push({ slug: book.slug, name: book.name, series: book.series, fidelity: book.fidelity, sourceRepo: book.sourceRepo, groups: groupsOut, count: bookCount });
  stats.books[book.slug] = bookCount;
}
jsonOut('docs-manifest.json', { manifest });

// ---------------------------------------------------------------- 医案库
const caseIndex = [];
const caseGroupsOut = [];
for (const g of CASE_GROUPS) {
  const dir = path.join(CORPUS, '_cases', g.id);
  const files = readDirFiles(dir);
  const chunk = {};
  const entries = [];
  for (const f of files) {
    const p = parseName(f);
    const { meta, body } = splitFrontmatter(readFileSync(path.join(dir, f), 'utf8'), `_cases/${g.id}/${f}`);
    if (!body) continue;
    let title = cleanTitle(meta.title || p.rawTitle);
    // 提要：来诊原因 / 首个正文行
    let summary;
    const m = body.match(/来诊原因[：:]?\s*\n?([^\n]{4,90})/);
    if (m) summary = m[1].trim().replace(/\s+/g, ' ');
    else {
      const first = body.split('\n').map((l) => l.trim()).find((l) => l && !/^#|^\||^-|^>|^姓名|^初诊日期/.test(l));
      if (first) summary = first.slice(0, 60);
    }
    let date = p.date;
    const dm = body.match(/初诊日期[：:]\s*(\d{4})[\/\-年.](\d{1,2})[\/\-月.](\d{1,2})/);
    if (dm) date = `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}`;
    entries.push({ order: p.order, id: null, title, date, summary, body, file: f });
  }
  entries.sort((a, b) => a.order - b.order || a.file.localeCompare(b.file, 'zh'));
  let i = 0;
  for (const e of entries) {
    i++;
    const id = `${g.id}/${String(i).padStart(3, '0')}`;
    chunk[id] = `# ${e.title}\n\n${e.body}\n`;
    caseIndex.push({ id, group: g.id, title: e.title, ...(e.date ? { date: e.date } : {}), ...(e.summary ? { summary: e.summary } : {}) });
  }
  jsonOut(`cases-${g.id}.json`, { cases: chunk });
  chunkModule(`cases-${g.id}`, `cases-${g.id}.json`, `医案分组「${g.title}」载荷`);
  caseGroupsOut.push({ id: g.id, title: g.title, fidelity: g.fidelity, count: entries.length });
  stats.cases[g.id] = entries.length;
}
jsonOut('cases-index.json', { groups: caseGroupsOut, cases: caseIndex });

// ---------------------------------------------------------------- 结构化实体（qmzz）
const norm = (s) => String(s ?? '').trim();
const asRefs = (v) => Array.isArray(v)
  ? v.map((r) => ({ file: norm(r?.source_file), page: r?.page_num ?? null, quote: norm(r?.quote) })).filter((r) => r.file || r.quote)
  : [];

function loadStructured(kind) {
  const dir = path.join(CORPUS, '_structured', kind);
  const out = [];
  for (const f of readDirFiles(dir)) {
    if (/index\.md$/i.test(f)) continue;
    const { meta, body } = splitFrontmatter(readFileSync(path.join(dir, f), 'utf8'), `_structured/${kind}/${f}`);
    const id = f.replace(/\.md$/i, '');
    const name = cleanTitle(meta.title || id);
    if (!name || /^[a-z_]+$/.test(name)) { textualIssues.push(`结构化条目缺中文名弃收：${kind}/${f}`); continue; }
    out.push({ id, name, meta, body, refs: asRefs(meta.source_refs) });
  }
  return out;
}

// 穴位索引表（经络/定位/功效/类型）
const acuMeta = new Map();
{
  const idxFile = path.join(CORPUS, '_structured/acupoints/acupoint_index.md');
  if (existsSync(idxFile)) {
    let meridian = '';
    for (const line of readFileSync(idxFile, 'utf8').split(/\r?\n/)) {
      const h = line.match(/^##\s+(\S.*)$/);
      if (h && !/穴位统计/.test(h[1])) { meridian = h[1].trim(); continue; }
      const row = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|(.+?)\|(.+?)\|(.+?)\|.*\((.+?)\.md\)/);
      if (row && meridian) {
        acuMeta.set(row[5].trim(), {
          meridian, location: row[2].trim(), effect: row[3].trim(), pointType: row[4].trim(),
        });
      }
    }
  }
}

// 本草讲稿药名 → 文档路径（跨分支互链）
const bencaoDocByName = new Map();
for (const e of manifest) {
  if (e.path.startsWith('bencao/') && !['zonglun'].includes(e.group)) {
    bencaoDocByName.set(e.title.replace(/（\d+）$/, ''), e.path);
  }
}

{
  const herbs = loadStructured('herbs');
  const index = [];
  const bodies = {};
  for (const h of herbs) {
    index.push({
      id: h.id, name: h.name,
      source: norm(h.meta.source) || undefined,
      category: norm(h.meta.category) || undefined,
      xingwei: norm(h.meta['性味']) || undefined,
      guijing: norm(h.meta['归经']) || undefined,
      gongxiao: norm(h.meta['功效']) || undefined,
      zhuzhi: norm(h.meta['主治']) || undefined,
      bencaoDoc: bencaoDocByName.get(h.name),
    });
    bodies[h.id] = { md: h.body, refs: h.refs };
  }
  index.sort((a, b) => a.id.localeCompare(b.id));
  jsonOut('herbs-index.json', { herbs: index });
  jsonOut('herbs-bodies.json', { bodies });
  chunkModule('herbs-bodies', 'herbs-bodies.json', '中药正文与引用载荷');
  stats.structured.herbs = index.length;
}

{
  const acu = loadStructured('acupoints');
  const index = [];
  const bodies = {};
  // 正文结构行（**归经：** 手阳明大肠经（LI4） 等）；索引表值优先，正文补缺
  const bodyField = (body, key) => {
    const m = body.match(new RegExp(`\\*\\*${key}：?\\*\\*\\s*[:：]?\\s*([^\\n]+)`));
    return m ? m[1].trim() : undefined;
  };
  for (const a of acu) {
    const extra = acuMeta.get(a.id) ?? {};
    const guijing = bodyField(a.body, '归经');
    const meridian = extra.meridian ?? (guijing ? guijing.replace(/[（(][^）)]*[）)]\s*$/, '').trim() : undefined);
    const code = (a.body.match(/^#[^\n]*[（(]([A-Z]{1,3}\d+)[）)]/m) ?? (guijing ?? '').match(/[（(]([A-Z]{1,3}\d+)[）)]/))?.[1];
    const aliasLine = bodyField(a.body, '别名');
    index.push({
      id: a.id, name: a.name.replace(/穴$/, ''),
      meridian,
      location: extra.location ?? bodyField(a.body, '定位'),
      effect: extra.effect ?? bodyField(a.body, '功效'),
      pointType: extra.pointType ?? bodyField(a.body, '属性'),
      ...(code ? { code } : {}),
      ...(aliasLine ? { aliases: aliasLine.split(/[、,，\s]+/).filter(Boolean) } : {}),
    });
    bodies[a.id] = { md: a.body, refs: a.refs };
  }
  index.sort((a, b) => a.id.localeCompare(b.id));
  jsonOut('acupoints-index.json', { acupoints: index });
  jsonOut('acupoints-bodies.json', { bodies });
  chunkModule('acupoints-bodies', 'acupoints-bodies.json', '穴位正文与引用载荷');
  stats.structured.acupoints = index.length;
}

{
  const formulas = loadStructured('formulas');
  const index = [];
  const bodies = {};
  for (const f of formulas) {
    index.push({
      id: f.id, name: f.name,
      source: norm(f.meta.source) || undefined,
      category: norm(f.meta.category) || undefined,
    });
    bodies[f.id] = { md: f.body, refs: f.refs };
  }
  index.sort((a, b) => a.id.localeCompare(b.id));
  jsonOut('formulas-index.json', { formulas: index });
  jsonOut('formulas-bodies.json', { bodies });
  chunkModule('formulas-bodies', 'formulas-bodies.json', '方剂正文与引用载荷');
  stats.structured.formulas = index.length;
}

// ---------------------------------------------------------------- 人纪逐字稿
{
  const idx = [];
  for (const tb of TRANSCRIPT_BOOKS) {
    const p = path.join(CORPUS, '_transcripts', tb.file);
    if (!existsSync(p)) { textualIssues.push(`缺逐字稿：${tb.file}`); continue; }
    const items = JSON.parse(readFileSync(p, 'utf8'));
    const chapters = [];
    const byId = new Map();
    for (const it of items) {
      let ch = byId.get(it.chapter_id);
      if (!ch) {
        ch = { id: it.chapter_id, title: norm(it.chapter_title), paras: [] };
        byId.set(it.chapter_id, ch);
        chapters.push(ch);
      }
      ch.paras.push([it.paragraph_id, norm(it.content)]);
    }
    for (const ch of chapters) ch.paras.sort((a, b) => a[0] - b[0]);
    jsonOut(`transcripts-${tb.book}.json`, { book: tb.book, title: tb.title, chapters });
    chunkModule(`transcripts-${tb.book}`, `transcripts-${tb.book}.json`, `${tb.title}载荷`);
    const paraCount = items.length;
    idx.push({
      book: tb.book, title: tb.title, paraCount,
      chapters: chapters.map((c) => ({ id: c.id, title: c.title, paras: c.paras.length })),
    });
    stats.transcripts[tb.book] = paraCount;
  }
  jsonOut('transcripts-index.json', { books: idx });
}

// ---------------------------------------------------------------- 64 卦
{
  const dir = path.join(CORPUS, '_gua64');
  const gua = [];
  for (const f of readDirFiles(dir)) {
    const m = f.match(/^(\d+)\.(.+?)([䷀-䷿])?\.md$/);
    if (!m) { textualIssues.push(`64卦文件名不合式：${f}`); continue; }
    const { body } = splitFrontmatter(readFileSync(path.join(dir, f), 'utf8'), `_gua64/${f}`);
    gua.push({ no: Number(m[1]), name: m[2].trim(), symbol: m[3] ?? '', md: body });
  }
  gua.sort((a, b) => a.no - b.no);
  jsonOut('gua64.json', { gua });
  chunkModule('gua64', 'gua64.json', '天纪 64 卦详解载荷');
  stats.gua = gua.length;
}

// ---------------------------------------------------------------- 注册表 / 统计
const sources = existsSync(path.join(CORPUS, '_meta/sources.json'))
  ? JSON.parse(readFileSync(path.join(CORPUS, '_meta/sources.json'), 'utf8'))
  : { repos: [] };
jsonOut('books.json', { books: booksOut, caseGroups: caseGroupsOut, sources: sources.repos });
stats.docsTotal = manifest.length;
stats.casesTotal = caseIndex.length;
stats.textualIssues = textualIssues.length;
jsonOut('corpus-stats.json', stats);
writeFileSync(path.join(DATA, 'textual-issues.json'), JSON.stringify({ issues: textualIssues }, null, 1));

console.log(`gen ok: ${manifest.length} docs / ${caseIndex.length} cases / ` +
  `${stats.structured.herbs} herbs / ${stats.structured.acupoints} acupoints / ${stats.structured.formulas} formulas / ` +
  `${Object.values(stats.transcripts).reduce((a, b) => a + b, 0)} transcript paras / ${stats.gua} gua`);
if (textualIssues.length) console.log(`textualIssues: ${textualIssues.length}（见 src/data/textual-issues.json）`);
