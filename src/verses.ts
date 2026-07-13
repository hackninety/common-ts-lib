/**
 * 条文库子入口 —— `import { getVerse, searchVerses } from 'tbss-ts-lib/verses'`
 *
 * 卷册清单（十二集）轻量同步；条文载荷按集分十二包，异步按条文号路由并缓存 ——
 * 宿主查某条/某集才拉取该集 chunk（每包约 60–90KB）。年龄倒排另为一包。
 * 接口形态与姊妹库（nhx/lrdq/zslj-ts-lib）的懒加载典籍库同形。
 */
import volumesData from './data/volumes.json';
import { foldIncludes } from './normalize';
import type { Verse, VolumeInfo } from './types';

export type { Verse, VolumeInfo } from './types';

const volumes = (volumesData as unknown as { volumes: VolumeInfo[] }).volumes;

/** 各集载荷加载器（与 gen-data BRANCHES 对应） */
const LOADERS: Record<string, () => Promise<{ payload: unknown }>> = {
  zi: () => import('./chunks/verses-zi'),
  chou: () => import('./chunks/verses-chou'),
  yin: () => import('./chunks/verses-yin'),
  mao: () => import('./chunks/verses-mao'),
  chen: () => import('./chunks/verses-chen'),
  si: () => import('./chunks/verses-si'),
  wu: () => import('./chunks/verses-wu'),
  wei: () => import('./chunks/verses-wei'),
  shen: () => import('./chunks/verses-shen'),
  you: () => import('./chunks/verses-you'),
  xu: () => import('./chunks/verses-xu'),
  hai: () => import('./chunks/verses-hai'),
};

/** 紧凑元组载荷：[条文号, 断语, ...年龄] */
type VerseTuple = [number, string, ...number[]];

const cache = new Map<string, Verse[]>();

/** 十二集卷册清单（轻量，同步） */
export function getVolumes(): VolumeInfo[] {
  return volumes;
}

/** 条文号所属集（1001–13000 之外返回 undefined） */
export function volumeOf(n: number): VolumeInfo | undefined {
  return volumes.find((v) => n >= v.start && n <= v.end);
}

async function loadVolume(v: VolumeInfo): Promise<Verse[]> {
  let list = cache.get(v.slug);
  if (!list) {
    const raw = ((await LOADERS[v.slug]()).payload as { verses: VerseTuple[] }).verses;
    list = raw.map(([n, text, ...ages]) => ({ n, volume: v.name, ages, text }));
    cache.set(v.slug, list);
  }
  return list;
}

/** 取某集全部 1000 条（异步：首次拉取该集载荷并缓存） */
export async function getVolumeVerses(slug: string): Promise<Verse[]> {
  const v = volumes.find((x) => x.slug === slug || x.name === slug || x.branch === slug);
  return v ? loadVolume(v) : [];
}

/** 按条文号取单条（异步：按号段路由到所在集） */
export async function getVerse(n: number): Promise<Verse | undefined> {
  const v = volumeOf(n);
  if (!v) return undefined;
  const list = await loadVolume(v);
  return list[n - v.start];
}

/** 批量取条文（排盘流年列表渲染用；未命中位置为 undefined） */
export async function getVerses(ns: number[]): Promise<(Verse | undefined)[]> {
  return Promise.all(ns.map((n) => getVerse(n)));
}

/** 全库条文（一次拉全 12 包，约 0.8MB；检索密集型宿主可预热） */
export async function loadAllVerses(): Promise<Verse[]> {
  const all = await Promise.all(volumes.map((v) => loadVolume(v)));
  return all.flat();
}

/**
 * 断语全文检索（异步：按需逐集加载；繁简折叠）。
 * `volumes` 为集 slug 白名单；命中即止，默认 50 条。
 */
export async function searchVerses(
  query: string,
  opts?: { volumes?: string[]; limit?: number },
): Promise<Verse[]> {
  if (!query.trim()) return [];
  const limit = opts?.limit ?? 50;
  const slugs = opts?.volumes ?? volumes.map((v) => v.slug);
  const out: Verse[] = [];
  for (const slug of slugs) {
    const v = volumes.find((x) => x.slug === slug);
    if (!v) continue;
    for (const verse of await loadVolume(v)) {
      if (foldIncludes(verse.text, query)) {
        out.push(verse);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

let agesIndex: Record<string, number[]> | undefined;

/** 某岁数下有年龄注记的全部条文号（异步：倒排索引单独一包） */
export async function getVerseNumbersByAge(age: number): Promise<number[]> {
  if (!agesIndex) {
    agesIndex = ((await import('./chunks/ages-index')).payload as { ages: Record<string, number[]> }).ages;
  }
  return agesIndex[String(age)] ?? [];
}

/** 某岁数的全部条文（流年视图用） */
export async function getVersesByAge(age: number): Promise<Verse[]> {
  const ns = await getVerseNumbersByAge(age);
  const vs = await getVerses(ns);
  return vs.filter((x): x is Verse => x !== undefined);
}
