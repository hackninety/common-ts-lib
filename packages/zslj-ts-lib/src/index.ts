/**
 * zslj-ts-lib —— 《占事略決》（安倍晴明，983 年前后）六壬式占古法排盘引擎
 *
 * 起课：cast（干支参数）/ castByDate（公历）/ castBySiZhu（四柱反推）
 * 适配：toGenericChart（react-liuren 统一模型形状）
 * AI：SYSTEM_PROMPT / buildUserPrompt / buildClipboardPrompt / collectRefs
 * 文献：book（chapters / gua36 / tables 结构化原文数据）
 */
export * from './cast';
export * from './types';
export { calendarFromDate } from './calendar';
export type { YueJiangMode, CalendarInfo } from './calendar';
export { toGenericChart } from './generic';
export type { GenericLiuRenChart, GenericShenShaEntry } from './generic';
export {
  SYSTEM_PROMPT, buildUserPrompt, buildClipboardPrompt, collectRefs, chartForAI,
} from './prompt';
export type { RefFragment } from './prompt';

// 常用常量与查表（宿主 UI 着色/展示用）
export {
  GAN_WUXING, ZHI_WUXING, jiGong, jiangInfo, yueJiangName, isGangGan, mengZhongJi,
} from './constants';

// 结构化书籍数据（「数据即文献」：来自 docs/book/senji-ryakketsu.md 的提取与人工录入）
import chaptersData from './data/chapters.json';
import gua36Data from './data/gua36.json';
import tablesData from './data/tables.json';

export const book = {
  chapters: chaptersData,
  gua36: gua36Data,
  tables: tablesData,
} as const;

/** 按锚点 id 查原文（senjiXX / hochuuXX / oku / 26XX） */
export function getBookEntry(id: string): { heading: string; text: string; sideNote?: string } | undefined {
  if (/^26\d\d$/.test(id)) {
    const g = gua36Data.guas.find((x) => x.id === id);
    return g ? { heading: g.heading, text: g.text } : undefined;
  }
  const c = chaptersData.chapters.find((x) => x.id === id);
  return c
    ? { heading: c.heading || c.title, text: c.text, sideNote: (c as { sideNote?: string }).sideNote }
    : undefined;
}

// ---------- 典籍库（可读 markdown 文档，供宿主直接渲染）----------
// 图片链接已改写为 GitHub raw 绝对地址，站内 .md 链接为 docs 根相对路径。
import docsData from './data/docs.json';

export interface DocMeta {
  /** docs 根相对路径，如 'book/senji-ryakketsu.md' */
  path: string;
  /** 文档标题（首个一级标题） */
  title: string;
  /** 分组：book（原文合订本）/ algorithm（算法说明） */
  group: string;
}

/** 典籍文档目录（原文合订本 + 算法说明/存疑清单） */
export function getDocsManifest(): DocMeta[] {
  return docsData.manifest as DocMeta[];
}

/** 取某篇文档的 markdown 正文（path 用 manifest 中的值） */
export function getDocMarkdown(path: string): string | undefined {
  return (docsData.docs as Record<string, string>)[path];
}

/** 图片 raw 基地址（宿主如需自行拼接资源可用） */
export const docsImageBase = docsData.imageBase;
