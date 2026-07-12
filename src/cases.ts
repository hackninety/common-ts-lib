/**
 * 医案子入口 —— `import { getCaseGroups, getCaseIndex, getCaseMarkdown } from 'nhx-ts-lib/cases'`
 *
 * 959 篇医案：索引（分组/标题/日期/来诊提要）同步内联；正文按分组分包懒加载。
 * 分组保真度不同 —— 诊疗日志为倪师亲笔（first-party），神州医料库编档为第三方
 * 整理（third-party），录音坐诊为逐字稿（transcript）。
 */
import indexData from './data/cases-index.json';
import { foldIncludes } from './normalize';
import type { CaseGroup, CaseMeta } from './types';

export type { CaseGroup, CaseMeta } from './types';

const data = indexData as unknown as { groups: CaseGroup[]; cases: CaseMeta[] };

/** 分组载荷加载器（与 gen-data CASE_GROUPS 对应） */
const LOADERS: Record<string, () => Promise<{ payload: unknown }>> = {
  riji2005: () => import('./chunks/cases-riji2005'),
  riji2006: () => import('./chunks/cases-riji2006'),
  riji2007: () => import('./chunks/cases-riji2007'),
  riji2008: () => import('./chunks/cases-riji2008'),
  zhenliao2005: () => import('./chunks/cases-zhenliao2005'),
  zhenliao2006: () => import('./chunks/cases-zhenliao2006'),
  bianhao: () => import('./chunks/cases-bianhao'),
  shenzhou358: () => import('./chunks/cases-shenzhou358'),
  jilu: () => import('./chunks/cases-jilu'),
  renjiban: () => import('./chunks/cases-renjiban'),
  luyin: () => import('./chunks/cases-luyin'),
};

const cache = new Map<string, Record<string, string>>();

async function loadGroup(group: string): Promise<Record<string, string> | undefined> {
  let chunk = cache.get(group);
  if (!chunk) {
    const loader = LOADERS[group];
    if (!loader) return undefined;
    chunk = ((await loader()).payload as { cases: Record<string, string> }).cases;
    cache.set(group, chunk);
  }
  return chunk;
}

/** 医案分组（携保真度与篇数） */
export function getCaseGroups(): CaseGroup[] {
  return data.groups;
}

/** 医案索引（可按分组过滤；轻量，同步） */
export function getCaseIndex(group?: string): CaseMeta[] {
  return group ? data.cases.filter((c) => c.group === group) : data.cases;
}

/** 取某篇医案 markdown（id 形如 `riji2005/001`；异步按分组分包加载） */
export async function getCaseMarkdown(id: string): Promise<string | undefined> {
  const chunk = await loadGroup(id.split('/')[0]);
  return chunk?.[id];
}

/** 索引级检索（标题/提要/日期，繁简折叠；同步，不触发载荷加载） */
export function findCases(query: string, opts?: { group?: string; limit?: number }): CaseMeta[] {
  const limit = opts?.limit ?? 50;
  const out: CaseMeta[] = [];
  for (const c of data.cases) {
    if (opts?.group && c.group !== opts.group) continue;
    if (foldIncludes(`${c.title} ${c.summary ?? ''} ${c.date ?? ''}`, query)) {
      out.push(c);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** 全文检索（异步：按分组渐进加载正文） */
export async function searchCasesFull(
  query: string,
  opts?: { groups?: string[]; limit?: number; snippetLen?: number },
): Promise<{ meta: CaseMeta; snippet: string }[]> {
  const limit = opts?.limit ?? 30;
  const snippetLen = opts?.snippetLen ?? 120;
  const groups = opts?.groups ?? data.groups.map((g) => g.id);
  const out: { meta: CaseMeta; snippet: string }[] = [];
  for (const g of groups) {
    const chunk = await loadGroup(g);
    if (!chunk) continue;
    for (const c of data.cases) {
      if (c.group !== g) continue;
      const md = chunk[c.id];
      if (!md) continue;
      const idx = md.indexOf(query);
      const hit = idx >= 0 ? idx : (foldIncludes(md, query) ? 0 : -1);
      if (hit >= 0) {
        const start = Math.max(0, hit - Math.floor(snippetLen / 3));
        out.push({ meta: c, snippet: md.slice(start, start + snippetLen).replace(/\s+/g, ' ') });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}
