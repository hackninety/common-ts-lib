/**
 * 采集古图：docs/corpus/images/mapping.json → assets/images/<collection>/<id>.<ext>
 *                                            + docs/corpus/images/manifest.json（gen 的输入）
 *
 * 全部图像取自 Wikimedia Commons 公有领域扫描/矢量化文件；每张记录
 * 来源文件、许可、作者与描述页 URL。原始 SVG 直接下载；位图超过 2.5MB
 * 时取 1600px 缩略以控制包体。幂等：已落盘文件跳过（--force 重下）。
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const mappingFile = path.join(root, 'docs/corpus/images/mapping.json');
const manifestFile = path.join(root, 'docs/corpus/images/manifest.json');
const assetsDir = path.join(root, 'assets/images');
const FORCE = process.argv.includes('--force');

const UA = { 'User-Agent': 'shj-ts-lib corpus builder/0.1 (hackninety@gmail.com)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mapping = JSON.parse(readFileSync(mappingFile, 'utf8'));

// ---------- 1. 批量 imageinfo ----------
async function api(params) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.search = new URLSearchParams({ format: 'json', formatversion: '2', ...params }).toString();
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error(`API HTTP ${r.status}`);
  return r.json();
}

const info = {}; // normalizedTitle -> imageinfo
const wanted = mapping.images.map((m) => m.commons);
for (let i = 0; i < wanted.length; i += 40) {
  const batch = wanted.slice(i, i + 40);
  const d = await api({
    action: 'query', titles: batch.join('|'), prop: 'imageinfo', redirects: '1',
    iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600',
    iiextmetadatafilter: 'LicenseShortName|Artist|ImageDescription',
  });
  const renorm = new Map();
  for (const n of d.query.normalized ?? []) renorm.set(n.to, n.from);
  for (const rd of d.query.redirects ?? []) renorm.set(rd.to, renorm.get(rd.from) ?? rd.from);
  for (const p of d.query.pages ?? []) {
    const orig = renorm.get(p.title) ?? p.title;
    if (p.missing || !p.imageinfo?.[0]) continue;
    info[orig] = p.imageinfo[0];
    if (orig !== p.title) info[p.title] = p.imageinfo[0];
  }
  await sleep(300);
  process.stdout.write(`imageinfo ${Math.min(i + 40, wanted.length)}/${wanted.length}\r`);
}
console.log();

const clean = (v) => (v?.value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
const missing = [];
const images = [];
let downloaded = 0;
let skipped = 0;

for (const m of mapping.images) {
  const ii = info[m.commons] ?? info[m.commons.replaceAll('_', ' ')];
  if (!ii) {
    missing.push(`${m.id} → ${m.commons}`);
    continue;
  }
  const isSvg = ii.mime === 'image/svg+xml';
  const useThumb = !isSvg && ii.size > 2.5 * 1024 * 1024 && ii.thumburl;
  const srcUrl = useThumb ? ii.thumburl : ii.url;
  const ext = isSvg ? 'svg' : (srcUrl.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg');
  const rel = `${m.collection}/${m.id}.${ext}`;
  const file = path.join(assetsDir, rel);
  mkdirSync(path.dirname(file), { recursive: true });

  if (!existsSync(file) || FORCE) {
    let ok = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const r = await fetch(srcUrl, { headers: UA });
      if (r.ok) {
        writeFileSync(file, Buffer.from(await r.arrayBuffer()));
        ok = true;
        break;
      }
      if (r.status === 429 || r.status >= 500) {
        // Commons 限流：尊重 Retry-After，指数退避
        const ra = Number(r.headers.get('retry-after')) || 0;
        await sleep(Math.max(ra * 1000, 3000 * 2 ** attempt));
        continue;
      }
      missing.push(`${m.id} 下载失败 HTTP ${r.status} → ${srcUrl}`);
      break;
    }
    if (!ok) {
      if (!missing.some((s) => s.startsWith(m.id))) missing.push(`${m.id} 下载失败（多次 429）→ ${srcUrl}`);
      continue;
    }
    downloaded++;
    await sleep(1100); // 礼貌限速
  } else {
    skipped++;
  }

  const em = ii.extmetadata ?? {};
  images.push({
    id: m.id, entity: m.entity, collection: m.collection, file: rel, title: m.title,
    source: 'wikimedia-commons', commons: m.commons, sourceUrl: ii.descriptionurl,
    license: clean(em.LicenseShortName) || 'Public domain', artist: clean(em.Artist),
    width: useThumb ? ii.thumbwidth : ii.width, height: useThumb ? ii.thumbheight : ii.height,
    bytes: statSync(file).size,
  });
}

writeFileSync(manifestFile, JSON.stringify({ collections: mapping.collections, images }, null, 1) + '\n');
console.log(`done: 下载 ${downloaded}，复用 ${skipped}，登记 ${images.length}/${mapping.images.length}`);
if (missing.length) {
  console.error(`MISSING ${missing.length}:`);
  for (const s of missing) console.error('  ' + s);
  process.exitCode = 1;
}
