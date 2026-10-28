/**
 * 语料生成：docs/corpus/（规范底本）→ src/data/*.json + src/chunks/*.ts
 *
 *   条文库    verses/tiaowen.csv → volumes.json（轻量卷册清单）
 *                                + verses-<slug>.json ×12（按集分包懒加载载荷，紧凑元组）
 *                                + ages-index.json（年龄注记 → 条文号倒排，懒加载）
 *   取数表    tables/14-*.csv → tables.json（通用表格形态，columns + rows）
 *   注解精选  annotated/tiepan.json → annotated.json
 *   方法文献  method/*.md → method-docs.json（篇目）+ chunks/method-docs.ts（载荷）
 *   注册表    registry.json（来源仓库锁定）、corpus-stats.json（测试锚点）
 *
 * 底本文字不做任何改写；条文年龄注记仅做全角逗号→半角的键规范化（原文段保留在底本）。
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CORPUS = path.join(root, 'docs/corpus');
const DATA = path.join(root, 'src/data');
const CHUNKS = path.join(root, 'src/chunks');
mkdirSync(DATA, { recursive: true });
mkdirSync(CHUNKS, { recursive: true });

const stats = {};
const textualIssues = [];

/** RFC4180 风格 CSV 解析（支持引号包裹、内嵌逗号/换行/转义引号） */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cell); cell = '';
    } else if (c === '\n') {
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else if (c !== '\r') {
      cell += c;
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function writeJson(name, obj, opts) {
  // 大载荷（条文/表格/倒排）紧凑序列化省宿主包重；小索引保留缩进便于查阅
  const indent = opts?.compact ? 0 : 1;
  writeFileSync(path.join(DATA, name), JSON.stringify(obj, null, indent) + '\n');
}

function writeChunk(name, dataFile, doc) {
  const code = `/**\n * ${doc}\n * 生成文件（scripts/gen-data.mjs），勿手改；仅供各入口动态 import 分包使用。\n */\nimport data from '../data/${dataFile}';\n\nexport const payload: unknown = data;\n`;
  writeFileSync(path.join(CHUNKS, `${name}.ts`), code);
}

// ---------------------------------------------------------------- 条文库
const BRANCHES = [
  ['zi', '子'], ['chou', '丑'], ['yin', '寅'], ['mao', '卯'], ['chen', '辰'], ['si', '巳'],
  ['wu', '午'], ['wei', '未'], ['shen', '申'], ['you', '酉'], ['xu', '戌'], ['hai', '亥'],
];

{
  const rows = parseCsv(readFileSync(path.join(CORPUS, 'verses/tiaowen.csv'), 'utf8'));
  const [header, ...data] = rows;
  if (header.join(',') !== '集,条文数,年龄,吉凶断词') throw new Error(`条文表头异常：${header}`);
  if (data.length !== 12000) throw new Error(`条文行数异常：${data.length}`);

  const volumes = BRANCHES.map(([slug, branch], i) => ({
    slug, branch, name: `${branch}集`, start: 1001 + i * 1000, end: 2000 + i * 1000, count: 1000,
  }));

  const byVolume = new Map(volumes.map((v) => [v.name, []]));
  const agesIndex = {};
  let agesAnnotated = 0;
  for (const [vol, nStr, ageStr, text] of data) {
    const n = Number(nStr);
    const bucket = byVolume.get(vol);
    if (!bucket) throw new Error(`未知集名：${vol}（条 ${nStr}）`);
    if (!text.trim()) throw new Error(`空断语：条 ${nStr}`);
    // 年龄注记：全角逗号规范化；仅接受纯数字段
    let ages = ageStr.trim()
      ? ageStr.replace(/，/g, ',').split(',').map((x) => x.trim()).filter(Boolean).map(Number)
      : [];
    if (ages.some((a) => !Number.isInteger(a) || a < 0 || a > 120)) {
      // 底本个别条目相邻岁数对丢失分隔符（如「3940」「454，6」）：
      // 取全部数字重排为二位岁数对，仅当构成 a,a+1 相邻对时接受，并登记 textualIssue
      const digits = ageStr.replace(/\D/g, '');
      const a = Number(digits.slice(0, 2));
      const b = Number(digits.slice(2));
      if (digits.length === 4 && b === a + 1) {
        ages = [a, b];
        textualIssues.push(`年龄注记分隔符缺失，修复为 ${a},${b}：条 ${nStr}「${ageStr}」`);
      } else {
        throw new Error(`年龄注记异常：条 ${nStr}「${ageStr}」`);
      }
    }
    if (ages.length) agesAnnotated++;
    for (const a of ages) (agesIndex[a] ??= []).push(n);
    // 紧凑元组：[条文号, 断语, 年龄...]
    bucket.push([n, text, ...ages]);
  }

  for (const v of volumes) {
    const verses = byVolume.get(v.name);
    if (verses.length !== 1000) throw new Error(`${v.name} 条数异常：${verses.length}`);
    verses.sort((a, b) => a[0] - b[0]);
    if (verses[0][0] !== v.start || verses[999][0] !== v.end) throw new Error(`${v.name} 号段异常`);
    writeJson(`verses-${v.slug}.json`, { volume: v.name, verses }, { compact: true });
    writeChunk(`verses-${v.slug}`, `verses-${v.slug}.json`, `条文载荷 · ${v.name}（第 ${v.start}–${v.end} 条）`);
  }
  writeJson('volumes.json', { volumes });
  writeJson('ages-index.json', { ages: agesIndex }, { compact: true });
  writeChunk('ages-index', 'ages-index.json', '年龄注记倒排索引（岁数 → 条文号）');
  stats.verses = data.length;
  stats.volumes = volumes.length;
  stats.agesAnnotated = agesAnnotated;
  console.log(`条文 ${data.length} · 十二集 · 年龄注记 ${agesAnnotated}`);
}

// ---------------------------------------------------------------- 取数表
const TABLE_DEFS = [
  ['14-1', 'month', '月份表', '农历月份 → 数值（先天命数合算）'],
  ['14-2', 'hour', '时辰表', '时支 → 数值（先天命数合算）'],
  ['14-3', 'wuyin', '五音表', '先天命数对 × 年干五合组 → 宫商角徵羽'],
  ['14-4', 'wuyin-value', '五音数表', '五音 → 数值'],
  ['14-5', 'day-life', '日命表', '日柱纳音五行 × 日干 → 日命数'],
  ['14-6', 'hour-fortune', '时运表', '时柱纳音五行 → 时运数'],
  ['14-7', 'kaoke', '考刻表', '阳男阴女/阴男阳女 × 和值条件 → 初刻/正刻'],
  ['14-8', 'gua-simple', '简化卦象表', '本命数 → 卦名'],
  ['14-9', 'gua-detail', '详细卦象表', '刻别 × 本命数 → 卦名'],
  ['14-10', 'innate', '先天命数表', '十二辟卦 × 刻别先天命数 → 基数/序数与本命条文号（性格/才能前程/财运/兄弟个数）'],
  ['14-11-1', 'liunian-start', '流年起始表', '年支三合组 × 性别 → 起始数'],
  ['14-11-2', 'liunian-sisheng', '流年四声表', '先天命数 × 天干 × 月 1–12 → 四声'],
  ['14-12', 'liunian-order', '流年顺序表', '流年地支 × 后天命数 → 流年标记'],
  ['14-13', 'marker', '标记表', '考刻 × 日命时运奇偶 × 四声 × 标记 → 流年字母'],
  ['14-14', 'liunian-verse', '流年条文表', '条文校正数 × 流年字母 × 岁数 → 基数、加数（流年条文号 = 基数 + 加数）'],
];

{
  const tables = [];
  let tableRows = 0;
  for (const [id, slug, title, description] of TABLE_DEFS) {
    const rows = parseCsv(readFileSync(path.join(CORPUS, `tables/${id}.csv`), 'utf8'));
    let columns;
    let dataRows;
    if (id === '14-9') {
      // 上游无表头，补语义列名
      columns = ['刻别', '本命数', '卦名'];
      dataRows = rows;
    } else {
      [columns, ...dataRows] = rows;
    }
    // 去除表尾全空列（如 14-11-2 表头拖行逗号）
    while (columns.length && columns[columns.length - 1].trim() === '') {
      columns = columns.slice(0, -1);
    }
    dataRows = dataRows.map((r) => {
      let out = r.slice(0, Math.max(columns.length, r.findLastIndex((c) => c.trim() !== '') + 1));
      return out.map((c) => c.trim());
    });
    for (const r of dataRows) {
      if (r.length > columns.length) throw new Error(`${id} 行宽超列名：${JSON.stringify(r)}`);
      while (r.length < columns.length) r.push('');
    }
    tables.push({ id, slug, title, description, columns: columns.map((c) => c.trim()), rows: dataRows });
    tableRows += dataRows.length;
  }
  writeJson('tables.json', { tables }, { compact: true });
  stats.tables = tables.length;
  stats.tableRows = tableRows;
  console.log(`取数表 ${tables.length} 张 · 数据行 ${tableRows}`);
}

// ---------------------------------------------------------------- 注解精选
{
  const tiepan = JSON.parse(readFileSync(path.join(CORPUS, 'annotated/tiepan.json'), 'utf8'));
  const { meta, categories, articles } = tiepan;
  if (!meta?.title || !Array.isArray(articles) || !articles.length) throw new Error('tiepan.json 结构异常');
  for (const a of articles) {
    for (const k of ['id', 'category', 'title', 'content', 'note']) {
      if (a[k] === undefined) throw new Error(`注解条目缺字段 ${k}：${a.id}`);
    }
  }
  writeJson('annotated.json', { meta, categories, articles });
  stats.annotated = articles.length;
  console.log(`注解精选 ${articles.length} 条 · 分类 ${categories.length}`);
}

// ---------------------------------------------------------------- 方法文献
{
  const dir = path.join(CORPUS, 'method');
  const docs = {};
  const manifest = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const md = readFileSync(path.join(dir, file), 'utf8');
    const slug = file.replace(/\.md$/, '');
    const title = (md.match(/^#\s+(.+)$/m) ?? [])[1]?.trim() ?? slug;
    // 摘要：首个非空正文段的首句
    const para = md.split(/\n{2,}/).map((s) => s.trim()).find((s) => s && !s.startsWith('#'));
    const summary = (para ?? '').replace(/\n/g, '').split(/(?<=[。！？])/)[0] ?? '';
    docs[slug] = md;
    manifest.push({ slug, title, summary });
  }
  if (!manifest.length) throw new Error('method/ 无文献');
  writeJson('method-docs.json', { manifest });
  writeJson('method-docs-bodies.json', { docs });
  writeChunk('method-docs', 'method-docs-bodies.json', '方法文献载荷（概述/考刻/取数表说明）');
  stats.methodDocs = manifest.length;
  console.log(`方法文献 ${manifest.length} 篇`);
}

// ---------------------------------------------------------------- 注册表
{
  const registry = {
    sources: [
      {
        id: 'nanphy',
        url: 'https://github.com/Nanphy/TiebanshenshuOS',
        commit: '785dc871d523',
        note: '条文库（DB/List.csv，12000 条）与十五张取数表底本（UTF-8 整理版）',
      },
      {
        id: 'xaminxan',
        url: 'https://github.com/xaminxan/tiebanshenshu',
        commit: 'e17f30cb65b7',
        note: '条文与取数表原始录入上游（GB18030）；十五表与 Nanphy 版逐字节同文',
      },
      {
        id: 'mingli-lab',
        url: 'https://github.com/wangdwn/mingli-lab',
        commit: 'cadb2f4fc34b',
        note: '注解精选 29 条（题注「邵雍著，陈明点校《铁板神数》」节录 + 今注）',
      },
    ],
  };
  writeJson('registry.json', registry);
  stats.textualIssues = textualIssues;
  writeJson('corpus-stats.json', stats);
  for (const issue of textualIssues) console.log('  [textual]', issue);
  console.log('注册表 + 统计锚点', JSON.stringify({ ...stats, textualIssues: textualIssues.length }));
}

console.log('gen ok: src/data/ src/chunks/');
