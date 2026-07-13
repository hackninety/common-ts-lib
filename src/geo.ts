/** 地理分支：实体/地望 → GeoJSON，直接喂给 Leaflet / MapLibre / ECharts geo */
import { getEntitiesIndex } from './entities';
import { getLocations } from './locations';
import type {
  EntityCategory, EntityFeatureProps, GeoFeature, GeoFeatureCollection,
  Location, LocationConfidence, LocationFeatureProps,
} from './types';

export interface EntityGeoOptions {
  /** 限定类别（默认全部） */
  categories?: EntityCategory[];
  /** 限定卷（主出处） */
  chapters?: string[];
  /** 限定地望置信度（如只要 identified+disputed 的“实境地图”） */
  confidence?: LocationConfidence[];
  /** 只要有图的实体 */
  withImageOnly?: boolean;
  /**
   * 同一地望多实体时在坐标上加微小偏移错开图标（度），
   * 0 关闭。默认 0.12。
   */
  spread?: number;
}

/**
 * 实体 → GeoJSON 要素集：每个「有地望的实体」一枚 Point。
 * 属性含名称/类别/简介/主图/置信度，点开卡片所需的正文另经
 * `getEntity(id)` 懒加载。
 */
export function entitiesToGeoJSON(
  opts: EntityGeoOptions = {},
): GeoFeatureCollection<EntityFeatureProps> {
  const spread = opts.spread ?? 0.12;
  const locById = new Map(getLocations().map((l) => [l.id, l]));
  const perLoc = new Map<string, number>();
  const features: GeoFeature<EntityFeatureProps>[] = [];

  for (const e of getEntitiesIndex()) {
    if (!e.locationId) continue;
    const loc = locById.get(e.locationId);
    if (!loc) continue;
    if (opts.categories && !opts.categories.includes(e.category)) continue;
    if (opts.chapters && (!e.chapter || !opts.chapters.includes(e.chapter))) continue;
    if (opts.confidence && !opts.confidence.includes(loc.confidence)) continue;
    if (opts.withImageOnly && !e.image) continue;

    const n = perLoc.get(loc.id) ?? 0;
    perLoc.set(loc.id, n + 1);
    // 同地多实体呈六角环排布，避免图标重叠
    const angle = (n * 137.5 * Math.PI) / 180;
    const r = n === 0 ? 0 : spread * (0.6 + 0.4 * Math.ceil(n / 6));
    const lng = loc.lng + r * Math.cos(angle);
    const lat = loc.lat + r * Math.sin(angle) * 0.7;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(lng.toFixed(4)), Number(lat.toFixed(4))] },
      properties: {
        entityId: e.id, name: e.name, nameTrad: e.nameTrad, pinyin: e.pinyin,
        category: e.category, tags: e.tags, brief: e.brief, chapter: e.chapter,
        locationId: loc.id, locationName: loc.nameSimp, confidence: loc.confidence,
        image: e.image,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

export interface LocationGeoOptions {
  chapters?: string[];
  confidence?: LocationConfidence[];
  /** 只要有实体入驻的地望 */
  withEntitiesOnly?: boolean;
}

/** 地望 → GeoJSON 要素集（山/川/国一点一名，适合底层图层） */
export function locationsToGeoJSON(
  opts: LocationGeoOptions = {},
): GeoFeatureCollection<LocationFeatureProps> {
  const features: GeoFeature<LocationFeatureProps>[] = [];
  for (const l of getLocations() as Location[]) {
    if (opts.chapters && !opts.chapters.includes(l.chapter)) continue;
    if (opts.confidence && !opts.confidence.includes(l.confidence)) continue;
    if (opts.withEntitiesOnly && l.entityIds.length === 0) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [l.lng, l.lat] },
      properties: {
        locationId: l.id, name: l.name, nameSimp: l.nameSimp, type: l.type,
        chapter: l.chapter, modern: l.modern, basis: l.basis,
        confidence: l.confidence, entityIds: l.entityIds,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}
