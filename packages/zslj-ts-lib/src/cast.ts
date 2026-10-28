/**
 * 占事略決古法引擎 —— 总装配
 *
 * cast(params)        以干支参数起课（假令课例/四柱直输）
 * castByDate(date)    以公历时刻起课（tyme4ts 历法）
 */
import { EightChar } from 'tyme4ts';
import { calendarFromDate, type YueJiangMode } from './calendar';
import { GAN, ZHI, dunGan, isGangGan, jiGong, jiangInfo, liuQin, seasonOf, wangShuai, yueJiangName, ZHI_WUXING } from './constants';
import { buildDerive } from './derive';
import { detectGua } from './gua36';
import { buildSanChuan } from './sanchuan';
import { buildSiKe } from './sike';
import { buildTianJiang, dayNightOf } from './tianjiang';
import { buildTianPan } from './tianpan';
import { buildZhanDuan } from './zhanduan';
import type {
  CastParams, ChuanItem, Gan, GongInfo, ResolvedOptions, Zhi, ZsljChart, ZsljOptions,
} from './types';

export const ENGINE_VERSION = '0.1.0';

function resolveOptions(o?: ZsljOptions): ResolvedOptions {
  return { fuyinMo: o?.fuyinMo ?? 'chongOfChu' };
}

export function cast(params: CastParams): ZsljChart {
  const { dayGan, dayZhi, hourZhi, yueJiang } = params;
  const opts = resolveOptions(params.options);
  const dayNight = params.dayNight ?? dayNightOf(hourZhi);
  const gang = isGangGan(dayGan);
  const season = params.monthZhi ? seasonOf(params.monthZhi) : undefined;

  const pan = buildTianPan(yueJiang, hourZhi);
  const sike = buildSiKe(dayGan, dayZhi, pan);
  const scRaw = buildSanChuan(dayGan, dayZhi, pan, sike, opts);
  const tj = buildTianJiang(dayGan, dayNight, pan);

  // 四课贴天将
  sike.forEach((k) => { k.jiang = tj.atTian[k.shang]; });

  const mkChuan = (z: Zhi): ChuanItem => ({
    zhi: z,
    jiang: tj.atTian[z],
    dunGan: dunGan(dayGan, dayZhi, z),
    liuQin: liuQin(dayGan, z),
    wangShuai: season ? wangShuai(season, ZHI_WUXING[z]).state : undefined,
  });
  const sanchuan = {
    chu: mkChuan(scRaw.chu),
    zhong: mkChuan(scRaw.zhong),
    mo: mkChuan(scRaw.mo),
    method: scRaw.method,
    path: scRaw.path,
    singleChuan: scRaw.singleChuan,
  };

  const derive = buildDerive({
    dayGan, dayZhi, yueJiang, chu: scRaw.chu,
    monthZhi: params.monthZhi, monthNo: params.monthNo, yearZhi: params.yearZhi,
  });

  const ji = jiGong(dayGan);
  const gong: GongInfo[] = ZHI.map((z) => {
    const tianZhi = pan.tianAt(z);
    const jiang = tj.atSeat[z];
    const marks: string[] = [];
    if (z === ji) marks.push('日');
    if (z === dayZhi) marks.push('辰');
    return {
      diZhi: z,
      tianZhi,
      jiang,
      jiangLuck: (jiangInfo(jiang)?.luck ?? '吉') as '吉' | '凶',
      dunGan: dunGan(dayGan, dayZhi, tianZhi),
      isKong: derive.kongWang.includes(tianZhi),
      marks,
    };
  });

  const guaCtx = {
    dayGan, dayZhi, hourZhi, jiGongZhi: ji, pan, sike, sc: sanchuan, tj,
    season, monthNo: params.monthNo, tianMa: derive.tianMa,
  };
  const gua = detectGua(guaCtx);
  const zhanduan = buildZhanDuan({ dayGan, dayZhi, pan, sike, sc: sanchuan, tj, season, monthNo: params.monthNo });

  const refs = [
    'senji01', 'senji02', 'senji03', 'senji04', 'senji05', 'senji08', 'senji24',
    ...(season ? ['senji09', 'senji10'] : []),
    'senji26', ...gua.map((g) => g.id),
    ...zhanduan.map((z) => z.ref),
  ];

  return {
    meta: { engine: 'zslj', school: '占事略決古法', version: ENGINE_VERSION, options: opts },
    input: {
      dayGanZhi: `${dayGan}${dayZhi}`,
      hourZhi,
      yueJiang,
      yueJiangName: yueJiangName(yueJiang),
      dayNight,
      gangRou: gang ? '罡日' : '柔日',
      monthZhi: params.monthZhi,
      monthNo: params.monthNo,
      yearZhi: params.yearZhi,
    },
    gong,
    sike,
    sanchuan,
    tianjiang: { guiZhi: tj.guiZhi, seat: tj.seat, direction: tj.direction },
    gua,
    derive,
    zhanduan,
    refs: [...new Set(refs)],
  };
}

export interface CastByDateExtra {
  yueJiangMode?: YueJiangMode;
  options?: ZsljOptions;
  birthYear?: number;
  gender?: '男' | '女';
}

/**
 * 四柱直输起课：以 tyme4ts EightChar 反推公历时刻（取区间内首个匹配时刻）。
 * 注意同一月柱内可能跨中气换将，反推结果以该时刻的月将为准。
 */
export function castBySiZhu(
  year: string, month: string, day: string, hour: string,
  extra?: CastByDateExtra & { startYear?: number; endYear?: number },
): ZsljChart {
  const times = new EightChar(year, month, day, hour).getSolarTimes(
    extra?.startYear ?? 1900, extra?.endYear ?? 2100,
  );
  if (times.length === 0) {
    throw new Error(`四柱「${year} ${month} ${day} ${hour}」在范围内无对应公历时刻，请检查干支`);
  }
  const t = times[0];
  const date = new Date(t.getYear(), t.getMonth() - 1, t.getDay(), t.getHour(), t.getMinute(), t.getSecond());
  return castByDate(date, extra);
}

export function castByDate(date: Date, extra?: CastByDateExtra): ZsljChart {
  const cal = calendarFromDate(date, extra?.yueJiangMode ?? 'zhongqi');
  const chart = cast({
    dayGan: cal.dayGan,
    dayZhi: cal.dayZhi,
    hourZhi: cal.hourZhi,
    yueJiang: cal.yueJiang,
    monthZhi: cal.monthZhi,
    monthNo: cal.monthNo,
    yearZhi: cal.yearZhi,
    options: extra?.options,
  });
  chart.input.solar = cal.solar;
  chart.input.bazi = cal.bazi;
  // 行年（senji23）：需出生年支
  if (extra?.birthYear && extra.gender) {
    const birthZhi = ZHI[(((extra.birthYear - 4) % 12) + 12) % 12];
    const withXn = buildDerive({
      dayGan: cal.dayGan, dayZhi: cal.dayZhi, yueJiang: cal.yueJiang,
      chu: chart.sanchuan.chu.zhi, monthZhi: cal.monthZhi, monthNo: cal.monthNo,
      yearZhi: cal.yearZhi, birthYearZhi: birthZhi, gender: extra.gender,
    });
    chart.derive = withXn;
    chart.refs = [...new Set([...chart.refs, 'senji23'])];
  }
  return chart;
}

export type { CastParams, ZsljChart, ZsljOptions } from './types';
export { GAN, ZHI };
export { methodDescription } from './sanchuan';
export { guaText } from './gua36';
export type { Gan };
