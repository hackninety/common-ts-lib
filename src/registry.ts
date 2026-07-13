/** 注册表：十八卷卷目 + 语料统计（全部同步、轻量） */
import chaptersRaw from './data/text-index.json';
import statsRaw from './data/stats.json';
import type { ChapterInfo, CorpusStats, LocationConfidence } from './types';

const chapters = chaptersRaw as ChapterInfo[];

/** 十八卷卷目（按卷序） */
export function getChapters(): ChapterInfo[] {
  return chapters;
}

/** 单卷卷目 */
export function getChapterInfo(id: string): ChapterInfo | undefined {
  return chapters.find((c) => c.id === id);
}

/** 按分组（五臧山经/海外经/海内经/大荒经）列卷 */
export function getChapterGroups(): { group: string; chapters: ChapterInfo[] }[] {
  const out: { group: string; chapters: ChapterInfo[] }[] = [];
  for (const c of chapters) {
    let g = out.find((x) => x.group === c.group);
    if (!g) {
      g = { group: c.group, chapters: [] };
      out.push(g);
    }
    g.chapters.push(c);
  }
  return out;
}

/** 语料统计 */
export function getCorpusStats(): CorpusStats {
  return statsRaw as CorpusStats;
}

/** 地望置信度中文标签（宿主图例可直接用） */
export const CONFIDENCE_LABELS: Record<LocationConfidence, string> = {
  identified: '今地较可考',
  disputed: '诸说取其一',
  legendary: '神话示意位',
};

/** 数据免责声明（建议在宿主「关于」处展示） */
export const DISCLAIMER =
  '《山海经》为先秦志怪地理书，所载山川方国多不可确考。本库坐标仅为可视化示意：' +
  'identified 取较通行的今地考据，disputed 于诸说中取常见一说，legendary 为按经文方位排布的神话示意位，均不构成学术结论。';
