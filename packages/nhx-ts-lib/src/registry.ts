/**
 * 书目注册表与库级元信息（轻量同步；重载荷一律走各子入口懒加载）
 */
import booksData from './data/books.json';
import statsData from './data/corpus-stats.json';
import type { BookInfo, CaseGroup, Fidelity, SourceRepo } from './types';

const reg = booksData as unknown as {
  books: BookInfo[];
  caseGroups: CaseGroup[];
  sources: SourceRepo[];
};

/** 全部讲稿书目（人纪五部/闭门课/天纪/地纪/讲座/专题/方剂讲解/相学/字幕…） */
export function getBooks(): BookInfo[] {
  return reg.books;
}

/** 按 slug 取书目信息 */
export function getBook(slug: string): BookInfo | undefined {
  return reg.books.find((b) => b.slug === slug);
}

/** 系列列表（人纪/天纪/地纪/讲演/文集），保持书目出现顺序 */
export function getSeries(): string[] {
  const seen: string[] = [];
  for (const b of reg.books) if (!seen.includes(b.series)) seen.push(b.series);
  return seen;
}

/** 底本来源仓库（URL + 引入时 commit） */
export function getSources(): SourceRepo[] {
  return reg.sources;
}

/** 语料规模统计（构建期生成，测试锚点） */
export function getCorpusStats(): Record<string, unknown> {
  return statsData as Record<string, unknown>;
}

/** 保真度中文标签 */
export const FIDELITY_LABELS: Record<Fidelity, string> = {
  'first-party': '倪师亲笔',
  'lecture-notes': '听课整理稿',
  transcript: '逐字稿',
  attributed: '传述存疑',
  'third-party': '第三方整理',
};

/**
 * 使用须知：本库为教学语料检索用途。
 * 内容系社区对倪海厦公开课程/文章的转录与整理，非医疗建议；
 * 处方、针灸等临床操作须由执业医师判断。
 */
export const DISCLAIMER =
  '本库内容为倪海厦公开教学资料的社区转录与结构化整理，仅供学习研究与资料检索，' +
  '不构成诊断、处方、针灸操作或任何医疗建议；临床应用须由执业中医师独立判断。' +
  '文本保真度分级见各条目 fidelity 字段；版权归倪海厦先生继承人及各整理者所有，' +
  '本库以 CC BY-NC 4.0 非商用汇编发布，权利人异议即撤。';
