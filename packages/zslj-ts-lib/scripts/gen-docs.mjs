// 生成 src/data/docs.json：把 docs/ 下可读的典籍 markdown 打包为可 import 的数据。
//   - 图片相对路径 → GitHub raw 绝对地址（消费方无需配置静态资源）
//   - 站内 .md 链接 → docs 根相对路径（消费方按 manifest.path 匹配切换）
// 仅收录 book（原文合订本）与 algorithm（算法说明/存疑清单）两组；plan/research 为项目内部文档，不入典籍导出。
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DOCS = path.join(ROOT, 'docs');
const RAW_BASE = 'https://raw.githubusercontent.com/hackninety/zslj-ts-lib/main/docs/';
const INCLUDE_GROUPS = new Set(['book', 'algorithm']);

const normalize = (p) => {
  const out = [];
  for (const seg of p.split('/')) {
    if (seg === '..') out.pop();
    else if (seg !== '.' && seg !== '') out.push(seg);
  }
  return out.join('/');
};

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (['raw', 'img', 'json'].includes(name)) continue;
      out.push(...walk(full));
    } else if (name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

const manifest = [];
const docs = {};
for (const full of walk(DOCS)) {
  const rel = path.relative(DOCS, full).replaceAll('\\', '/');
  const group = rel.split('/')[0];
  if (!INCLUDE_GROUPS.has(group)) continue;
  const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/') + 1) : '';
  let text = readFileSync(full, 'utf8');

  // 图片相对路径 → 绝对 raw URL
  text = text.replace(/!\[([^\]]*)\]\((?!https?:|data:)([^)]+)\)/g,
    (_, alt, url) => `![${alt}](${RAW_BASE}${normalize(dir + url)})`);
  // 站内 .md 链接 → docs 根相对路径
  text = text.replace(/\[([^\]]*)\]\((?!https?:|#)([^)]+\.md)\)/g,
    (_, t, url) => `[${t}](${normalize(dir + url)})`);

  const title = (text.match(/^#\s+(.+)$/m) || [])[1]?.trim() || rel;
  manifest.push({ path: rel, title, group });
  docs[rel] = text;
}
manifest.sort((a, b) => a.path.localeCompare(b.path));

writeFileSync(
  path.join(ROOT, 'src/data/docs.json'),
  JSON.stringify({ imageBase: RAW_BASE, manifest, docs }, null, 2),
  'utf8',
);
console.log(`docs.json: ${manifest.length} 篇（${manifest.map((m) => m.path).join(', ')}）`);
