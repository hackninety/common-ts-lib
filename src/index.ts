/**
 * shj-ts-lib —— 《山海经》语料库（十八卷经文/实体百科/山川地望/历代古图）
 *
 * 根入口只含轻量注册表与检索工具；重载荷走各子入口懒加载：
 *   shj-ts-lib/text       十八卷经文（839 条，繁简对照，卷目同步 + 按卷分包）
 *   shj-ts-lib/entities   实体百科（异兽/神祇/方国…，索引同步 + 正文分包）
 *   shj-ts-lib/locations  山川地望（坐标 + 今地考据 + 置信度，同步）
 *   shj-ts-lib/images     历代古图元数据（文件在包内 assets/images，同步）
 *   shj-ts-lib/geo        实体/地望 → GeoJSON（地图直接可用）
 */
export type {
  Book, ChapterInfo, TextEntry,
  EntityCategory, EntityIndexItem, EntityOccurrence, Entity,
  LocationType, LocationConfidence, Location,
  ImageCollection, ImageMeta, CorpusStats,
  GeoPoint, GeoFeature, GeoFeatureCollection, EntityFeatureProps, LocationFeatureProps,
} from './types';

export {
  getChapters, getChapterInfo, getChapterGroups, getCorpusStats,
  CONFIDENCE_LABELS, DISCLAIMER,
} from './registry';

export { fold, foldIncludes } from './normalize';

// 常用同步面：实体索引/检索 + 地望（地图首屏无需任何异步加载）
export { getEntitiesIndex, findEntities, CATEGORY_LABELS } from './entities';
export { getLocations, getLocation, findLocations } from './locations';
