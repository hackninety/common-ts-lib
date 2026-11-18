/**
 * 命理典籍原文库 —— `import { getBooks, getEntry, searchEntries } from '<本包>'`
 *
 * 书目总表随首次调用同步读入；正文按书异步读入并缓存。仅适用于 Node（读包内 data/ 文件）。
 * 另有与 qmdj-ts-lib/docs、lrdq-ts-lib/docs、wiki-ts-lib 同形的 getDocsManifest / getDocMarkdown。
 * bzdj-ts-lib 与 zwdj-ts-lib 的本文件逐字相同，差别只在各自的 data/。
 */
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { BookMeta, CatalogInfo, DocMeta, Entry, EntryMeta, SearchHit, SearchOptions, SearchResult } from './types.js';

export type * from './types.js';

const DATA = new URL('../data/', import.meta.url);
type StoredBook = BookMeta & { file: string; entries: EntryMeta[] };
type Catalog = CatalogInfo & { books: StoredBook[] };

let catalog: Catalog | undefined;
let foldMap: Record<string, string> | undefined;
let bookById: Map<string, StoredBook> | undefined;
const contentCache = new Map<string, Promise<Record<string, string>>>();
const foldedCache = new Map<string, string>();

function load(): Catalog {
  catalog ??= JSON.parse(readFileSync(new URL('catalog.json', DATA), 'utf8')) as Catalog;
  return catalog;
}

function bookMap(): Map<string, StoredBook> {
  bookById ??= new Map(load().books.map((b) => [b.id, b]));
  return bookById;
}

function contents(bookId: string): Promise<Record<string, string>> {
  let result = contentCache.get(bookId);
  if (!result) {
    const file = bookMap().get(bookId)?.file;
    if (!file) return Promise.reject(new Error(`未知书目：${bookId}`));
    result = readFile(new URL(file, DATA), 'utf8').then((text) => JSON.parse(text) as Record<string, string>);
    result.catch(() => contentCache.delete(bookId));
    contentCache.set(bookId, result);
  }
  return result;
}

const publicBook = ({ file: _file, entries: _entries, ...book }: StoredBook): BookMeta => book;

/**
 * 检索用折叠：繁→简（逐字，OpenCC 表）、ASCII 小写。只改字、不改长度，
 * 折叠后的下标与原文一一对应，用来截取命中片段。正文本身不做转换。
 */
export function foldText(text: string): string {
  foldMap ??= JSON.parse(readFileSync(new URL('fold.json', DATA), 'utf8')) as Record<string, string>;
  let result = '';
  for (const ch of text) result += foldMap[ch] ?? (ch >= 'A' && ch <= 'Z' ? ch.toLowerCase() : ch);
  return result;
}

/** 文库总表：所属系统、来源仓库提交、权利说明、总数与有意不收的文件 */
export function getCatalog(): CatalogInfo {
  const { books: _books, ...rest } = load();
  return rest;
}

/** 全部书目（按收录顺序） */
export function getBooks(): BookMeta[] {
  return load().books.map(publicBook);
}

export function getBook(bookId: string): BookMeta | undefined {
  const book = bookMap().get(bookId);
  return book ? publicBook(book) : undefined;
}

/** 某书全部篇目元数据（按原书顺序），不含正文 */
export function getEntries(bookId: string): EntryMeta[] {
  return bookMap().get(bookId)?.entries ?? [];
}

export function getEntryMeta(bookId: string, entryId: string): EntryMeta | undefined {
  return getEntries(bookId).find((e) => e.id === entryId);
}

/** 读一篇全文 */
export async function getEntry(bookId: string, entryId: string): Promise<Entry | undefined> {
  const book = bookMap().get(bookId);
  const meta = book?.entries.find((e) => e.id === entryId);
  if (!book || !meta) return undefined;
  const content = (await contents(bookId))[entryId];
  return content === undefined ? undefined : { ...meta, bookId, bookTitle: book.title, content };
}

/** 全库篇目目录；path = `<bookId>/<entryId>`，首段即书目 ID */
export function getDocsManifest(): DocMeta[] {
  const result: DocMeta[] = [];
  for (const book of load().books) {
    for (const e of book.entries) {
      result.push({
        path: `${book.id}/${e.id}`, title: e.title, book: book.title, bookId: book.id, group: e.group,
        author: book.author, dynasty: book.dynasty, script: book.script, chars: e.chars,
      });
    }
  }
  return result;
}

/** 一篇的 Markdown：标题、出处行（> 开头）、正文 */
export async function getDocMarkdown(path: string): Promise<string | undefined> {
  const slash = path.indexOf('/');
  if (slash < 1) return undefined;
  const entry = await getEntry(path.slice(0, slash), path.slice(slash + 1));
  if (!entry) return undefined;
  const book = bookMap().get(entry.bookId)!;
  const where = [`《${book.workTitle}》`, entry.group, `${book.dynasty}·${book.author}`, book.edition, entry.sourceUrl ? `来源：${entry.sourceUrl}` : '']
    .filter(Boolean)
    .join(' · ');
  return `# ${entry.title}\n\n> ${where}\n\n${entry.content}\n`;
}

function excerpt(text: string, folded: string, terms: string[], length = 160): string {
  const positions = terms.map((t) => folded.indexOf(t)).filter((n) => n >= 0);
  let start = Math.max(0, (positions.length ? Math.min(...positions) : 0) - 50);
  if (start > 0 && /[\uDC00-\uDFFF]/.test(text[start]!)) start--;
  let end = Math.min(text.length, start + length);
  if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1]!)) end++;
  return `${start ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ')}${end < text.length ? '…' : ''}`;
}

/**
 * 篇目检索：空格分隔多关键词，全部命中才算（AND），简繁等价。
 * 篇名、卷名命中的排在正文命中前面；不是语义相关度排序。
 */
export async function searchEntries(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const terms = foldText(query).trim().split(/\s+/).filter(Boolean);
  const limit = Math.max(1, Math.min(options.limit ?? 20, 200));
  const offset = Math.max(0, options.offset ?? 0);
  if (!terms.length) return { items: [], total: 0, offset, nextOffset: null, match: 'keyword-and-folded' };
  const scope = options.scope ?? 'all';
  const wanted = options.book === undefined ? undefined : new Set(Array.isArray(options.book) ? options.book : [options.book]);
  if (wanted) for (const id of wanted) if (!bookMap().has(id)) throw new Error(`未知书目：${id}`);

  const titleHits: SearchHit[] = [];
  const textHits: SearchHit[] = [];
  for (const book of load().books) {
    if (wanted && !wanted.has(book.id)) continue;
    const body = scope === 'title' ? undefined : await contents(book.id);
    for (const e of book.entries) {
      const hit = (matchedIn: 'title' | 'text', excerptText: string): SearchHit => ({
        bookId: book.id, bookTitle: book.title, entryId: e.id, path: `${book.id}/${e.id}`,
        title: e.title, group: e.group, matchedIn, excerpt: excerptText,
      });
      const label = [e.title, e.group].filter(Boolean).join(' ');
      const foldedLabel = foldText(label);
      const titleMatch = scope !== 'text' && terms.every((t) => foldedLabel.includes(t));
      if (!body) {
        if (titleMatch) titleHits.push(hit('title', label));
        continue;
      }
      const key = `${book.id}/${e.id}`;
      const content = body[e.id] ?? '';
      let folded = foldedCache.get(key);
      if (folded === undefined) {
        folded = foldText(content);
        foldedCache.set(key, folded);
      }
      // 篇名命中时片段取正文里第一次出现处，正文没有就取开头。
      if (titleMatch) titleHits.push(hit('title', excerpt(content, folded, terms)));
      else if (terms.every((t) => folded!.includes(t))) textHits.push(hit('text', excerpt(content, folded, terms)));
    }
  }
  const all = [...titleHits, ...textHits];
  const items = all.slice(offset, offset + limit);
  return { items, total: all.length, offset, nextOffset: offset + items.length < all.length ? offset + items.length : null, match: 'keyword-and-folded' };
}
