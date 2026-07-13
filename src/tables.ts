/**
 * 取数表子入口 —— `import { getTables, EIGHT_QUARTERS } from 'tbss-ts-lib/tables'`
 *
 * 十四考十五张 CSV 以通用表格形态（columns + rows）同步导出（合计约 4800 行，
 * 入口级代码分割已足；宿主 `<Table>` 可直接渲染）。另附八刻细分、核心公式、
 * 太玄数等小型常量。字段语义详见方法文献 `tables` 篇（tbss-ts-lib/docs）。
 */
import tablesData from './data/tables.json';
import type { DataTable, QuarterInfo } from './types';

export type { DataTable, QuarterInfo } from './types';

const tables = (tablesData as unknown as { tables: DataTable[] }).tables;

/** 全部取数表（14-1 … 14-14，含 14-11 男女两表） */
export function getTables(): DataTable[] {
  return tables;
}

/** 按上游编号或语义 slug 取表（'14-10' 或 'innate'） */
export function getTable(idOrSlug: string): DataTable | undefined {
  return tables.find((t) => t.id === idOrSlug || t.slug === idOrSlug);
}

/** 八刻细分：一个时辰（2 小时）分八刻，各配天干与刻干数（考刻基础） */
export const EIGHT_QUARTERS: readonly QuarterInfo[] = [
  { name: '初刻', fromMinute: 0, toMinute: 15, stem: '甲', value: 1 },
  { name: '一刻', fromMinute: 15, toMinute: 30, stem: '乙', value: 2 },
  { name: '二刻', fromMinute: 30, toMinute: 45, stem: '丙', value: 3 },
  { name: '三刻', fromMinute: 45, toMinute: 60, stem: '丁', value: 4 },
  { name: '四刻', fromMinute: 60, toMinute: 75, stem: '戊', value: 5 },
  { name: '五刻', fromMinute: 75, toMinute: 90, stem: '己', value: 6 },
  { name: '六刻', fromMinute: 90, toMinute: 105, stem: '庚', value: 7 },
  { name: '正刻', fromMinute: 105, toMinute: 120, stem: '辛', value: 8 },
];

/** 时辰内分钟数（0–119）→ 刻 */
export function quarterOfMinute(minuteInHour: number): QuarterInfo | undefined {
  return EIGHT_QUARTERS.find((q) => minuteInHour >= q.fromMinute && minuteInHour < q.toMinute);
}

/** 铁板核心公式（文本常量，宿主展示用） */
export const CORE_FORMULA = '终局条文数 = 本命基数 + 刻干数 × 48';

/** 太玄数歌诀 */
export const TAIXUAN_RHYME =
  '甲己子午九，乙庚丑未八，丙辛寅申七，丁壬卯酉六，戊癸辰戌五，巳亥单四数。';

const TAIXUAN: Record<string, number> = {
  甲: 9, 己: 9, 子: 9, 午: 9,
  乙: 8, 庚: 8, 丑: 8, 未: 8,
  丙: 7, 辛: 7, 寅: 7, 申: 7,
  丁: 6, 壬: 6, 卯: 6, 酉: 6,
  戊: 5, 癸: 5, 辰: 5, 戌: 5,
  巳: 4, 亥: 4,
};

/** 单字干支 → 太玄数（非干支字返回 undefined） */
export function taixuanValue(char: string): number | undefined {
  return TAIXUAN[char];
}
