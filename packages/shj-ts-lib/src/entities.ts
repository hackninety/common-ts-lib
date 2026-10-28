/** 实体百科分支：索引同步（地图/列表首屏），正文（原文出处/引文）分包懒加载 */
import entIndexRaw from './data/entities-index.json';
import { fold } from './normalize';
import type { Entity, EntityCategory, EntityIndexItem, EntityOccurrence } from './types';

const index = entIndexRaw as EntityIndexItem[];

/** 实体索引（轻量，含名称/类别/简介/地望与主图引用） */
export function getEntitiesIndex(): EntityIndexItem[] {
  return index;
}

/** 类别中文标签 */
export const CATEGORY_LABELS: Record<EntityCategory, string> = {
  beast: '异兽',
  bird: '奇鸟',
  fish: '鳞介',
  snake: '蛇虺',
  dragon: '龙属',
  deity: '神祇',
  human: '奇人',
  nation: '方国',
  plant: '神木',
  mineral: '灵石',
};

interface EntityBody {
  occurrences: EntityOccurrence[];
  images: string[];
  lore?: string;
}

let bodiesPromise: Promise<Record<string, EntityBody>> | null = null;
async function loadBodies(): Promise<Record<string, EntityBody>> {
  bodiesPromise ??= import('./chunks/entities-bodies').then(
    (m) => m.payload as Record<string, EntityBody>,
  );
  return bodiesPromise;
}

/** 取实体全量（索引 + 原文出处/引文/图像列表），无此 id 返回 undefined */
export async function getEntity(id: string): Promise<Entity | undefined> {
  const item = index.find((e) => e.id === id);
  if (!item) return undefined;
  const bodies = await loadBodies();
  const body = bodies[id];
  return { ...item, occurrences: body?.occurrences ?? [], images: body?.images ?? [], ...(body?.lore ? { lore: body.lore } : {}) };
}

/** 同步检索（繁简折叠）：名称/别名/拼音/类别标签/简介 */
export function findEntities(
  query: string,
  opts: { categories?: EntityCategory[]; chapter?: string; limit?: number } = {},
): EntityIndexItem[] {
  const q = fold(query);
  const limit = opts.limit ?? 50;
  const out: EntityIndexItem[] = [];
  for (const e of index) {
    if (opts.categories && !opts.categories.includes(e.category)) continue;
    if (opts.chapter && e.chapter !== opts.chapter) continue;
    if (q) {
      const hay = fold(
        `${e.name} ${e.nameTrad} ${e.pinyin} ${e.aliases.join(' ')} ${e.tags.join(' ')} ${e.brief}`,
      );
      if (!hay.includes(q)) continue;
    }
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

/** 按类别列实体 */
export function getEntitiesByCategory(category: EntityCategory): EntityIndexItem[] {
  return index.filter((e) => e.category === category);
}

/** 按卷列实体（主出处） */
export function getEntitiesByChapter(chapterId: string): EntityIndexItem[] {
  return index.filter((e) => e.chapter === chapterId);
}

/** 按地望列实体 */
export function getEntitiesByLocation(locationId: string): EntityIndexItem[] {
  return index.filter((e) => e.locationId === locationId);
}
