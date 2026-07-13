/** 《山海经》语料库类型定义 */

/** 两大部：五臧山经 / 海经（海外·海内·大荒·海内经） */
export type Book = 'shan' | 'hai';

/** 卷信息（十八卷） */
export interface ChapterInfo {
  /** 卷 slug，如 `xishan` */
  id: string;
  /** 卷序 1–18 */
  n: number;
  /** 卷名（繁） */
  title: string;
  /** 卷名（简） */
  titleSimp: string;
  book: Book;
  /** 侧栏分组：五臧山经/海外经/海内经/大荒经 */
  group: string;
  entryCount: number;
  charCount: number;
}

/** 经文条目（一条 ≈ 一山/一国/一神的记事） */
export interface TextEntry {
  /** 条目序号（卷内，0 起） */
  i: number;
  /** 条目主名（启发式抽取，繁体） */
  head: string;
  headSimp: string;
  /** 原文（繁体，ctext 底本） */
  t: string;
  /** 原文（简体，OpenCC 转换） */
  s: string;
}

export type EntityCategory =
  | 'beast' | 'bird' | 'fish' | 'snake' | 'dragon'
  | 'deity' | 'human' | 'nation' | 'plant' | 'mineral';

/** 实体索引项（轻量，适合地图首屏与列表） */
export interface EntityIndexItem {
  id: string;
  /** 简体名 */
  name: string;
  nameTrad: string;
  pinyin: string;
  aliases: string[];
  category: EntityCategory;
  tags: string[];
  /** 白话简介 */
  brief: string;
  /** 主出处卷 slug */
  chapter: string | null;
  /** 所居地望 id（可在 locations 中取坐标） */
  locationId: string | null;
  /** 主图 id（可在 images 中取文件与出处） */
  image: string | null;
  imageCount: number;
}

/** 原文出处（引文由生成管线在底本中逐字校验锚定） */
export interface EntityOccurrence {
  /** 卷 slug */
  chapter: string;
  /** 卷内条目序号 */
  entry: number;
  /** 条目主名（简） */
  head: string;
  /** 引文（简体） */
  quote: string;
  /** 引文（繁体，含底本原句读） */
  quoteTrad: string;
  primary?: boolean;
}

/** 实体全量（索引 + 正文载荷） */
export interface Entity extends EntityIndexItem {
  occurrences: EntityOccurrence[];
  images: string[];
  /** 后世流变/版本按语 */
  lore?: string;
}

export type LocationType = 'mountain' | 'river' | 'sea' | 'region';

/**
 * 地望置信度：
 * - identified 有较公认的今地考据
 * - disputed   有今地诸说，取常见一说
 * - legendary  神话地名，坐标为经文方位示意
 */
export type LocationConfidence = 'identified' | 'disputed' | 'legendary';

/** 山川地望（供地图标点） */
export interface Location {
  id: string;
  /** 名（繁） */
  name: string;
  nameSimp: string;
  type: LocationType;
  chapter: string;
  /** 今地说明 */
  modern: string;
  /** 考据依据 */
  basis: string;
  lat: number;
  lng: number;
  confidence: LocationConfidence;
  /** 居于此地的实体 id 列表（生成时反向汇总） */
  entityIds: string[];
}

/** 画集（版本）登记 */
export interface ImageCollection {
  title: string;
  titleSimp: string;
  era: string;
  artist: string;
  country: string;
}

/** 图像元数据（文件在包内 assets/images/<file>） */
export interface ImageMeta {
  id: string;
  entity: string;
  /** 画集 key，见 getCollections() */
  collection: string;
  /** assets/images 下的相对路径 */
  file: string;
  title: string;
  source: string;
  /** Commons 文件名 */
  commons: string;
  /** 来源描述页 URL */
  sourceUrl: string;
  license: string;
  artist: string;
  width: number;
  height: number;
  bytes: number;
}

/** 水系记录（生成管线自经文自动解析，锚定条目可溯源） */
export interface River {
  /** 河名（简体，如「漳水」「丽𪊨之水」） */
  name: string;
  /** 出处卷 slug */
  chapter: string;
  /** 卷内条目序号 */
  entry: number;
  /** 源头山（条目主名，简体） */
  mountain: string;
  /** 源头山对应地望 id（可取坐标；未收录的山为 null） */
  locationId: string | null;
  /** 出于「其阳/其阴/其上」等方位（「出焉」为空） */
  source: string;
  /** 流向（东/南/西南…，经文未言则空） */
  dir: string;
  /** 注入水体（如「河」「渭」「具区」；「（潜行地下）」表潜流） */
  dest: string;
}

export interface CorpusStats {
  chapters: number;
  entries: number;
  chars: number;
  entities: number;
  locations: number;
  images: number;
  rivers: number;
  foldPairs: number;
}

/** GeoJSON（最小子集，避免引入外部类型依赖） */
export interface GeoPoint {
  type: 'Point';
  /** [lng, lat] */
  coordinates: [number, number];
}
export interface GeoFeature<P> {
  type: 'Feature';
  geometry: GeoPoint;
  properties: P;
}
export interface GeoFeatureCollection<P> {
  type: 'FeatureCollection';
  features: GeoFeature<P>[];
}

/** 实体地图要素属性（每个实体一枚图标） */
export interface EntityFeatureProps {
  entityId: string;
  name: string;
  nameTrad: string;
  pinyin: string;
  category: EntityCategory;
  tags: string[];
  brief: string;
  chapter: string | null;
  locationId: string;
  locationName: string;
  /** 该地望置信度（legendary 建议前端弱化/虚线样式） */
  confidence: LocationConfidence;
  /** 主图 id（null 为无图实体） */
  image: string | null;
}

/** 水系地图要素属性（LineString：自源头山沿经文流向的示意线） */
export interface RiverFeatureProps {
  name: string;
  chapter: string;
  mountain: string;
  locationId: string;
  dir: string;
  dest: string;
  /** 展示语句，如「漳水 · 出发鸠之山 · 东流注于河」 */
  label: string;
}

/** GeoJSON LineString（最小子集） */
export interface GeoLineString {
  type: 'LineString';
  /** [[lng,lat], …] */
  coordinates: [number, number][];
}
export interface GeoLineFeature<P> {
  type: 'Feature';
  geometry: GeoLineString;
  properties: P;
}
export interface GeoLineFeatureCollection<P> {
  type: 'FeatureCollection';
  features: GeoLineFeature<P>[];
}

/** 地望地图要素属性 */
export interface LocationFeatureProps {
  locationId: string;
  name: string;
  nameSimp: string;
  type: LocationType;
  chapter: string;
  modern: string;
  basis: string;
  confidence: LocationConfidence;
  entityIds: string[];
}
