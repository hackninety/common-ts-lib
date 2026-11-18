export type JsonRecord = Record<string, unknown>;

/** 篇目元数据（不含正文） */
export interface EntryMeta {
  /** 书内序号，两位起补零，如 `34` */
  id: string;
  title: string;
  /** 卷名或大类；多数书为空串 */
  group: string;
  /** 正文字数（Unicode 码点） */
  chars: number;
  /** 该篇的来源页地址 */
  sourceUrl: string;
}

export interface BookMeta {
  id: string;
  /** 本库收录的题名（含节选说明） */
  title: string;
  /** 原书名 */
  workTitle: string;
  author: string;
  dynasty: string;
  /** 正文字形：简体整理本或繁体底本，照录不转换 */
  script: '简' | '繁';
  /** 所据版本与录入来源 */
  edition: string;
  summary: string;
  sourceUrl: string;
  /** 校记与来源说明（如双源比对情况） */
  notes: string[];
  entryCount: number;
  chars: number;
}

export interface Entry extends EntryMeta {
  bookId: string;
  bookTitle: string;
  content: string;
}

/** 与 qmdj-ts-lib/docs、lrdq-ts-lib/docs、wiki-ts-lib 同形的篇目目录项 */
export interface DocMeta {
  /** `<bookId>/<entryId>`，首段即书目 ID */
  path: string;
  title: string;
  book: string;
  bookId: string;
  group: string;
  author: string;
  dynasty: string;
  script: '简' | '繁';
  chars: number;
}

export interface CatalogInfo {
  schemaVersion: 1;
  /** 库 ID，如 `bzdj` */
  corpus: string;
  /** 所属术数系统，如 `bazi` */
  system: string;
  title: string;
  /** 整理所据的来源仓库与提交 */
  origin: { repository: string; path: string; revision: string; committedAt: string };
  rights: string;
  /** 来源目录里有意不收的文件及原因 */
  excluded: { file: string; reason: string }[];
  totals: { books: number; entries: number; chars: number };
}

export interface SearchOptions {
  /** 限定一部或几部书 */
  book?: string | string[];
  /** title=只比篇名与卷名，text=只比正文，all=两者（默认） */
  scope?: 'all' | 'title' | 'text';
  offset?: number;
  /** 默认 20，上限 200 */
  limit?: number;
}

export interface SearchHit {
  bookId: string;
  bookTitle: string;
  entryId: string;
  path: string;
  title: string;
  group: string;
  matchedIn: 'title' | 'text';
  excerpt: string;
}

export interface SearchResult {
  items: SearchHit[];
  total: number;
  offset: number;
  nextOffset: number | null;
  match: 'keyword-and-folded';
}
