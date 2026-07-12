/**
 * 天纪 64 卦详解子入口 —— `import { getGua64, findGua } from 'nhx-ts-lib/gua'`
 *
 * 倪师《天纪》人间道 64 卦逐卦详文（wh149728915-stack/nihaixia-64gua 整理）。
 * 整包懒加载（约 0.5MB）。
 */
import { foldIncludes } from './normalize';
import type { GuaEntry } from './types';

export type { GuaEntry } from './types';

let cache: GuaEntry[] | undefined;

/** 全部 64 卦详解（异步懒加载） */
export async function getGua64(): Promise<GuaEntry[]> {
  if (!cache) {
    const mod = await import('./chunks/gua64');
    cache = (mod.payload as { gua: GuaEntry[] }).gua;
  }
  return cache;
}

/** 按卦序（1–64）/卦名（含繁简折叠、可省「为/之」）/卦象字符取卦 */
export async function findGua(query: number | string): Promise<GuaEntry | undefined> {
  const gua = await getGua64();
  if (typeof query === 'number') return gua.find((g) => g.no === query);
  const q = String(query).trim();
  return gua.find((g) => g.symbol && g.symbol === q)
    ?? gua.find((g) => g.name === q)
    ?? gua.find((g) => foldIncludes(g.name, q));
}

/** 卦名全文检索（命中详文也算；异步） */
export async function searchGua(query: string, opts?: { limit?: number }): Promise<GuaEntry[]> {
  const limit = opts?.limit ?? 10;
  const gua = await getGua64();
  const out: GuaEntry[] = [];
  for (const g of gua) {
    if (foldIncludes(g.name, query) || foldIncludes(g.md, query)) {
      out.push(g);
      if (out.length >= limit) break;
    }
  }
  return out;
}
