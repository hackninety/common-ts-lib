/**
 * tbss-ts-lib —— 铁板神数语料库（一万二千条文/十四考取数表/注解精选/方法文献）
 *
 * 根入口只含轻量注册表与检索工具；重载荷走各子入口懒加载：
 *   tbss-ts-lib/verses     条文库（12000 条十二集，年龄注记 + 全文检索，按集分包）
 *   tbss-ts-lib/tables     十四考取数表 15 张（通用表格形态 + 八刻/太玄数常量）
 *   tbss-ts-lib/annotated  注解精选 29 条（陈明点校本节录 + 今注/分类/标签）
 *   tbss-ts-lib/docs       方法文献（概述/考刻/取数表说明，manifest 同步 + 正文懒加载）
 *   tbss-ts-lib/prompt     RAG 出处/提示块组装
 */
export type {
  Verse, VolumeInfo, AnnotatedVerse, AnnotatedMeta,
  DataTable, QuarterInfo, MethodDocMeta, SourceRepo,
} from './types';

export { getSources, getCorpusStats, FIDELITY_NOTE, DISCLAIMER } from './registry';

export { fold, foldIncludes } from './normalize';

// 条文库常用面（卷册清单轻量同步；getVerse/searchVerses 分包懒加载）
export { getVolumes, volumeOf, getVerse, getVerses, searchVerses } from './verses';
