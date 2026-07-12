/**
 * 穴位子入口 —— `import { getAcupoints, getAcupoint, findAcupoints } from 'nhx-ts-lib/acupoints'`
 *
 * 索引（411 穴：名称/经络/定位/功效/穴性）同步内联；正文与引用载荷懒加载。
 */
import indexData from './data/acupoints-index.json';
import { foldIncludes } from './normalize';
import type { AcupointMeta, EntryBody } from './types';

export type { AcupointMeta, EntryBody, SourceRef } from './types';

const index = (indexData as unknown as { acupoints: AcupointMeta[] }).acupoints;
let bodies: Record<string, EntryBody> | undefined;

async function loadBodies(): Promise<Record<string, EntryBody>> {
  if (!bodies) {
    const mod = await import('./chunks/acupoints-bodies');
    bodies = (mod.payload as { bodies: Record<string, EntryBody> }).bodies;
  }
  return bodies;
}

/** 全部穴位索引（轻量，同步） */
export function getAcupoints(): AcupointMeta[] {
  return index;
}

/** 按 id（拼音 slug）或穴名取条目（含正文与引用；异步懒加载） */
export async function getAcupoint(idOrName: string): Promise<(AcupointMeta & EntryBody) | undefined> {
  const meta = index.find((a) => a.id === idOrName || a.name === idOrName)
    ?? index.find((a) => foldIncludes(a.name, idOrName) && a.name.length === idOrName.length);
  if (!meta) return undefined;
  const b = (await loadBodies())[meta.id];
  return { ...meta, md: b?.md ?? '', refs: b?.refs ?? [] };
}

/** 检索（穴名/经络/定位/功效/穴性，繁简折叠；同步） */
export function findAcupoints(query: string, opts?: { limit?: number }): AcupointMeta[] {
  const limit = opts?.limit ?? 30;
  const out: AcupointMeta[] = [];
  for (const a of index) {
    const hay = `${a.name} ${a.meridian ?? ''} ${a.location ?? ''} ${a.effect ?? ''} ${a.pointType ?? ''} ${a.code ?? ''} ${(a.aliases ?? []).join(' ')}`;
    if (foldIncludes(hay, query)) {
      out.push(a);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** 按经络列举（如「手少阴心经」） */
export function getAcupointsByMeridian(meridian: string): AcupointMeta[] {
  return index.filter((a) => a.meridian && foldIncludes(a.meridian, meridian));
}

/** 经络清单（携穴位数） */
export function getMeridians(): { meridian: string; count: number }[] {
  const m = new Map<string, number>();
  for (const a of index) {
    if (a.meridian) m.set(a.meridian, (m.get(a.meridian) ?? 0) + 1);
  }
  return [...m.entries()].map(([meridian, count]) => ({ meridian, count }));
}
