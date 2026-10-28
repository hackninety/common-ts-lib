/**
 * 占断助手 —— 占类各章（senji25、senji27~36）中机器可判的部分。
 * 结论行皆为「盘面事实 + 原文规则」的直接应用，供 UI 展示与 AI 引用；
 * 全文断语仍以典籍原文为准。
 */
import { GAN, ZHI_WUXING, GAN_WUXING, ke, mengZhongJi, sheng, tables, zhiIdx } from './constants';
import type { TianPan } from './tianpan';
import type { TianJiangResult } from './tianjiang';
import type { Gan, KeItem, SanChuanResult, Season, Zhi, ZhanDuanItem } from './types';

export interface ZhanCtx {
  dayGan: Gan;
  dayZhi: Zhi;
  pan: TianPan;
  sike: KeItem[];
  sc: SanChuanResult;
  tj: TianJiangResult;
  season?: Season;
  monthNo?: number;
}

/** 天将所临地盘支 */
function seatOfJiang(tj: TianJiangResult, name: string): Zhi {
  return (Object.keys(tj.atSeat) as Zhi[]).find((z) => tj.atSeat[z] === name)!;
}
/** 天将所乘天盘神 */
function shenOfJiang(pan: TianPan, tj: TianJiangResult, name: string): Zhi {
  return pan.tianAt(seatOfJiang(tj, name));
}

const MZJ_ZHI = (z: Zhi) => mengZhongJi(z);

export function buildZhanDuan(c: ZhanCtx): ZhanDuanItem[] {
  const out: ZhanDuanItem[] = [];
  const { pan, tj, sc } = c;
  const chu = sc.chu.zhi;

  // ---- 廿五 知吉凶期法 ----
  {
    const heKuiSeat = pan.seatOf('戌'); // 河魁所加
    const shu = (tables.ganZhiShu.zhi as Record<string, number>)[heKuiSeat];
    const days = 5 * shu;
    const v: string[] = [`河魁加${heKuiSeat}，五、${shu}相乘，以${days}日内为期`];
    const jianYue = ((zhiIdx(chu) - 2 + 12) % 12) + 1;
    const jiangYue = tables.yueJiang12.list.find((m) => m.zhi === chu)?.month;
    v.push(`月期：用神${chu}，月建所主${jianYue}月${jiangYue ? `、将所主${jiangYue}月` : ''}`);
    const myWx = GAN_WUXING[c.dayGan];
    const shan = GAN.filter((g) => sheng(GAN_WUXING[g], myWx) || sheng(myWx, GAN_WUXING[g]));
    const you = GAN.filter((g) => ke(GAN_WUXING[g], myWx));
    v.push(`善期：${shan.join('、')}日；忧期：${you.join('、')}日`);
    out.push({ ref: 'senji25', title: '知吉凶期法', verdicts: v });
  }

  // ---- 廿七 占病祟法 ----
  {
    const v: string[] = [];
    const chuWx = ZHI_WUXING[chu];
    const jiangHome = tables.tianJiang12.list.find((j) => j.name === sc.chu.jiang)?.home as Zhi | undefined;
    if (jiangHome && ZHI_WUXING[jiangHome] === chuWx) {
      const deity: Record<string, string> = { 木: '社神', 火: '竈神', 土: '土公及大歲神', 金: '道路神', 水: '水神' };
      v.push(`用（${chu}）将（${sc.chu.jiang}）俱${chuWx}，主${deity[chuWx]}`);
    }
    const shenZhu: Record<string, string> = {
      寅: '氏神（功曹，又主风病）', 卯: '氏神（大衝）／北辰', 巳: '竈神（太一）／詛咒・毒藥・佛法', 午: '竈神（勝先）',
      申: '儛神・馬嗣神（傳送）／形象', 酉: '儛神・馬嗣神（從魁）／詛咒', 亥: '北辰（徵明）', 子: '北辰（神后）／詛咒',
      辰: '北辰・水邊土公（天罡）', 未: '門背土公及廚膳（小吉）', 戌: '竈土及兵墓土公（河魁）', 丑: '山神・大歲土公・小澤土公（大吉）',
    };
    if (shenZhu[chu]) v.push(`用神${chu}：主${shenZhu[chu]}`);
    const jiangZhu: Record<string, string> = {
      腾虵: '竈神、客死鬼', 朱雀: '竈神及詛咒、惡鬼', 六合: '束縛死鬼、求食鬼', 勾陣: '土公、廢竈神',
      青龍: '社神及風病、宿食物誤', 天后: '母鬼及水上神', 大陰: '廁鬼', 玄武: '溺死鬼、乳死鬼',
      大裳: '丈人（或云父母靈氣）', 白虎: '兵死鬼、道路鬼', 天空: '無後鬼',
    };
    if (jiangZhu[sc.chu.jiang]) v.push(`初传乘${sc.chu.jiang}：主${jiangZhu[sc.chu.jiang]}`);
    out.push({ ref: 'senji27', title: '占病祟法', verdicts: v });
  }

  // ---- 廿八 占病死生法 ----
  {
    const hu = shenOfJiang(pan, tj, '白虎');
    const huSeat = seatOfJiang(tj, '白虎');
    const v = [`白虎乘${hu}临${huSeat}`];
    if (ke(ZHI_WUXING[hu], GAN_WUXING[c.dayGan])) v.push('白虎克日，病重（「白虎剋日重」）');
    else if (ke(GAN_WUXING[c.dayGan], ZHI_WUXING[hu])) v.push('日克白虎，病轻（「日剋白虎輕」）');
    if ((['丑', '未', '戌', '酉', '亥'] as Zhi[]).includes(hu)) {
      v.push('大吉/小吉/天魁/從魁/徵明与白虎并，慎之（「加病者行年及日辰皆死」）');
    }
    out.push({ ref: 'senji28', title: '占病死生法', verdicts: v });
  }

  // ---- 廿九 占產期法 ----
  {
    const shengXianSeat = pan.seatOf('午');
    const kuiSeat = pan.seatOf('戌');
    const gangSeat = pan.seatOf('辰');
    out.push({
      ref: 'senji29', title: '占產期法',
      verdicts: [
        `勝先（午）临${shengXianSeat}，随勝先所在为产时`,
        `魁（戌）加${kuiSeat}、罡（辰）加${gangSeat}，视魁罡所加为生月`,
      ],
    });
  }

  // ---- 三十 占產男女法 ----
  {
    const v: string[] = [];
    const chuKe = c.sike.find((k) => k.shang === chu)?.relation;
    if (chuKe === '上剋下') v.push('用在上克下，男');
    if (chuKe === '下賊上') v.push('用在下贼上，女');
    const guiMzj = MZJ_ZHI(tj.seat);
    v.push(`天一加${guiMzj}，${guiMzj === '孟' ? '男' : '女'}`);
    if (['青龍', '大裳'].includes(sc.chu.jiang)) v.push(`用得${sc.chu.jiang}，男`);
    if (['天后', '大陰', '腾虵'].includes(sc.chu.jiang)) v.push(`用得${sc.chu.jiang}，女`);
    out.push({ ref: 'senji30', title: '占產男女法', verdicts: v });
  }

  // ---- 卅一 占待人法 ----
  {
    const v: string[] = [];
    const gangSeat = pan.seatOf('辰');
    const ganDay: Record<string, string> = { 子: '庚', 午: '庚', 丑: '辛', 未: '辛', 寅: '戊', 申: '戊', 卯: '己', 酉: '己', 辰: '丙', 戌: '丙', 巳: '丁', 亥: '丁' };
    v.push(`天罡加${gangSeat}，以${ganDay[gangSeat]}日至（『集』）`);
    if (c.season) {
      const youKey = c.season === '季夏' ? '夏' : c.season;
      const you = (tables.youShen.table as Record<string, string>)[youKey] as Zhi;
      const ySeat = pan.seatOf(you);
      const m = MZJ_ZHI(ySeat);
      v.push(`游神（${c.season}${tables.yueJiang12.list.find((x) => x.zhi === you)?.name}）临${ySeat}，加${m}${m === '孟' ? '为始发' : m === '仲' ? '半道' : '既至'}`);
    }
    out.push({ ref: 'senji31', title: '占待人法', verdicts: v });
  }

  // ---- 卅二 占盜失物得否法 ----
  {
    const v: string[] = [];
    const gangSeat = pan.seatOf('辰');
    const m = MZJ_ZHI(gangSeat);
    v.push(`天罡加${m}：${m === '孟' ? '内人男子未出，可得' : m === '仲' ? '男女共取得' : '外女取，出不可得'}（『集靈』）`);
    const xuanShen = shenOfJiang(pan, tj, '玄武');
    const riShang = c.sike[0].shang;
    const chenShang = c.sike[2].shang;
    if (ke(ZHI_WUXING[riShang], ZHI_WUXING[xuanShen]) || ke(ZHI_WUXING[chenShang], ZHI_WUXING[xuanShen])) {
      v.push(`日辰上神制玄武（乘${xuanShen}），失物可得`);
    }
    if (ke(ZHI_WUXING[c.sike[3].shang], ZHI_WUXING[c.sike[0].shang])) {
      v.push('辰之阴神来克日之阳神，所失物得');
    }
    out.push({ ref: 'senji32', title: '占盜失物得否法', verdicts: v });
  }

  // ---- 卅三 占六畜迯亡法 ----
  {
    const v: string[] = [];
    const she = shenOfJiang(pan, tj, '腾虵');
    const xuan = shenOfJiang(pan, tj, '玄武');
    const riShang = c.sike[0].shang;
    const chenShang = c.sike[2].shang;
    const zhi = (t: Zhi) => ke(ZHI_WUXING[riShang], ZHI_WUXING[t]) || ke(ZHI_WUXING[chenShang], ZHI_WUXING[t]);
    v.push(`腾虵乘${she}、玄武乘${xuan}，日辰上神${zhi(she) && zhi(xuan) ? '能制' : '不制'}之`);
    const gangSeat = pan.seatOf('辰');
    const m = MZJ_ZHI(gangSeat);
    v.push(`魁罡加${m}：${m === '孟' ? '得' : m === '仲' ? '半得' : '不得'}`);
    out.push({ ref: 'senji33', title: '占六畜迯亡法', verdicts: v });
  }

  // ---- 卅四 占聞事信否法 ----
  if (c.season) {
    const key = c.season === '季夏' ? '夏' : c.season;
    const da = (tables.daShen.table as Record<string, string>)[key] as Zhi;
    const seat = pan.seatOf(da);
    const m = MZJ_ZHI(seat);
    out.push({
      ref: 'senji34', title: '占聞事信否法',
      verdicts: [`大神（${key}${tables.yueJiang12.list.find((x) => x.zhi === da)?.name}）临${seat}，加${m}：${m === '孟' ? '不可信' : m === '仲' ? '半可信' : '可信'}`],
    });
  }

  // ---- 卅五 占有雨否法 ----
  {
    const riShang = c.sike[0].shang;
    const chenShang = c.sike[2].shang;
    const v: string[] = [];
    const rainSet: Zhi[] = ['子', '亥', '卯'];
    if (rainSet.includes(riShang) || rainSet.includes(chenShang)) v.push('日辰上见神后/徵明/大衝，有雨');
    const cls = (z: Zhi) => (['亥', '子'].includes(z) ? '有雨' : ['寅', '卯'].includes(z) ? '多风小雨' : ['巳', '午'].includes(z) ? '无雨' : ['申', '酉'].includes(z) ? '连阴雨少' : null);
    const r1 = cls(riShang);
    if (r1) v.push(`日上神${riShang}：${r1}`);
    const r2 = cls(chenShang);
    if (r2) v.push(`辰上神${chenShang}：${r2}`);
    out.push({ ref: 'senji35', title: '占有雨否法', verdicts: v });
  }

  // ---- 卅六 占晴法 ----
  {
    const v: string[] = [];
    if (tj.atTian['寅'] === '青龍') v.push('功曹为青龙，晴');
    if (tj.atTian['申'] === '白虎') v.push('传送为白虎，晴');
    const kuiSeat = pan.seatOf('戌');
    const m = MZJ_ZHI(kuiSeat);
    v.push(`河魁临${m}：${m === '孟' ? '不晴' : m === '仲' ? '雨止' : '立止'}`);
    out.push({ ref: 'senji36', title: '占晴法', verdicts: v });
  }

  return out;
}
