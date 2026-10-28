/**
 * nhx-ts-lib —— 倪海厦教学语料库（人纪/天纪/地纪/讲座/专题/医案/本草/穴位/方剂/逐字稿）
 *
 * 根入口只含轻量注册表与检索工具；重载荷走各子入口懒加载：
 *   nhx-ts-lib/docs        讲稿库（14 书 936 篇，manifest 同步 + 按书分包）
 *   nhx-ts-lib/herbs       中药 415 味（性味/归经/功效/主治 + 人纪原文引用）
 *   nhx-ts-lib/acupoints   穴位 411 穴（经络/定位/功效/穴性）
 *   nhx-ts-lib/formulas    经方 113 首（出处/分类 + 原文引用）
 *   nhx-ts-lib/cases       医案 959 篇（诊疗日志/神州医料库编档，分组分包）
 *   nhx-ts-lib/transcripts 人纪视频逐字稿 6486 段（书/章/段，RAG 就绪）
 *   nhx-ts-lib/gua         天纪 64 卦详解
 *   nhx-ts-lib/videos      B 站视频索引（6 系列 139 集，人纪五部 + 天纪）
 *   nhx-ts-lib/prompt      RAG 出处/提示块组装
 */
export type {
  Fidelity, DocMeta, BookGroup, BookInfo, SourceRepo, SourceRef, EntryBody,
  HerbMeta, AcupointMeta, FormulaMeta, CaseGroup, CaseMeta,
  TranscriptBookInfo, TranscriptBook, TranscriptChapter, TranscriptHit, GuaEntry,
} from './types';

export {
  getBooks, getBook, getSeries, getSources, getCorpusStats,
  FIDELITY_LABELS, DISCLAIMER,
} from './registry';

export { fold, foldIncludes } from './normalize';

// 讲稿库常用面（manifest 轻量；getDocMarkdown 分包懒加载）
export { getDocsManifest, getBookManifest, getDocMarkdown, searchDocs } from './docs';
