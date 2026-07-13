/**
 * 提示词/引用工具 —— `import { citeVerse, buildVerseContext } from 'tbss-ts-lib/prompt'`
 *
 * 面向宿主 AI 场景（RAG 上下文组装）：把条文包装成带出处与保真度声明的提示块，
 * 避免社区转录被误当校勘定本引用。纯函数，无载荷依赖。
 */
import { FIDELITY_NOTE } from './registry';
import type { AnnotatedVerse, Verse } from './types';

/** 条文出处行：《铁板神数》子集 第1001条（年龄注记 47） */
export function citeVerse(v: Verse): string {
  const ages = v.ages.length ? `（年龄注记 ${v.ages.join('、')}）` : '';
  return `《铁板神数》${v.volume} 第${v.n}条${ages}`;
}

/** 注解精选出处行 */
export function citeAnnotated(a: AnnotatedVerse): string {
  return `《铁板神数》陈明点校本节录 卷${a.juan}·${a.tiao}「${a.title}」（今注，第三方整理）`;
}

/** 条文集 → 提示块（尾注保真度声明；超限截断） */
export function buildVerseContext(verses: Verse[], opts?: { maxChars?: number }): string {
  const max = opts?.maxChars ?? 4000;
  let out = '';
  for (const v of verses) {
    const block = `【${citeVerse(v)}】${v.text}\n`;
    if (out.length + block.length > max) break;
    out += block;
  }
  return out ? `${out}—— ${FIDELITY_NOTE}` : '';
}
