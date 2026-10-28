/**
 * 中药子入口 —— `import { getHerbs, getHerb, findHerbs } from 'nhx-ts-lib/herbs'`
 *
 * 索引（415 味：名称/性味/归经/功效/主治/分类）同步内联；正文与人纪原文引用
 * 载荷（herbs-bodies）懒加载。bencaoDoc 互链《神农本草经》讲稿文档。
 */
import indexData from './data/herbs-index.json';
import { foldIncludes } from './normalize';
import type { EntryBody, HerbMeta } from './types';

export type { HerbMeta, EntryBody, SourceRef } from './types';

const index = (indexData as unknown as { herbs: HerbMeta[] }).herbs;
let bodies: Record<string, EntryBody> | undefined;

async function loadBodies(): Promise<Record<string, EntryBody>> {
  if (!bodies) {
    const mod = await import('./chunks/herbs-bodies');
    bodies = (mod.payload as { bodies: Record<string, EntryBody> }).bodies;
  }
  return bodies;
}

/** 全部中药索引（轻量，同步） */
export function getHerbs(): HerbMeta[] {
  return index;
}

/** 按 id（拼音 slug）或药名取条目（含正文与引用；异步懒加载） */
export async function getHerb(idOrName: string): Promise<(HerbMeta & EntryBody) | undefined> {
  const meta = index.find((h) => h.id === idOrName || h.name === idOrName)
    ?? index.find((h) => foldIncludes(h.name, idOrName) && h.name.length === idOrName.length);
  if (!meta) return undefined;
  const b = (await loadBodies())[meta.id];
  return { ...meta, md: b?.md ?? '', refs: b?.refs ?? [] };
}

/** 检索（名称/功效/主治/分类/性味/归经，繁简折叠；同步） */
export function findHerbs(query: string, opts?: { limit?: number }): HerbMeta[] {
  const limit = opts?.limit ?? 30;
  const out: HerbMeta[] = [];
  for (const h of index) {
    const hay = `${h.name} ${h.category ?? ''} ${h.gongxiao ?? ''} ${h.zhuzhi ?? ''} ${h.xingwei ?? ''} ${h.guijing ?? ''} ${h.source ?? ''}`;
    if (foldIncludes(hay, query)) {
      out.push(h);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** 按分类列举（如「止血药」「化痰止咳平喘药」） */
export function getHerbsByCategory(category: string): HerbMeta[] {
  return index.filter((h) => h.category === category);
}
