/**
 * 通用排盘形状适配 —— 输出与 react-liuren「统一领域模型 LiuRenChart」结构兼容的对象，
 * 宿主项目的引擎适配器只需做一次浅转换（或直接结构化赋值）即可接入多流派框架。
 *
 * 本模块不依赖任何宿主类型（结构兼容靠字段形状约定）。
 */
import type { ZsljChart } from './types';

export interface GenericShenShaEntry {
  name: string;
  value: string;
  description?: string;
}

export interface GenericLiuRenChart {
  meta: {
    engineId: string;
    engineName: string;
    school: string;
  };
  dateInfo: {
    bazi: string;
    ganZhiDate?: string;
    yueJiang: string;
    xun?: string;
    kongWang: string[];
    dayNight?: '昼' | '夜';
  };
  /** 十二宫（0=子 … 11=亥） */
  gong: {
    diZhi: string;
    tianZhi: string;
    tianJiang: string;
    dunGan?: string;
    extras?: Record<string, string>;
  }[];
  siKe: { name: string; shang: string; xia: string; tianJiang: string }[];
  sanChuan: {
    chu: GenericChuan;
    zhong: GenericChuan;
    mo: GenericChuan;
    /** 课体名：卅六卦确判命中，无则取法门名 */
    keTi: string;
    /** 取传法门（課用九法） */
    method?: string;
  };
  shenSha: GenericShenShaEntry[];
  extras: Record<string, unknown>;
  raw: unknown;
}

interface GenericChuan {
  zhi: string;
  tianJiang: string;
  liuQin?: string;
  dunGan?: string;
}

export function toGenericChart(chart: ZsljChart): GenericLiuRenChart {
  const d = chart.derive;
  const shenSha: GenericShenShaEntry[] = [
    { name: '貴人', value: `${chart.tianjiang.guiZhi}臨${chart.tianjiang.seat}${chart.tianjiang.direction}行`, description: '天一治法（senji03），旦暮界寅~酉' },
    { name: '旬空', value: d.kongWang.join(''), description: `${d.xun}旬` },
    { name: '日德', value: d.riDe.note, description: '日德法（senji14）' },
    { name: '日財', value: d.riCai.join(''), description: '日財法（senji15）' },
    { name: '日鬼', value: d.riGui.join(''), description: '日鬼法（senji16）' },
  ];
  if (d.tianMa) shenSha.push({ name: '天馬', value: d.tianMa, description: '高蓋駟馬卦注（2632）' });
  if (d.xingNian) shenSha.push({ name: '行年', value: d.xingNian, description: '知男女行年法（senji23）' });
  if (d.riWangShuai && d.season) {
    shenSha.push({ name: '王相', value: `${d.season}令日干${d.riWangShuai.state}氣`, description: '五行王相等法（senji09）' });
  }

  const exactGua = chart.gua.filter((g) => g.certainty === 'exact').map((g) => g.name);
  const mkChuan = (c: ZsljChart['sanchuan']['chu']): GenericChuan => ({
    zhi: c.zhi, tianJiang: c.jiang, liuQin: c.liuQin, dunGan: c.dunGan,
  });

  return {
    meta: { engineId: 'zslj', engineName: 'zslj-ts-lib', school: '占事略決古法' },
    dateInfo: {
      bazi: chart.input.bazi ?? '',
      ganZhiDate: chart.input.solar,
      yueJiang: chart.input.yueJiang,
      xun: d.xun,
      kongWang: [...d.kongWang],
      dayNight: chart.input.dayNight === '旦' ? '昼' : '夜',
    },
    gong: chart.gong.map((g) => ({
      diZhi: g.diZhi,
      tianZhi: g.tianZhi,
      tianJiang: g.jiang,
      dunGan: g.dunGan,
      extras: g.marks.length ? { marks: g.marks.join('·') } : undefined,
    })),
    siKe: chart.sike.map((k) => ({ name: k.name, shang: k.shang, xia: String(k.xia), tianJiang: k.jiang })),
    sanChuan: {
      chu: mkChuan(chart.sanchuan.chu),
      zhong: mkChuan(chart.sanchuan.zhong),
      mo: mkChuan(chart.sanchuan.mo),
      keTi: exactGua.length ? exactGua.join('·') : chart.sanchuan.method,
      method: chart.sanchuan.method,
    },
    shenSha,
    extras: {
      gua36: chart.gua,
      zhanduan: chart.zhanduan,
      path: chart.sanchuan.path,
      refs: chart.refs,
    },
    raw: chart,
  };
}
