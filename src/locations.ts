/** 山川地望分支（全部同步、轻量） */
import locationsRaw from './data/locations.json';
import { fold } from './normalize';
import type { Location, LocationConfidence, LocationType } from './types';

const locations = locationsRaw as Location[];

/** 全部地望（含坐标/置信度/考据依据/所居实体） */
export function getLocations(): Location[] {
  return locations;
}

export function getLocation(id: string): Location | undefined {
  return locations.find((l) => l.id === id);
}

/** 检索地望（繁简折叠）：名称/今地/依据 */
export function findLocations(
  query: string,
  opts: { types?: LocationType[]; confidence?: LocationConfidence[]; limit?: number } = {},
): Location[] {
  const q = fold(query);
  const limit = opts.limit ?? 50;
  const out: Location[] = [];
  for (const l of locations) {
    if (opts.types && !opts.types.includes(l.type)) continue;
    if (opts.confidence && !opts.confidence.includes(l.confidence)) continue;
    if (q && !fold(`${l.name} ${l.nameSimp} ${l.modern} ${l.basis}`).includes(q)) continue;
    out.push(l);
    if (out.length >= limit) break;
  }
  return out;
}

/** 按卷列地望 */
export function getLocationsByChapter(chapterId: string): Location[] {
  return locations.filter((l) => l.chapter === chapterId);
}
