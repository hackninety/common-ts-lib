/**
 * nhx-ts-lib 类型定义 —— 倪海厦教学语料库
 */

/**
 * 语料保真度分级（每篇文档/条目均携带）：
 * - `first-party`   倪师亲笔（官网诊疗日志、专题文章、地纪遗稿）
 * - `lecture-notes` 听课整理稿（人纪/天纪课程随堂笔记式讲稿，非逐字）
 * - `transcript`    视频/录音逐字稿（字幕、演讲、录音坐诊）
 * - `attributed`    传为倪师所述，整理者自注存疑（如汉唐方剂讲解）
 * - `third-party`   第三方整理/补充（小编补充药物、整理者总结、神州医料库编档）
 */
export type Fidelity = 'first-party' | 'lecture-notes' | 'transcript' | 'attributed' | 'third-party';

/** 讲稿库篇目（docs-manifest 轻量条目） */
export interface DocMeta {
  /** `<slug>/<group>/<NNN>-<title>.md`（如 shanghan/ben/003-辨太阳病脉证并治法上篇.md） */
  path: string;
  title: string;
  /** 书内分组 id（见 BookInfo.groups） */
  group: string;
  /** 书名（宿主抽屉分组依据），如「伤寒论」 */
  book: string;
  /** 系列：人纪 / 天纪 / 地纪 / 讲演 / 文集 */
  series: string;
  fidelity: Fidelity;
  /** 日志类文档的日期（YYYY-MM-DD） */
  date?: string;
}

export interface BookGroup {
  id: string;
  title: string;
  count: number;
  fidelity: Fidelity;
}

/** 书目注册表条目 */
export interface BookInfo {
  slug: string;
  name: string;
  series: string;
  fidelity: Fidelity;
  /** 底本来源仓库（github:owner/repo） */
  sourceRepo: string;
  groups: BookGroup[];
  count: number;
}

/** 底本来源仓库（引入时锁定 commit） */
export interface SourceRepo {
  url: string;
  commit: string;
  note: string;
}

/** 结构化条目的原文引用证据（页码指向人纪原版讲义 PDF/JSON） */
export interface SourceRef {
  file: string;
  page: number | null;
  quote: string;
}

/** 结构化条目正文载荷 */
export interface EntryBody {
  md: string;
  refs: SourceRef[];
}

/** 中药（qmzz 结构化，含性味归经；bencaoDoc 互链《神农本草经》讲稿） */
export interface HerbMeta {
  id: string;
  name: string;
  source?: string;
  category?: string;
  xingwei?: string;
  guijing?: string;
  gongxiao?: string;
  zhuzhi?: string;
  /** 对应《神农本草经》讲稿文档 path（如有） */
  bencaoDoc?: string;
}

/** 穴位（经络/定位/功效/穴性来自索引表与正文结构行合并） */
export interface AcupointMeta {
  id: string;
  name: string;
  meridian?: string;
  location?: string;
  effect?: string;
  pointType?: string;
  /** 国际代码（如 GV20、ST36，正文可解析时给出） */
  code?: string;
  aliases?: string[];
}

/** 方剂（经方；汉唐编号方见《汉唐方剂讲解》docs 分支） */
export interface FormulaMeta {
  id: string;
  name: string;
  source?: string;
  category?: string;
}

/** 医案分组 */
export interface CaseGroup {
  id: string;
  title: string;
  fidelity: Fidelity;
  count: number;
}

/** 医案索引条目（正文经 getCaseMarkdown 懒加载） */
export interface CaseMeta {
  id: string;
  group: string;
  title: string;
  /** 初诊/日志日期（YYYY-MM-DD，能解析时给出） */
  date?: string;
  /** 来诊原因/首行提要 */
  summary?: string;
}

/** 逐字稿书目（轻量索引） */
export interface TranscriptBookInfo {
  book: string;
  title: string;
  paraCount: number;
  chapters: { id: string; title: string; paras: number }[];
}

/** 逐字稿章（paras: [段号, 文本]） */
export interface TranscriptChapter {
  id: string;
  title: string;
  paras: [number, string][];
}

export interface TranscriptBook {
  book: string;
  title: string;
  chapters: TranscriptChapter[];
}

/** 逐字稿检索命中 */
export interface TranscriptHit {
  book: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
  para: number;
  text: string;
}

/** 天纪 64 卦详解条目 */
export interface GuaEntry {
  no: number;
  name: string;
  /** 卦象字符（䷀-䷿） */
  symbol: string;
  md: string;
}
