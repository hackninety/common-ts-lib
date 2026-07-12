/**
 * 讲稿库子入口 —— `import { getDocsManifest, getDocMarkdown } from 'nhx-ts-lib/docs'`
 *
 * manifest 轻量同步（全库 900+ 篇目：书/组/保真度/日期）；各书 markdown 载荷按
 * slug 分包，`getDocMarkdown` 异步按 path 前缀路由并缓存 —— 宿主打开某书才拉取
 * 该书 chunk。接口与 lrdq-ts-lib/zslj-ts-lib 的典籍库同形（getDocMarkdown 异步）。
 */
import manifestData from './data/docs-manifest.json';
import { foldIncludes } from './normalize';
import type { DocMeta } from './types';

export type { DocMeta } from './types';

const manifest = (manifestData as unknown as { manifest: DocMeta[] }).manifest;

/** 各书载荷加载器（新书登记于此，与 gen-data BOOKS 对应） */
const LOADERS: Record<string, () => Promise<{ payload: unknown }>> = {
  zhenjiu: () => import('./chunks/docs-zhenjiu'),
  neijing: () => import('./chunks/docs-neijing'),
  bencao: () => import('./chunks/docs-bencao'),
  shanghan: () => import('./chunks/docs-shanghan'),
  jingui: () => import('./chunks/docs-jingui'),
  bimen: () => import('./chunks/docs-bimen'),
  fulu: () => import('./chunks/docs-fulu'),
  tianji: () => import('./chunks/docs-tianji'),
  zimu: () => import('./chunks/docs-zimu'),
  diji: () => import('./chunks/docs-diji'),
  jiangzuo: () => import('./chunks/docs-jiangzuo'),
  zhuanti: () => import('./chunks/docs-zhuanti'),
  fangjie: () => import('./chunks/docs-fangjie'),
  xiangxue: () => import('./chunks/docs-xiangxue'),
};

const cache = new Map<string, Record<string, string>>();

/** 全库篇目（轻量，同步） */
export function getDocsManifest(): DocMeta[] {
  return manifest;
}

/** 某书篇目 */
export function getBookManifest(slug: string): DocMeta[] {
  return manifest.filter((m) => m.path.startsWith(slug + '/'));
}

/** 取某篇文档 markdown（异步：按 path 的书 slug 路由，首次拉取该书载荷并缓存） */
export async function getDocMarkdown(path: string): Promise<string | undefined> {
  const slug = path.split('/')[0];
  let docs = cache.get(slug);
  if (!docs) {
    const loader = LOADERS[slug];
    if (!loader) return undefined;
    docs = ((await loader()).payload as { docs: Record<string, string> }).docs;
    cache.set(slug, docs);
  }
  return docs[path];
}

/** 篇目检索（标题/书名/分组，繁简折叠；同步，不触发载荷加载） */
export function searchDocs(query: string, opts?: { series?: string; book?: string; limit?: number }): DocMeta[] {
  const limit = opts?.limit ?? 50;
  const out: DocMeta[] = [];
  for (const m of manifest) {
    if (opts?.series && m.series !== opts.series) continue;
    if (opts?.book && m.book !== opts.book) continue;
    if (foldIncludes(`${m.title} ${m.book}`, query)) {
      out.push(m);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** 全文检索（异步：按需逐书加载载荷；books 为 slug 白名单） */
export async function searchDocsFull(
  query: string,
  opts?: { books?: string[]; limit?: number; snippetLen?: number },
): Promise<{ meta: DocMeta; snippet: string }[]> {
  const limit = opts?.limit ?? 30;
  const snippetLen = opts?.snippetLen ?? 120;
  const books = opts?.books ?? Object.keys(LOADERS);
  const out: { meta: DocMeta; snippet: string }[] = [];
  for (const slug of books) {
    if (!(slug in LOADERS)) continue;
    for (const m of manifest) {
      if (!m.path.startsWith(slug + '/')) continue;
      const md = await getDocMarkdown(m.path);
      if (!md) continue;
      const idx = md.indexOf(query);
      const hit = idx >= 0 ? idx : (foldIncludes(md, query) ? 0 : -1);
      if (hit >= 0) {
        const start = Math.max(0, hit - Math.floor(snippetLen / 3));
        out.push({ meta: m, snippet: md.slice(start, start + snippetLen).replace(/\s+/g, ' ') });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}
