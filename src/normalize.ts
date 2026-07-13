/**
 * 检索归一化：繁→简折叠 + 去空白句读 + 拉丁小写。
 *
 * 折叠表由生成管线自语料实际用字导出（data/fold.json，每项两字「繁简」），
 * 保证「窮奇/穷奇」「鳳凰/凤凰」等繁简混写皆可命中。
 */
import foldPairsRaw from './data/fold.json';

const T2S = new Map<string, string>();
for (const pair of foldPairsRaw as string[]) {
  const chars = Array.from(pair);
  if (chars.length !== 2) continue;
  const [t, s] = chars;
  if (t !== s && !T2S.has(t)) T2S.set(t, s);
}

const PUNCT_RE =
  /[\s　。，、；：？！「」『』（）()《》〈〉«»·．.\-—–_,;:?!'"‘’“”[\]{}…‧]/g;

/** 检索折叠：去空白句读 + 小写 + 语料繁体→简体 */
export function fold(input: string): string {
  let out = '';
  for (const ch of String(input ?? '').replace(PUNCT_RE, '').toLowerCase()) {
    out += T2S.get(ch) ?? ch;
  }
  return out;
}

/** 折叠后包含判断 */
export function foldIncludes(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return fold(haystack).includes(fold(needle));
}
