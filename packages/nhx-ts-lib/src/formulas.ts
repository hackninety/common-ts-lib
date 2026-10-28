/**
 * 方剂子入口 —— `import { getFormulas, getFormula, findFormulas } from 'nhx-ts-lib/formulas'`
 *
 * 索引（113 首经方：名称/出处/分类）同步内联；正文与人纪原文引用载荷懒加载。
 * 汉唐编号方（HT-1 白带丸等 104 首）在讲稿库 fangjie 分支（保真度 attributed）。
 */
import indexData from './data/formulas-index.json';
import { foldIncludes } from './normalize';
import type { EntryBody, FormulaMeta } from './types';

export type { FormulaMeta, EntryBody, SourceRef } from './types';

const index = (indexData as unknown as { formulas: FormulaMeta[] }).formulas;
let bodies: Record<string, EntryBody> | undefined;

async function loadBodies(): Promise<Record<string, EntryBody>> {
  if (!bodies) {
    const mod = await import('./chunks/formulas-bodies');
    bodies = (mod.payload as { bodies: Record<string, EntryBody> }).bodies;
  }
  return bodies;
}

/** 全部方剂索引（轻量，同步） */
export function getFormulas(): FormulaMeta[] {
  return index;
}

/** 按 id（拼音 slug）或方名取条目（含正文与引用；异步懒加载） */
export async function getFormula(idOrName: string): Promise<(FormulaMeta & EntryBody) | undefined> {
  const meta = index.find((f) => f.id === idOrName || f.name === idOrName)
    ?? index.find((f) => foldIncludes(f.name, idOrName) && f.name.length === idOrName.length);
  if (!meta) return undefined;
  const b = (await loadBodies())[meta.id];
  return { ...meta, md: b?.md ?? '', refs: b?.refs ?? [] };
}

/** 检索（方名/出处/分类，繁简折叠；同步） */
export function findFormulas(query: string, opts?: { limit?: number }): FormulaMeta[] {
  const limit = opts?.limit ?? 30;
  const out: FormulaMeta[] = [];
  for (const f of index) {
    if (foldIncludes(`${f.name} ${f.source ?? ''} ${f.category ?? ''}`, query)) {
      out.push(f);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** 按出处列举（如「伤寒论」「金匮要略」） */
export function getFormulasBySource(source: string): FormulaMeta[] {
  return index.filter((f) => f.source && foldIncludes(f.source, source));
}
