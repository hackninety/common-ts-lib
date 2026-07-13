/**
 * tbss-ts-lib 类型定义 —— 铁板神数语料库
 */

/** 十二集卷册信息（地支命名，各 1000 条） */
export interface VolumeInfo {
  /** 拼音 slug：zi/chou/yin/mao/chen/si/wu/wei/shen/you/xu/hai */
  slug: string;
  /** 地支单字：子/丑/… */
  branch: string;
  /** 集名：子集/丑集/… */
  name: string;
  /** 起始条文号（含） */
  start: number;
  /** 结束条文号（含） */
  end: number;
  /** 条数（恒 1000） */
  count: number;
}

/** 条文（一万二千条主库单条） */
export interface Verse {
  /** 条文号 1001–13000（全库连续无缺） */
  n: number;
  /** 所在集名（子集…亥集） */
  volume: string;
  /** 年龄注记（流年应验岁数；约 59% 条文携带，无注记为空数组） */
  ages: number[];
  /** 断语原文（底本照录） */
  text: string;
}

/** 注解精选条目（陈明点校本节录 + 今人注解，来自 mingli-lab） */
export interface AnnotatedVerse {
  id: string;
  /** 卷次 */
  juan: number;
  /** 卷内条次 */
  tiao: number;
  category: string;
  title: string;
  /** 条文原文（部分为节录） */
  content: string;
  /** 今注 */
  note: string;
  tags: string[];
}

/** 注解精选库级元信息 */
export interface AnnotatedMeta {
  title: string;
  source: string;
  note: string;
}

/** 取数表（十四考 CSV 的通用表格形态，宿主可直接渲染） */
export interface DataTable {
  /** 上游编号：14-1 … 14-14（14-11 分 -1/-2） */
  id: string;
  /** 语义 slug：month/hour/wuyin/… */
  slug: string;
  title: string;
  /** 字段与用途一句话说明 */
  description: string;
  columns: string[];
  /** 数据行（原样字符串；多值单元格内以 \n 分隔） */
  rows: string[][];
}

/** 八刻细分行（考刻基础表，见 docs/corpus/method/kaoke.md） */
export interface QuarterInfo {
  /** 刻别：初刻/一刻/…/正刻 */
  name: string;
  /** 时辰内起始分钟（含） */
  fromMinute: number;
  /** 时辰内结束分钟（不含） */
  toMinute: number;
  /** 所配天干 */
  stem: string;
  /** 刻干数 1–8（核心公式乘数） */
  value: number;
}

/** 方法文献篇目 */
export interface MethodDocMeta {
  slug: string;
  title: string;
  /** 一句话摘要 */
  summary: string;
}

/** 底本来源仓库（引入时锁定 commit） */
export interface SourceRepo {
  id: string;
  url: string;
  commit: string;
  note: string;
}
