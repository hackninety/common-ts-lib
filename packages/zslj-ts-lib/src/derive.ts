/**
 * 派生诸法：空亡（senji24）、王相死囚老（senji09/10）、日德财鬼（senji14~16）、
 * 十二客（senji20）、十二筹（senji21）、行年（senji23）、天马（2632 注）、氣類物（2601）
 */
import {
  GAN_WUXING, ZHI_WUXING, ZHI, isYangZhi, ke, seasonOf, tables, wangShuai,
  xunOf, zhiAt, zhiIdx, yueJiangName,
} from './constants';
import type { DeriveResult, Gan, Season, Zhi } from './types';

export interface DeriveInput {
  dayGan: Gan;
  dayZhi: Zhi;
  yueJiang: Zhi;
  chu: Zhi;
  monthZhi?: Zhi;
  monthNo?: number;
  yearZhi?: Zhi;
  birthYearZhi?: Zhi;
  gender?: '男' | '女';
}

const KE_NAMES = ['一客', '二客', '三客'];
const CHOU_NAMES = ['一籌', '二籌', '三籌'];

export function buildDerive(input: DeriveInput): DeriveResult {
  const { dayGan, dayZhi, yueJiang, chu } = input;
  const xun = xunOf(dayGan, dayZhi);

  // 王相死囚老
  let season: Season | undefined;
  let riWangShuai: { state: string; color: string } | undefined;
  if (input.monthZhi) {
    season = seasonOf(input.monthZhi);
    riWangShuai = wangShuai(season, GAN_WUXING[dayGan]);
  }

  // 日德（senji14）、日财=我克之支（senji15）、日鬼=克我之支（senji16）
  const myWx = GAN_WUXING[dayGan];
  const riCai = ZHI.filter((z) => ke(myWx, ZHI_WUXING[z]));
  const riGui = ZHI.filter((z) => ke(ZHI_WUXING[z], myWx));
  const deGan = (tables.riDe.table as Record<string, string>)[dayGan] as Gan;

  // 十二客：自月将在序中之位顺走（senji20，从假令）
  const keSeq = tables.keXu12.seq as Zhi[];
  const kStart = keSeq.indexOf(yueJiang);
  const ke12 = KE_NAMES.map((name, i) => ({ name, zhi: keSeq[(kStart + i) % 12] }));

  // 十二筹：自发用在序中之位，阴神顺走、阳神逆走（senji21，从假令）
  const chouSeq = tables.chou12.seq as Zhi[];
  const cStart = chouSeq.indexOf(chu);
  const cDir = isYangZhi(chu) ? -1 : 1;
  const chou12 = CHOU_NAMES.map((name, i) => ({ name, zhi: chouSeq[((cStart + cDir * i) % 12 + 12) % 12] }));

  // 天马（2632 注：正月午起，隔位顺行，六月而周）
  const tianMa = input.monthNo ? (tables.tianMa.cycle as Zhi[])[(input.monthNo - 1) % 6] : undefined;

  // 行年（senji23）：男本命加大歲功曹下；女大歲加本命傳送下
  let xingNian: Zhi | undefined;
  if (input.birthYearZhi && input.yearZhi && input.gender) {
    const ben = zhiIdx(input.birthYearZhi);
    const sui = zhiIdx(input.yearZhi);
    xingNian = input.gender === '男' ? zhiAt(2 - ben + sui) : zhiAt(8 - sui + ben);
  }

  // 氣類物（2601）：以日干五行论初传属气/类/物
  const qlw = (tables.qiLeiWu.table as Record<string, { qi: string; lei: string[]; wu: string }>)[myWx];
  let qiLeiWu: DeriveResult['qiLeiWu'];
  if (chu === qlw.qi) qiLeiWu = { kind: '氣', worry: '氣憂父母' };
  else if (chu === qlw.wu) qiLeiWu = { kind: '物', worry: '物憂妻子及下人' };
  else if (qlw.lei.includes(chu)) qiLeiWu = { kind: '類', worry: '類憂兄弟及己身' };

  return {
    xun: xun.xunShou,
    kongWang: xun.kong,
    season,
    riWangShuai,
    riDe: { gan: deGan, note: deGan === dayGan ? '德自處' : `德在${deGan}` },
    riCai,
    riGui,
    ke12,
    chou12,
    tianMa,
    xingNian,
    qiLeiWu,
  };
}

export { yueJiangName };
