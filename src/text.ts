/** 经文分支：卷目同步、正文按卷分包懒加载、全文检索 */
import { fold } from './normalize';
import { getChapters, getChapterInfo } from './registry';
import type { ChapterInfo, TextEntry } from './types';

export { getChapters, getChapterInfo };

type ChunkModule = { payload: unknown };
const textChunks: Record<string, () => Promise<ChunkModule>> = {
  nanshan: () => import('./chunks/text-nanshan'),
  xishan: () => import('./chunks/text-xishan'),
  beishan: () => import('./chunks/text-beishan'),
  dongshan: () => import('./chunks/text-dongshan'),
  zhongshan: () => import('./chunks/text-zhongshan'),
  haiwainan: () => import('./chunks/text-haiwainan'),
  haiwaixi: () => import('./chunks/text-haiwaixi'),
  haiwaibei: () => import('./chunks/text-haiwaibei'),
  haiwaidong: () => import('./chunks/text-haiwaidong'),
  haineinan: () => import('./chunks/text-haineinan'),
  haineixi: () => import('./chunks/text-haineixi'),
  haineibei: () => import('./chunks/text-haineibei'),
  haineidong: () => import('./chunks/text-haineidong'),
  dahuangdong: () => import('./chunks/text-dahuangdong'),
  dahuangnan: () => import('./chunks/text-dahuangnan'),
  dahuangxi: () => import('./chunks/text-dahuangxi'),
  dahuangbei: () => import('./chunks/text-dahuangbei'),
  hainei: () => import('./chunks/text-hainei'),
};

const cache = new Map<string, TextEntry[]>();

/** 取整卷经文条目（首次加载该卷 chunk，之后走缓存） */
export async function getChapterEntries(chapterId: string): Promise<TextEntry[]> {
  const hit = cache.get(chapterId);
  if (hit) return hit;
  const loader = textChunks[chapterId];
  if (!loader) throw new Error(`未知卷别：${chapterId}`);
  const mod = await loader();
  const entries = (mod.payload as { entries: TextEntry[] }).entries;
  cache.set(chapterId, entries);
  return entries;
}

/** 取单条经文 */
export async function getEntry(chapterId: string, i: number): Promise<TextEntry | undefined> {
  const entries = await getChapterEntries(chapterId);
  return entries[i];
}

export interface TextHit {
  chapter: ChapterInfo;
  entry: TextEntry;
  /** 命中片段（简体，前后各扩 24 字） */
  snippet: string;
}

/**
 * 全文检索（繁简折叠）。默认全书十八卷；可用 chapters 限定范围。
 * 逐卷懒加载，已缓存的卷不再拉取。
 */
export async function searchText(
  query: string,
  opts: { chapters?: string[]; limit?: number } = {},
): Promise<TextHit[]> {
  const q = fold(query);
  if (!q) return [];
  const limit = opts.limit ?? 50;
  const scope = opts.chapters ?? getChapters().map((c) => c.id);
  const hits: TextHit[] = [];
  for (const id of scope) {
    const info = getChapterInfo(id);
    if (!info) continue;
    const entries = await getChapterEntries(id);
    for (const entry of entries) {
      const folded = fold(entry.s);
      const at = folded.indexOf(q);
      if (at < 0) continue;
      // 以简体原文近似定位片段（折叠去除句读，按比例映射）
      const ratio = at / Math.max(folded.length, 1);
      const chars = Array.from(entry.s);
      const center = Math.floor(ratio * chars.length);
      const from = Math.max(0, center - 24);
      const snippet =
        (from > 0 ? '…' : '') +
        chars.slice(from, Math.min(chars.length, center + Array.from(q).length + 24)).join('') +
        (center + 24 < chars.length ? '…' : '');
      hits.push({ chapter: info, entry, snippet });
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}
