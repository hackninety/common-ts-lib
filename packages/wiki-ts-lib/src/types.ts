/** 篇目正文类型：原文、古注（含底本注疏）、译文、节录。 */
export type ContentKind = 'original' | 'commentary' | 'translation' | 'excerpt';

/**
 * source：来源材料（原文与底本注）；editorial：入库整理者写的版本与整理说明，非古籍原文；
 * ai：现代 AI（GPT／Gemini／Claude）写的译文、点评与全文总结，来自 react-scripture 藏经楼，不是古籍也不是校注。
 */
export type ContentLayer = 'source' | 'editorial' | 'ai';

export interface AiInfo {
  /** GPT、Gemini、Claude */
  provider: string;
  /** translation 逐段白话译文；commentary 逐段点评／思考；summary 全文理解总结 */
  role: 'translation' | 'commentary' | 'summary';
}

export type JsonRecord = Record<string, unknown>;

export interface ShardFile {
  file: string;
  entries: number;
  sha256: string;
}

export interface BookMeta {
  id: string;
  title: string;
  workTitle: string;
  author: string;
  era: string;
  category: string;
  /** 儒、释、道、其他 */
  tradition: string;
  edition: string;
  summary: string;
  tags: string[];
  /** novel-wiki 的引用地址，reference://<bookId> */
  uri: string;
  sourceUrl: string;
  source: JsonRecord;
  /** false 表示只有文献说明、未收正文（如《天地阴阳交欢大乐赋》文献说明） */
  fullText: boolean;
  entryCount: number;
  charCount: number;
  kinds: Partial<Record<ContentKind, number>>;
  volumes: { name: string; count: number }[];
  layers: Record<ContentLayer, number>;
  /** 有 AI 译注的书列出提供方 */
  aiProviders: string[];
  excluded?: { archived: number };
  files: { index: string; indexSha256: string; shards: ShardFile[] };
}

export interface Catalog {
  schemaVersion: 1;
  generatedAt: string;
  origin: { project: string; directory: string; revision: string | null; workingTreeClean: boolean | null; note: string };
  rights: string;
  totals: { books: number; entries: number; chars: number };
  excluded: { book: string; reason: string; count?: number }[];
  books: BookMeta[];
}

export interface EntryMeta {
  id: string;
  title: string;
  volume: string;
  order: number;
  kind: ContentKind;
  layer: ContentLayer;
  /** 仅 layer === 'ai' */
  ai?: AiInfo;
  tags: string[];
  section?: string;
  /** 正文字数（Unicode 码点） */
  chars: number;
  shard: number;
  /** reference://<bookId>/<entryId> */
  uri: string;
  sourceUrl?: string;
}

export interface Entry extends EntryMeta {
  bookId: string;
  bookTitle: string;
  /** 正文 Markdown；繁体、异体字保持底本字形，〈〉为原站小字注 */
  content: string;
  contentSha256: string;
  /** 入库时对来源的说明（不是创作笔记） */
  note?: string;
  /** 来源记录：提供方、页面、修订号、修订时间、哈希、许可、贡献者页等 */
  source: JsonRecord;
  /** 仅 AI 层：提供方、角色，以及对齐的原文段落 ID（react-scripture 的 segment id，正文里「### 对应原文 …」即这些段） */
  ai?: AiInfo & { segmentIds: string[] };
}

/** 与 qmdj-ts-lib/docs、lrdq-ts-lib/docs 同形的目录项；path = `<bookId>/<entryId>` */
export interface DocMeta {
  path: string;
  title: string;
  book: string;
  bookId: string;
  group: string;
  author: string;
  dynasty: string;
  kind: ContentKind;
  layer: ContentLayer;
  ai?: AiInfo;
  chars: number;
}

export interface SearchOptions {
  /** 限定书目 ID，单个或多个 */
  book?: string | string[];
  /** title：只搜篇名、卷名、小节、标签；text：只搜正文；all（默认）两者都搜，篇名命中排前 */
  scope?: 'title' | 'text' | 'all';
  kinds?: ContentKind[];
  /** 默认只搜 source；'ai' 只搜 AI 译注；'all' 三层都搜 */
  layer?: ContentLayer | 'all';
  /** 限定 AI 提供方（GPT／Gemini／Claude），只对 ai 层有效 */
  aiProvider?: string;
  limit?: number;
  offset?: number;
}

export interface SearchHit {
  bookId: string;
  bookTitle: string;
  entryId: string;
  path: string;
  uri: string;
  title: string;
  volume: string;
  kind: ContentKind;
  layer: ContentLayer;
  ai?: AiInfo;
  matchedIn: 'title' | 'text';
  /** 命中处前后约 160 字 */
  excerpt: string;
}

export interface SearchResult {
  items: SearchHit[];
  total: number;
  offset: number;
  nextOffset: number | null;
  match: 'keyword-and-folded';
}

export interface BookSearchOptions {
  tradition?: string;
  category?: string;
}
