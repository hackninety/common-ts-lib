/** 水系分支：生成管线自经文「X水出焉，……注于Y」自动解析（同步、轻量） */
import riversRaw from './data/rivers.json';
import { fold } from './normalize';
import type { River } from './types';

const rivers = riversRaw as River[];

/** 全部水系记录（按卷序） */
export function getRivers(): River[] {
  return rivers;
}

/** 某卷的水系 */
export function getRiversByChapter(chapterId: string): River[] {
  return rivers.filter((r) => r.chapter === chapterId);
}

/** 某地望（源头山）流出的水 */
export function getRiversByLocation(locationId: string): River[] {
  return rivers.filter((r) => r.locationId === locationId);
}

/** 检索水系（繁简折叠）：河名/源山/注入 */
export function findRivers(query: string, opts: { limit?: number } = {}): River[] {
  const q = fold(query);
  if (!q) return [];
  const limit = opts.limit ?? 50;
  const out: River[] = [];
  for (const r of rivers) {
    if (fold(`${r.name} ${r.mountain} ${r.dest}`).includes(q)) {
      out.push(r);
      if (out.length >= limit) break;
    }
  }
  return out;
}
