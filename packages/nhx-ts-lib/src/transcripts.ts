/**
 * 人纪视频逐字稿子入口 —— `import { searchTranscripts } from 'nhx-ts-lib/transcripts'`
 *
 * 重黎数据集（wesky-online/zhongli_data）：人纪五部视频同步文稿 6486 段，
 * 书/章/段三级。索引（章目录）同步内联；正文按书分包懒加载。
 * 适合直接作为 RAG 语料（段落粒度、带书章出处）。
 */
import indexData from './data/transcripts-index.json';
import { foldIncludes } from './normalize';
import type { TranscriptBook, TranscriptBookInfo, TranscriptChapter, TranscriptHit } from './types';

export type { TranscriptBook, TranscriptBookInfo, TranscriptChapter, TranscriptHit } from './types';

const index = (indexData as unknown as { books: TranscriptBookInfo[] }).books;

const LOADERS: Record<string, () => Promise<{ payload: unknown }>> = {
  zhenjiu: () => import('./chunks/transcripts-zhenjiu'),
  neijing: () => import('./chunks/transcripts-neijing'),
  bencao: () => import('./chunks/transcripts-bencao'),
  shanghan: () => import('./chunks/transcripts-shanghan'),
  jingui: () => import('./chunks/transcripts-jingui'),
};

const cache = new Map<string, TranscriptBook>();

/** 逐字稿书目与章目录（轻量，同步） */
export function getTranscriptBooks(): TranscriptBookInfo[] {
  return index;
}

/** 加载整书逐字稿（异步分包） */
export async function loadTranscriptBook(book: string): Promise<TranscriptBook | undefined> {
  let tb = cache.get(book);
  if (!tb) {
    const loader = LOADERS[book];
    if (!loader) return undefined;
    tb = (await loader()).payload as TranscriptBook;
    cache.set(book, tb);
  }
  return tb;
}

/** 取某章逐字稿 */
export async function getTranscriptChapter(book: string, chapterId: string): Promise<TranscriptChapter | undefined> {
  const tb = await loadTranscriptBook(book);
  return tb?.chapters.find((c) => c.id === chapterId);
}

/** 段落级全文检索（异步：按书渐进加载；books 为 slug 白名单） */
export async function searchTranscripts(
  query: string,
  opts?: { books?: string[]; limit?: number },
): Promise<TranscriptHit[]> {
  const limit = opts?.limit ?? 50;
  const books = opts?.books ?? index.map((b) => b.book);
  const out: TranscriptHit[] = [];
  for (const slug of books) {
    const info = index.find((b) => b.book === slug);
    const tb = await loadTranscriptBook(slug);
    if (!tb || !info) continue;
    for (const ch of tb.chapters) {
      for (const [n, text] of ch.paras) {
        if (text.includes(query) || foldIncludes(text, query)) {
          out.push({ book: slug, bookTitle: info.title, chapterId: ch.id, chapterTitle: ch.title, para: n, text });
          if (out.length >= limit) return out;
        }
      }
    }
  }
  return out;
}
