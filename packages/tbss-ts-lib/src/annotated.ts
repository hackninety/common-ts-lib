/**
 * 注解精选子入口 —— `import { getAnnotated, findAnnotated } from 'tbss-ts-lib/annotated'`
 *
 * 陈明点校本节录 29 条 + 今注/分类/标签（来自 wangdwn/mingli-lab，第三方今人整理，
 * 部分为节录）。体量小，同步导出；与一万二千条主库编号体系互不隶属。
 */
import annotatedData from './data/annotated.json';
import { foldIncludes } from './normalize';
import type { AnnotatedMeta, AnnotatedVerse } from './types';

export type { AnnotatedMeta, AnnotatedVerse } from './types';

const db = annotatedData as unknown as {
  meta: AnnotatedMeta;
  categories: string[];
  articles: AnnotatedVerse[];
};

/** 库级题注（书目来源与节录说明，宿主展示时建议一并呈现） */
export function getAnnotatedMeta(): AnnotatedMeta {
  return db.meta;
}

/** 分类清单（总论/六亲/婚姻/…） */
export function getAnnotatedCategories(): string[] {
  return db.categories;
}

/** 全部注解条目 */
export function getAnnotated(): AnnotatedVerse[] {
  return db.articles;
}

/** 按分类过滤 */
export function getAnnotatedByCategory(category: string): AnnotatedVerse[] {
  return db.articles.filter((a) => a.category === category);
}

/** 检索（题名/原文/今注/标签，繁简折叠） */
export function findAnnotated(query: string, opts?: { limit?: number }): AnnotatedVerse[] {
  if (!query.trim()) return [];
  const limit = opts?.limit ?? 20;
  const out: AnnotatedVerse[] = [];
  for (const a of db.articles) {
    if (foldIncludes(`${a.title} ${a.content} ${a.note} ${a.tags.join(' ')}`, query)) {
      out.push(a);
      if (out.length >= limit) break;
    }
  }
  return out;
}
