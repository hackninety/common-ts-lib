/**
 * 干支五行基础关系 + 《占事略決》数据表访问
 *
 * 通例（生克冲孟仲季）为诸术共法；书中特有表（寄宫/贵人/刑/德/客筹序等）
 * 一律取自 docs/book/json/tables.json，保持「数据即文献」。
 */
import tables from './data/tables.json';
import { GAN, ZHI, type Gan, type Zhi, type WuXing, type Season } from './types';

export { tables };
export { GAN, ZHI };

export const ganIdx = (g: Gan): number => GAN.indexOf(g);
export const zhiIdx = (z: Zhi): number => ZHI.indexOf(z);
export const zhiAt = (i: number): Zhi => ZHI[((i % 12) + 12) % 12];

export const GAN_WUXING: Record<Gan, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
export const ZHI_WUXING: Record<Zhi, WuXing> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/** 五行相克（senji11）：木土水火金木 */
const KE_NEXT: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
/** 五行相生（senji11） */
const SHENG_NEXT: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

export const ke = (a: WuXing, b: WuXing): boolean => KE_NEXT[a] === b;
export const sheng = (a: WuXing, b: WuXing): boolean => SHENG_NEXT[a] === b;

/** 罡日（阳干日，senji06） */
export const isGangGan = (g: Gan): boolean => ganIdx(g) % 2 === 0;
/** 阳支（senji07：子寅辰午申戌为阳/罡支） */
export const isYangZhi = (z: Zhi): boolean => zhiIdx(z) % 2 === 0;

/** 支冲（对冲） */
export const chong = (z: Zhi): Zhi => zhiAt(zhiIdx(z) + 6);
/** 支刑（senji12，含辰午酉亥自刑） */
export const xing = (z: Zhi): Zhi => (tables.xing.table as Record<string, string>)[z] as Zhi;

/** 孟仲季：孟=寅申巳亥、仲=子午卯酉、季=辰戌丑未（senji02 第三） */
export type MZJ = '孟' | '仲' | '季';
export const mengZhongJi = (z: Zhi): MZJ => {
  const i = zhiIdx(z) % 3;
  return i === 2 ? '孟' : i === 0 ? '仲' : '季';
};
/** 涉害深浅：加孟为深(3)、加仲为半(2)、加季为浅(1) */
export const sheHaiDepth = (seat: Zhi): number => ({ 孟: 3, 仲: 2, 季: 1 })[mengZhongJi(seat)];

/** 日干寄宫（senji08 課干支法） */
export const jiGong = (g: Gan): Zhi => (tables.jiGong.table as Record<string, string>)[g] as Zhi;

/** 六十甲子序（甲子=0）：x ≡ 干 (mod 10)，x ≡ 支 (mod 12) */
export const cycleIdx = (g: Gan, z: Zhi): number => (((6 * ganIdx(g) - 5 * zhiIdx(z)) % 60) + 60) % 60;

/** 旬首与旬空（senji24 空亡法） */
export function xunOf(g: Gan, z: Zhi): { xunShou: string; xunShouZhi: number; kong: [Zhi, Zhi] } {
  const idx = cycleIdx(g, z);
  const s = idx - (idx % 10);
  const sz = s % 12;
  return {
    xunShou: `${GAN[s % 10]}${ZHI[sz]}`,
    xunShouZhi: sz,
    kong: [zhiAt(sz + 10), zhiAt(sz + 11)],
  };
}

/** 旬遁干：支在本旬内则得遁干，旬空之支无遁 */
export function dunGan(dayGan: Gan, dayZhi: Zhi, target: Zhi): Gan | undefined {
  const { xunShouZhi } = xunOf(dayGan, dayZhi);
  const pos = ((zhiIdx(target) - xunShouZhi) % 12 + 12) % 12;
  return pos < 10 ? GAN[pos] : undefined;
}

/** 月将名（senji05） */
export function yueJiangName(z: Zhi): string {
  const hit = tables.yueJiang12.list.find((m) => m.zhi === z);
  return hit ? hit.name : z;
}

/** 月建支 → 季节（补注08：春寅卯辰、夏巳午、季夏未、秋申酉戌、冬亥子丑） */
export function seasonOf(monthZhi: Zhi): Season {
  if (['寅', '卯', '辰'].includes(monthZhi)) return '春';
  if (['巳', '午'].includes(monthZhi)) return '夏';
  if (monthZhi === '未') return '季夏';
  if (['申', '酉', '戌'].includes(monthZhi)) return '秋';
  return '冬';
}

/** 王相死囚老（senji09）：返回某五行在该季的状态与原文色 */
export function wangShuai(season: Season, wx: WuXing): { state: string; color: string } {
  const s = (tables.wangXiang.seasons as Record<string, { states: string[]; colors: string[] }>)[season];
  const i = s.states.indexOf(wx);
  return { state: tables.wangXiang.stateNames[i], color: s.colors[i] };
}

/** 六亲（对日干，通行称谓，供参考展示与 AI） */
export function liuQin(dayGan: Gan, z: Zhi): string {
  const me = GAN_WUXING[dayGan];
  const it = ZHI_WUXING[z];
  if (me === it) return '兄弟';
  if (sheng(it, me)) return '父母';
  if (sheng(me, it)) return '子孫';
  if (ke(me, it)) return '妻財';
  return '官鬼';
}

/** 贵人表（senji03 天一治法） */
export function guiRenZhi(dayGan: Gan, dayNight: '旦' | '暮'): Zhi {
  const row = (tables.guiRen.table as Record<string, { dan: string; mu: string }>)[dayGan];
  return (dayNight === '旦' ? row.dan : row.mu) as Zhi;
}

/** 十二天将环序（顺布方向） */
export const JIANG_RING = tables.tianJiang12.ringOrder as string[];

export function jiangInfo(name: string) {
  return tables.tianJiang12.list.find((j) => j.name === name);
}
