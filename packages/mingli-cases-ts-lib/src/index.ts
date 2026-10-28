import { data } from './generated/index.js';
import { caseLoaders, answerLoaders, chartLoaders } from './generated/loaders.js';
import type { CaseAnswers, CaseFilter, CaseIndex, CaseStudy, CollectionMeta, CorpusStats, ReferenceCharts, SourceMeta } from './types.js';

export * from './types.js';
export { buildCasePrompt } from './prompt.js';

const registry = data as {
  sources: SourceMeta[];
  collections: CollectionMeta[];
  index: CaseIndex[];
  search: Record<string, string>;
  stats: CorpusStats;
};

export function getSources(): SourceMeta[] { return structuredClone(registry.sources); }
export function getCollections(): CollectionMeta[] { return structuredClone(registry.collections); }
export function getStats(): CorpusStats { return structuredClone(registry.stats); }
export function getMethods() {
  return [
    { id: 'bazi', label: '八字' }, { id: 'ziwei', label: '紫微斗数' },
    { id: 'qimen', label: '奇门遁甲' }, { id: 'unknown', label: '原术数未注明' },
  ] as const;
}
export function getTopics() {
  return [
    { id: 'relationship', label: '感情' }, { id: 'wealth', label: '财富' },
    { id: 'family', label: '六亲' }, { id: 'career', label: '事业' },
    { id: 'health', label: '健康' }, { id: 'education', label: '学业' },
    { id: 'timing', label: '生辰辨析' }, { id: 'unknown', label: '主题未分类' },
  ] as const;
}

export function getCaseIndex(filter: CaseFilter = {}): CaseIndex[] {
  const terms = filter.query?.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean) ?? [];
  return structuredClone(registry.index.filter((item) =>
    (!filter.sourceId || item.sourceId === filter.sourceId)
    && (!filter.collectionId || item.collectionId === filter.collectionId)
    && (filter.year === undefined || item.year === filter.year)
    && (!filter.method || item.method === filter.method)
    && (!filter.topic || item.topics.includes(filter.topic))
    && terms.every((term) => registry.search[item.id].includes(term)),
  ));
}

const caseCache = new Map<string, Promise<CaseStudy[]>>();
const answerCache = new Map<string, Promise<CaseAnswers[]>>();
const chartCache = new Map<string, Promise<ReferenceCharts[]>>();

async function loadCollection<T>(
  id: string,
  loaders: Record<string, () => Promise<{ data: unknown }>>,
  cache: Map<string, Promise<T[]>>,
): Promise<T[] | undefined> {
  const item = registry.index.find((entry) => entry.id === id);
  if (!item) return undefined;
  const key = `${item.sourceId}/${item.collectionId}`;
  const loader = loaders[key];
  if (!loader) return undefined;
  let pending = cache.get(key);
  if (!pending) {
    pending = loader().then((module) => module.data as T[]).catch((error) => { cache.delete(key); throw error; });
    cache.set(key, pending);
  }
  return pending;
}

export async function loadCase(id: string): Promise<CaseStudy | undefined> {
  return structuredClone((await loadCollection(id, caseLoaders, caseCache))?.find((item) => item.meta.id === id));
}

/** Explicit opt-in: neither the index nor loadCase loads answer-bearing chunks. */
export async function loadCaseAnswers(id: string): Promise<CaseAnswers | undefined> {
  return structuredClone((await loadCollection(id, answerLoaders, answerCache))?.find((item) => item.caseId === id));
}

export async function loadReferenceCharts(id: string): Promise<ReferenceCharts | undefined> {
  return structuredClone((await loadCollection(id, chartLoaders, chartCache))?.find((item) => item.caseId === id));
}
