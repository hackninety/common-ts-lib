/**
 * 方法文献子入口 —— `import { getMethodDocs, getDocMarkdown } from 'tbss-ts-lib/docs'`
 *
 * 概述/考刻/取数表说明三篇综述（本库编写，出处见各篇文末）。篇目轻量同步；
 * 正文懒加载，`getDocMarkdown` 异步 —— 与姊妹库典籍抽屉同形，宿主阅读器组件可直接复用。
 */
import manifestData from './data/method-docs.json';
import { foldIncludes } from './normalize';
import type { MethodDocMeta } from './types';

export type { MethodDocMeta } from './types';

const manifest = (manifestData as unknown as { manifest: MethodDocMeta[] }).manifest;

let bodies: Record<string, string> | undefined;

/** 方法文献篇目（轻量，同步） */
export function getMethodDocs(): MethodDocMeta[] {
  return manifest;
}

/** 取某篇 markdown 正文（异步：首次拉取载荷并缓存） */
export async function getDocMarkdown(slug: string): Promise<string | undefined> {
  if (!bodies) {
    bodies = ((await import('./chunks/method-docs')).payload as { docs: Record<string, string> }).docs;
  }
  return bodies[slug];
}

/** 篇目检索（标题/摘要，繁简折叠；同步，不触发载荷加载） */
export function searchMethodDocs(query: string): MethodDocMeta[] {
  if (!query.trim()) return [];
  return manifest.filter((m) => foldIncludes(`${m.title} ${m.summary}`, query));
}
