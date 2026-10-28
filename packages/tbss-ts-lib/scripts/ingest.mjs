/**
 * 语料引入：从锁定 commit 的上游仓库拉取原始数据 → docs/corpus/（规范底本）
 *
 *   条文库    Nanphy/TiebanshenshuOS DB/List.csv → verses/tiaowen.csv
 *             （12000 条：子集~亥集十二集 × 各 1000 条，号 1001–13000）
 *   取数表    Nanphy/TiebanshenshuOS DB/14-*.csv → tables/14-*.csv（十四考十五张）
 *   注解精选  wangdwn/mingli-lab data/tiepan.json → annotated/tiepan.json（29 条今注）
 *
 * 上游为社区数字化转录（xaminxan 原始录入，Nanphy 统一 UTF-8 并扩表；两库十五张表
 * 经逐字节比对内容一致，仅编码不同）。本脚本只做无损规范化：编码统一 UTF-8（BOM
 * 剥离）、换行 LF、结尾单换行；文字内容一字不改。method/*.md 为手写文献，不经此脚本。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CORPUS = path.join(root, 'docs/corpus');

/** 上游锁定（与 docs/sources.md、src/data/registry.json 保持一致） */
const PIN = {
  nanphy: { repo: 'Nanphy/TiebanshenshuOS', commit: '785dc871d523' },
  xaminxan: { repo: 'xaminxan/tiebanshenshu', commit: 'e17f30cb65b7' },
  mingli: { repo: 'wangdwn/mingli-lab', commit: 'cadb2f4fc34b' },
};

const TABLE_IDS = [
  '14-1', '14-2', '14-3', '14-4', '14-5', '14-6', '14-7',
  '14-8', '14-9', '14-10', '14-11-1', '14-11-2', '14-12', '14-13', '14-14',
];

function raw(pin, filePath) {
  return `https://raw.githubusercontent.com/${pin.repo}/${pin.commit}/${filePath}`;
}

/** 拉取并解码：UTF-8 严格优先，失败回退 gb18030（上游 xaminxan 部分文件为 GBK 系） */
async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('gb18030', { fatal: true }).decode(buf);
  }
}

/** 无损规范化：剥 BOM、CRLF→LF、结尾单换行 */
function normalize(text) {
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\n*$/, '\n');
}

async function main() {
  mkdirSync(path.join(CORPUS, 'verses'), { recursive: true });
  mkdirSync(path.join(CORPUS, 'tables'), { recursive: true });
  mkdirSync(path.join(CORPUS, 'annotated'), { recursive: true });

  // 条文库
  const verses = normalize(await fetchText(raw(PIN.nanphy, 'DB/List.csv')));
  const verseLines = verses.trimEnd().split('\n');
  if (verseLines.length !== 12001) throw new Error(`条文行数异常：${verseLines.length}（应 12001 含表头）`);
  writeFileSync(path.join(CORPUS, 'verses/tiaowen.csv'), verses);
  console.log(`verses/tiaowen.csv  ${verseLines.length - 1} 条`);

  // 取数表
  for (const id of TABLE_IDS) {
    const csv = normalize(await fetchText(raw(PIN.nanphy, `DB/${id}.csv`)));
    writeFileSync(path.join(CORPUS, `tables/${id}.csv`), csv);
    console.log(`tables/${id}.csv  ${csv.trimEnd().split('\n').length} 行`);
  }

  // 注解精选（重排为 2 空格缩进稳定 JSON）
  const tiepan = JSON.parse(await fetchText(raw(PIN.mingli, 'data/tiepan.json')));
  if (!Array.isArray(tiepan.articles) || tiepan.articles.length === 0) throw new Error('tiepan.json 结构异常');
  writeFileSync(path.join(CORPUS, 'annotated/tiepan.json'), JSON.stringify(tiepan, null, 2) + '\n');
  console.log(`annotated/tiepan.json  ${tiepan.articles.length} 条`);

  console.log('ingest ok: docs/corpus/');
}

main().catch((e) => { console.error(e); process.exit(1); });
