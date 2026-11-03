/**
 * 古籍参考文库 —— `import { getBooks, getEntry, searchEntries } from 'wiki-ts-lib'`
 *
 * 书目总表随首次调用同步读入；各书篇目索引按书读入；正文按片异步读入并缓存，
 * 大书（太平广记、夷坚志）只读用到的那几片。仅适用于 Node（读包内 data/ 文件）。
 * 另有与 qmdj-ts-lib/docs、lrdq-ts-lib/docs 同形的 getDocsManifest / getDocMarkdown。
 */
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { gunzip, gunzipSync } from 'node:zlib';
import type {
  BookMeta, BookSearchOptions, Catalog, ContentKind, DocMeta, Entry, EntryMeta, JsonRecord,
  SearchHit, SearchOptions, SearchResult,
} from './types.js';

export type * from './types.js';

const DATA = new URL('../data/', import.meta.url);
const gunzipAsync = promisify(gunzip);
/** 篇目索引与正文分片是 .json.gz；总表与折叠表是明文。 */
const readJsonSync = <T>(file: string): T => {
  const bytes = readFileSync(new URL(file, DATA));
  return JSON.parse((file.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8')) as T;
};
const readJson = async <T>(file: string): Promise<T> => {
  const bytes = await readFile(new URL(file, DATA));
  return JSON.parse((file.endsWith('.gz') ? await gunzipAsync(bytes) : bytes).toString('utf8')) as T;
};

interface ShardRecord { content: string; contentSha256: string; source: JsonRecord; note?: string; sourceUrl?: string; ai?: Entry['ai'] }
type Shard = Record<string, ShardRecord>;

let catalog: Catalog | undefined;
let foldMap: Record<string, string> | undefined;
let bookById: Map<string, BookMeta> | undefined;
const indexCache = new Map<string, { list: EntryMeta[]; byId: Map<string, EntryMeta> }>();
const shardCache = new Map<string, Promise<Shard>>();
const foldedCache = new Map<string, string>();

function load(): Catalog {
  catalog ??= readJsonSync<Catalog>('catalog.json');
  return catalog;
}

function bookMap(): Map<string, BookMeta> {
  bookById ??= new Map(load().books.map(b => [b.id, b]));
  return bookById;
}

function bookIndex(bookId: string) {
  let cached = indexCache.get(bookId);
  if (!cached) {
    const book = bookMap().get(bookId);
    if (!book) return undefined;
    const list = readJsonSync<EntryMeta[]>(book.files.index);
    cached = { list, byId: new Map(list.map(e => [e.id, e])) };
    indexCache.set(bookId, cached);
  }
  return cached;
}

function shard(bookId: string, n: number): Promise<Shard> {
  const key = `${bookId}#${n}`;
  let result = shardCache.get(key);
  if (!result) {
    const file = bookMap().get(bookId)?.files.shards[n]?.file;
    if (!file) return Promise.reject(new Error(`未知分片：${key}`));
    result = readJson<Shard>(file);
    result.catch(() => shardCache.delete(key));
    shardCache.set(key, result);
  }
  return result;
}

/**
 * 检索用折叠：繁→简（逐字，OpenCC 表）、ASCII 小写。只改字、不改长度，
 * 折叠后的下标与原文一一对应，用来截取命中片段。正文本身不做转换。
 */
export function foldText(text: string): string {
  foldMap ??= readJsonSync<Record<string, string>>('fold.json');
  let result = '';
  for (const ch of text) result += foldMap[ch] ?? (ch >= 'A' && ch <= 'Z' ? ch.toLowerCase() : ch);
  return result;
}

/** 文库总表：来源、生成时间、许可说明、总数与剔除记录 */
export function getCatalog(): Omit<Catalog, 'books'> {
  const { books: _books, ...rest } = load();
  return rest;
}

/** 全部书目（按书名排序） */
export function getBooks(options: BookSearchOptions = {}): BookMeta[] {
  return load().books.filter(b =>
    (!options.tradition || b.tradition === options.tradition) && (!options.category || b.category.includes(options.category)));
}

export function getBook(bookId: string): BookMeta | undefined {
  return bookMap().get(bookId);
}

/** 按书名、作者、时代、分类、标签、简介查书；空格分隔多词须全部命中 */
export function searchBooks(query: string): BookMeta[] {
  const terms = foldText(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return load().books.filter(b => {
    const text = foldText([b.title, b.workTitle, b.id, b.author, b.era, b.category, b.tradition, b.tags.join(' '), b.summary].join('\n'));
    return terms.every(t => text.includes(t));
  });
}

/** 某书全部篇目元数据（按卷次、顺序排好），不含正文 */
export function getEntries(bookId: string): EntryMeta[] {
  return bookIndex(bookId)?.list ?? [];
}

export function getEntryMeta(bookId: string, entryId: string): EntryMeta | undefined {
  return bookIndex(bookId)?.byId.get(entryId);
}

/** 读一篇全文与来源记录 */
export async function getEntry(bookId: string, entryId: string): Promise<Entry | undefined> {
  const meta = getEntryMeta(bookId, entryId);
  if (!meta) return undefined;
  const record = (await shard(bookId, meta.shard))[entryId];
  if (!record) return undefined;
  return { ...meta, bookId, bookTitle: bookMap().get(bookId)!.title, ...record, ai: record.ai };
}

/** 按 novel-wiki 引用地址读：reference://<bookId>/<entryId> */
export function getEntryByUri(uri: string): Promise<Entry | undefined> {
  const m = /^reference:\/\/([^/]+)\/(.+)$/.exec(uri);
  return m ? getEntry(m[1]!, m[2]!) : Promise.resolve(undefined);
}

/** 全库篇目目录，与 qmdj/lrdq 的 docs 目录同形；path = `<bookId>/<entryId>`，首段即书目 ID */
export function getDocsManifest(): DocMeta[] {
  const result: DocMeta[] = [];
  for (const book of load().books) {
    for (const e of getEntries(book.id)) {
      result.push({
        path: `${book.id}/${e.id}`, title: e.title, book: book.title, bookId: book.id, group: e.volume,
        author: book.author, dynasty: book.era, kind: e.kind, layer: e.layer, ai: e.ai, chars: e.chars,
      });
    }
  }
  return result;
}

const KIND_LABEL: Record<ContentKind, string> = { original: '原文', commentary: '古注', translation: '译文', excerpt: '节录' };

/** 一篇的 Markdown：标题、出处行（> 开头）、正文 */
export async function getDocMarkdown(path: string): Promise<string | undefined> {
  const slash = path.indexOf('/');
  if (slash < 1) return undefined;
  const entry = await getEntry(path.slice(0, slash), path.slice(slash + 1));
  if (!entry) return undefined;
  const AI_ROLE = { translation: '现代译文', commentary: '点评', summary: '全文总结' } as const;
  const label = entry.layer === 'editorial' ? '整理说明（非古籍原文）'
    : entry.ai ? `${entry.ai.provider} AI ${AI_ROLE[entry.ai.role]}（非古籍原文）`
    : KIND_LABEL[entry.kind];
  const where = [`《${entry.bookTitle}》`, entry.volume, label, entry.sourceUrl ? `来源：${entry.sourceUrl}` : ''].filter(Boolean).join(' · ');
  return `# ${entry.title}\n\n> ${where}\n> ${entry.uri}\n\n${entry.content}\n`;
}

function excerpt(text: string, folded: string, terms: string[], length = 160): string {
  const positions = terms.map(t => folded.indexOf(t)).filter(n => n >= 0);
  let start = Math.max(0, (positions.length ? Math.min(...positions) : 0) - 50);
  if (start > 0 && /[\uDC00-\uDFFF]/.test(text[start]!)) start--;
  let end = Math.min(text.length, start + length);
  if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1]!)) end++;
  return `${start ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ')}${end < text.length ? '…' : ''}`;
}

/**
 * 篇目检索：空格分隔多关键词，全部命中才算（AND），简繁等价。
 * 篇名、卷名、小节、标签命中的排在正文命中前面；不是语义相关度排序。
 */
export async function searchEntries(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const terms = foldText(query).trim().split(/\s+/).filter(Boolean);
  const limit = Math.max(1, Math.min(options.limit ?? 20, 200));
  const offset = Math.max(0, options.offset ?? 0);
  if (!terms.length) return { items: [], total: 0, offset, nextOffset: null, match: 'keyword-and-folded' };
  const scope = options.scope ?? 'all';
  const layer = options.layer ?? 'source';
  const wanted = options.book === undefined ? undefined : new Set(Array.isArray(options.book) ? options.book : [options.book]);
  if (wanted) for (const id of wanted) if (!bookMap().has(id)) throw new Error(`未知书目：${id}`);

  const titleHits: SearchHit[] = [];
  const textHits: SearchHit[] = [];
  for (const book of load().books) {
    if (wanted && !wanted.has(book.id)) continue;
    for (const e of getEntries(book.id)) {
      if (options.kinds && !options.kinds.includes(e.kind)) continue;
      if (layer !== 'all' && e.layer !== layer) continue;
      if (options.aiProvider && e.ai?.provider !== options.aiProvider) continue;
      const hit = (matchedIn: 'title' | 'text', excerptText: string): SearchHit => ({
        bookId: book.id, bookTitle: book.title, entryId: e.id, path: `${book.id}/${e.id}`, uri: e.uri,
        title: e.title, volume: e.volume, kind: e.kind, layer: e.layer, ai: e.ai, matchedIn, excerpt: excerptText,
      });
      const label = [e.title, e.volume, e.section ?? '', e.tags.join(' ')].join(' ');
      const titleMatch = scope !== 'text' && terms.every(t => foldText(label).includes(t));
      if (scope === 'title') {
        if (titleMatch) titleHits.push(hit('title', label));
        continue;
      }
      const key = `${book.id}/${e.id}`;
      const content = (await shard(book.id, e.shard))[e.id]?.content ?? '';
      let folded = foldedCache.get(key);
      if (folded === undefined) { folded = foldText(content); foldedCache.set(key, folded); }
      // 篇名命中时片段取正文里第一次出现处，正文没有就取开头。
      if (titleMatch) titleHits.push(hit('title', excerpt(content, folded, terms)));
      else if (terms.every(t => folded!.includes(t))) textHits.push(hit('text', excerpt(content, folded, terms)));
    }
  }
  const all = [...titleHits, ...textHits];
  const items = all.slice(offset, offset + limit);
  return { items, total: all.length, offset, nextOffset: offset + items.length < all.length ? offset + items.length : null, match: 'keyword-and-folded' };
}
