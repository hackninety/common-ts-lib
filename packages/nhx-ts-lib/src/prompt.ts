/**
 * 提示词/引用工具 —— `import { citeDoc, buildDocContext } from 'nhx-ts-lib/prompt'`
 *
 * 面向宿主 AI 场景（RAG 上下文组装）：把语料片段包装成带出处与保真度声明的
 * 提示块，避免逐字稿/整理稿被误当倪师原文引用。纯函数，无载荷依赖。
 */
import { FIDELITY_LABELS } from './registry';
import type { CaseMeta, DocMeta, TranscriptHit } from './types';

/** 文档出处行：《书》组 · 题（保真度） */
export function citeDoc(meta: DocMeta): string {
  const d = meta.date ? ` ${meta.date}` : '';
  return `《${meta.book}》${meta.group} · ${meta.title}${d}（${FIDELITY_LABELS[meta.fidelity]}）`;
}

/** 医案出处行 */
export function citeCase(meta: CaseMeta): string {
  const d = meta.date ? ` ${meta.date}` : '';
  return `倪海厦医案 ${meta.group}/${meta.title}${d}`;
}

/** 逐字稿出处行 */
export function citeTranscript(hit: TranscriptHit): string {
  return `《${hit.bookTitle}》${hit.chapterTitle} 第${hit.para}段（视频逐字稿）`;
}

/** 单篇文档 → 提示块（截断保尾注出处） */
export function buildDocContext(meta: DocMeta, markdown: string, opts?: { maxChars?: number }): string {
  const max = opts?.maxChars ?? 4000;
  const body = markdown.length > max ? markdown.slice(0, max) + '\n…（截断）' : markdown;
  return `【出处】${citeDoc(meta)}\n${body}`;
}

/** 逐字稿命中集 → 提示块 */
export function buildTranscriptContext(hits: TranscriptHit[], opts?: { maxChars?: number }): string {
  const max = opts?.maxChars ?? 4000;
  let out = '';
  for (const h of hits) {
    const block = `【${citeTranscript(h)}】\n${h.text}\n\n`;
    if (out.length + block.length > max) break;
    out += block;
  }
  return out.trimEnd();
}
