/**
 * 历法层 —— tyme4ts 封装
 *
 * 干支四柱取自 SixtyCycleHour（八字标准：年以立春、月以节、日界 23:00 起子时）。
 * 月将两种模式：
 *   zhongqi（默认）：太阳过宫，最近一个中气对应之将（补注01「月將者，太陽宮也」）
 *   yuejian：按月建六合取将（senji05 字面：正月徵明…十二月神后），复现古书课例用
 */
import { SolarTime } from 'tyme4ts';
import { zhiAt, zhiIdx } from './constants';
import type { Gan, Zhi } from './types';

export type YueJiangMode = 'zhongqi' | 'yuejian';

export interface CalendarInfo {
  solar: string;
  bazi: string;
  yearGan: Gan;
  yearZhi: Zhi;
  monthZhi: Zhi;
  /** 月序（建寅为正月） */
  monthNo: number;
  dayGan: Gan;
  dayZhi: Zhi;
  hourZhi: Zhi;
  yueJiang: Zhi;
  yueJiangMode: YueJiangMode;
  /** 命中的中气名（zhongqi 模式） */
  zhongQi?: string;
}

/** 中气 → 月将（太阳过宫） */
const ZHONGQI_JIANG: Record<string, Zhi> = {
  雨水: '亥', 春分: '戌', 谷雨: '酉', 小满: '申', 夏至: '未', 大暑: '午',
  处暑: '巳', 秋分: '辰', 霜降: '卯', 小雪: '寅', 冬至: '丑', 大寒: '子',
};

export function calendarFromDate(date: Date, mode: YueJiangMode = 'zhongqi'): CalendarInfo {
  const st = SolarTime.fromYmdHms(
    date.getFullYear(), date.getMonth() + 1, date.getDate(),
    date.getHours(), date.getMinutes(), date.getSeconds(),
  );
  const sch = st.getSixtyCycleHour();
  const year = sch.getYear();
  const month = sch.getMonth();
  const day = sch.getDay();
  const hour = sch.getSixtyCycle();

  const monthZhi = month.getEarthBranch().getName() as Zhi;
  const monthNo = ((zhiIdx(monthZhi) - 2 + 12) % 12) + 1;

  let yueJiang: Zhi;
  let zhongQi: string | undefined;
  if (mode === 'yuejian') {
    // 月建六合即其月之将：寅→亥、卯→戌 …（与 senji05 十二月将表一致）
    yueJiang = zhiAt(13 - zhiIdx(monthZhi));
  } else {
    // 回溯最近一个中气
    let term = st.getTerm();
    while (term.isJie()) term = term.next(-1);
    zhongQi = term.getName();
    yueJiang = ZHONGQI_JIANG[zhongQi];
    if (!yueJiang) throw new Error(`未知中气：${zhongQi}`);
  }

  return {
    solar: st.toString(),
    bazi: `${year.getName()} ${month.getName()} ${day.getName()} ${hour.getName()}`,
    yearGan: year.getHeavenStem().getName() as Gan,
    yearZhi: year.getEarthBranch().getName() as Zhi,
    monthZhi,
    monthNo,
    dayGan: day.getHeavenStem().getName() as Gan,
    dayZhi: day.getEarthBranch().getName() as Zhi,
    hourZhi: hour.getEarthBranch().getName() as Zhi,
    yueJiang,
    yueJiangMode: mode,
    zhongQi,
  };
}
