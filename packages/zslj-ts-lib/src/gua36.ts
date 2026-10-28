/**
 * 卅六卦大例所主法（senji26，2601~2636）—— 课体判定器
 *
 * 一盘可命中多卦（原文「或一卦之下,管載數名」）。certainty：
 *   exact  条件完备可机判
 *   approx 文义有出入的近似判定（详见 docs/algorithm/textual-issues.md）
 *   info   总论性归类（氣類物/新故）
 * 无法机判的卦（如無婬）不在此列，仅在典籍面板展示原文。
 */
import gua36Data from './data/gua36.json';
import { GAN_WUXING, ZHI_WUXING, ke, tables, wangShuai } from './constants';
import type { TianPan } from './tianpan';
import type { TianJiangResult } from './tianjiang';
import type { Gan, GuaHit, KeItem, SanChuanResult, Season, Zhi } from './types';

export interface GuaCtx {
  dayGan: Gan;
  dayZhi: Zhi;
  hourZhi: Zhi;
  jiGongZhi: Zhi;
  pan: TianPan;
  sike: KeItem[];
  sc: SanChuanResult;
  tj: TianJiangResult;
  season?: Season;
  monthNo?: number;
  tianMa?: Zhi;
}

type Detector = (c: GuaCtx) => { hit: boolean; why: string; certainty: GuaHit['certainty'] } | null;

const ZHONG = ['子', '午', '卯', '酉'];
const MENG = ['寅', '申', '巳', '亥'];
const JI = ['辰', '戌', '丑', '未'];

const chuan3 = (c: GuaCtx): Zhi[] => [c.sc.chu.zhi, c.sc.zhong.zhi, c.sc.mo.zhi];
const allIn = (arr: Zhi[], set: string[]) => arr.every((z) => set.includes(z));
const JIU_CHOU_DAYS = ['戊子', '戊午', '壬子', '壬午', '乙卯', '乙酉', '己卯', '己酉', '辛卯', '辛酉'];

const detectors: Record<number, Detector> = {
  // 1 氣類物：所生为气、同位为类、所死为物（由 derive 层归类，此处按初传判定）
  1: (c) => {
    const t = (tables.qiLeiWu.table as Record<string, { qi: string; lei: string[]; wu: string }>)[GAN_WUXING[c.dayGan]];
    const chu = c.sc.chu.zhi;
    const kind = chu === t.qi ? '氣（憂父母）' : chu === t.wu ? '物（憂妻子及下人）' : t.lei.includes(chu) ? '類（憂兄弟及己身）' : null;
    return kind ? { hit: true, why: `日干${GAN_WUXING[c.dayGan]}，初传${chu}属${kind}`, certainty: 'info' } : null;
  },
  // 2 新故：罡日用在阳（日辰上神）为新、在阴（本位上神）为故；柔日之辨原文存疑，不判
  2: (c) => {
    if (!'甲丙戊庚壬'.includes(c.dayGan)) return null;
    const chu = c.sc.chu.zhi;
    const yang = [c.sike[0].shang, c.sike[2].shang];
    const yin = [c.sike[1].shang, c.sike[3].shang];
    if (!yang.includes(chu) && !yin.includes(chu)) return null;
    const isXin = yang.includes(chu);
    return { hit: true, why: `罡日用在${isXin ? '阳（日辰上神），为新' : '阴（本位上神），为故'}`, certainty: 'info' };
  },
  // 3 元首：一上克下为用
  3: (c) => {
    const zei = c.sike.filter((k) => k.relation === '下賊上');
    const keDown = c.sike.filter((k) => k.relation === '上剋下');
    const hit = zei.length === 0 && keDown.length > 0 && c.sc.method === '賊剋'
      && new Set(keDown.map((k) => `${k.shang}|${k.seat}`)).size === 1;
    return { hit, why: '四课唯一上克下发用', certainty: 'exact' };
  },
  // 4 重審：以下贼上为用
  4: (c) => {
    const zei = c.sike.filter((k) => k.relation === '下賊上');
    const hit = zei.length > 0 && c.sc.method === '賊剋' && new Set(zei.map((k) => `${k.shang}|${k.seat}`)).size === 1;
    return { hit, why: '下贼上发用（臣杀君之象，事宜再审）', certainty: 'exact' };
  },
  // 5 傍茹：涉害深者为用（含涉害俱等取先举）
  5: (c) => ({ hit: c.sc.method === '涉害' || c.sc.method === '先舉', why: '多克俱比/俱不比，以涉害深浅取用', certainty: 'exact' }),
  // 6 蒿矢：遥克为用
  6: (c) => ({ hit: c.sc.method === '遙剋', why: '四课无上下克，遥克发用（祸自外来之象）', certainty: 'exact' }),
  // 7 寅視（昴星）
  7: (c) => ({ hit: c.sc.method === '昴星', why: '无克无遥克，昴星发用', certainty: 'exact' }),
  // 8 伏吟
  8: (c) => ({ hit: c.pan.isFuYin, why: '天地伏吟，诸神各归其家', certainty: 'exact' }),
  // 9 反吟
  9: (c) => ({ hit: c.pan.isFanYin, why: '天地反吟，诸神反其位', certainty: 'exact' }),
  // 11 狡童逃女：用起天后，终六合/玄武
  11: (c) => ({
    hit: c.sc.chu.jiang === '天后' && ['六合', '玄武'].includes(c.sc.mo.jiang),
    why: `初传乘天后、末传乘${c.sc.mo.jiang}`,
    certainty: 'exact',
  }),
  // 12 惟薄不脩：八专日
  12: (c) => ({ hit: (tables.wuRouDays.days as string[]).includes(`${c.dayGan}${c.dayZhi}`), why: '一神二神阴阳共焉（八专日）', certainty: 'exact' }),
  // 13 三交：卯酉加日辰为用、日辰在四仲、传皆四仲
  13: (c) => {
    const condA = (['卯', '酉'] as Zhi[]).includes(c.sc.chu.zhi)
      && [c.jiGongZhi, c.dayZhi].includes(c.pan.seatOf(c.sc.chu.zhi));
    const condB = ZHONG.includes(c.dayZhi) && allIn(chuan3(c), ZHONG);
    return { hit: condA || condB, why: condA ? '大衝/從魁加日辰为用' : '日辰四仲且三传皆四仲', certainty: 'approx' };
  },
  // 14 亂首：日克辰用起辰上 / 辰克日用起日上
  14: (c) => {
    const g = GAN_WUXING[c.dayGan];
    const z = ZHI_WUXING[c.dayZhi];
    const a = ke(g, z) && c.sc.chu.zhi === c.sike[2].shang;
    const b = ke(z, g) && c.sc.chu.zhi === c.sike[0].shang;
    return { hit: a || b, why: a ? '日克辰而用起辰上' : '辰克日而用起日上（不可举兵）', certainty: 'exact' };
  },
  // 15 龍戰：卯酉日用起卯酉上
  15: (c) => ({
    hit: (['卯', '酉'] as Zhi[]).includes(c.dayZhi)
      && (c.sc.chu.zhi === c.pan.tianAt('卯') || c.sc.chu.zhi === c.pan.tianAt('酉')),
    why: '卯酉日，用起二八门上（动摇不安之象）',
    certainty: 'approx',
  }),
  // 16 贅婿寓居：辰来加日而日往贼辰
  16: (c) => ({
    hit: c.pan.tianAt(c.jiGongZhi) === c.dayZhi && ke(GAN_WUXING[c.dayGan], ZHI_WUXING[c.dayZhi]),
    why: '日支加临日干寄宫，日往贼辰',
    certainty: 'exact',
  }),
  // 17 陰陽無親：反吟四课皆克 / 日辰上神皆为其阴所贼
  17: (c) => {
    const allKe = c.pan.isFanYin && c.sike.every((k) => k.relation !== null);
    const yinZei = ke(ZHI_WUXING[c.sike[1].shang], ZHI_WUXING[c.sike[0].shang])
      && ke(ZHI_WUXING[c.sike[3].shang], ZHI_WUXING[c.sike[2].shang]);
    return { hit: allKe || yinZei, why: allKe ? '时遇反吟，四课皆克' : '日辰上神皆为其阴神所贼', certainty: 'approx' };
  },
  // 18 陞跎：天一立二八门（贵人临卯酉）
  18: (c) => ({ hit: (['卯', '酉'] as Zhi[]).includes(c.tj.seat), why: `贵人临地盘${c.tj.seat}（二八门），阴阳易位`, certainty: 'exact' }),
  // 19 玄胎四牝：用起四孟传终四孟
  19: (c) => ({ hit: allIn(chuan3(c), MENG), why: '三传皆四孟（玄胎，始含经计之象）', certainty: 'exact' }),
  // 20 聯茹：用起神与今日比（比用）
  20: (c) => ({ hit: c.sc.method === '比用', why: '以与日比者发用（又名知一）', certainty: 'exact' }),
  // 21~25 五行局
  21: (c) => ({ hit: allIn(chuan3(c), ['亥', '卯', '未']), why: '三传亥卯未木局', certainty: 'exact' }),
  22: (c) => ({ hit: allIn(chuan3(c), ['寅', '午', '戌']), why: '三传寅午戌火局', certainty: 'exact' }),
  23: (c) => ({ hit: allIn(chuan3(c), JI), why: '三传皆四季土', certainty: 'exact' }),
  24: (c) => ({ hit: allIn(chuan3(c), ['巳', '酉', '丑']), why: '三传巳酉丑金局', certainty: 'exact' }),
  25: (c) => ({ hit: allIn(chuan3(c), ['申', '子', '辰']), why: '三传申子辰水局', certainty: 'exact' }),
  // 26 九醜：从夹注日表（乙戊己辛壬 × 子午卯酉日）且时加四仲
  26: (c) => ({
    hit: JIU_CHOU_DAYS.includes(`${c.dayGan}${c.dayZhi}`) && ZHONG.includes(c.hourZhi),
    why: '九丑之日、四仲之时（不可举兵嫁娶远行）',
    certainty: 'approx',
  }),
  // 27 天網：时克其日，用又助之
  27: (c) => {
    const shiKeRi = ke(ZHI_WUXING[c.hourZhi], GAN_WUXING[c.dayGan]);
    const yongZhu = c.sc.chu.zhi === c.hourZhi || ZHI_WUXING[c.sc.chu.zhi] === ZHI_WUXING[c.hourZhi];
    return { hit: shiKeRi && yongZhu, why: '占时克日干而发用助之（天网四张）', certainty: 'approx' };
  },
  // 28 無祿：四课皆上克下
  28: (c) => ({ hit: c.sike.every((k) => k.relation === '上剋下'), why: '四课俱上克下', certainty: 'exact' }),
  // 29 絕紀：四课皆下贼上
  29: (c) => ({ hit: c.sike.every((k) => k.relation === '下賊上'), why: '四课俱下贼上', certainty: 'exact' }),
  // 30 五憤四殺：用传皆四季
  30: (c) => ({ hit: allIn(chuan3(c), JI), why: '用传皆得四季神', certainty: 'exact' }),
  // 31 三光三陽
  31: (c) => {
    if (!c.season) return null;
    const good = (s: string) => s === '王' || s === '相';
    const riOk = good(wangShuai(c.season, GAN_WUXING[c.dayGan]).state);
    const chenOk = good(wangShuai(c.season, ZHI_WUXING[c.dayZhi]).state);
    const yongOk = good(wangShuai(c.season, ZHI_WUXING[c.sc.chu.zhi]).state);
    const jiangOk = (tables.tianJiang12.list.find((j) => j.name === c.sc.chu.jiang)?.luck ?? '凶') === '吉';
    const hit = riOk && chenOk && yongOk && jiangOk;
    return { hit, why: '日辰王相、用神王相、又得吉将（三光具，百事无不成）', certainty: 'approx' };
  },
  // 32 高蓋駟馬：用起天马，传见车乘（卯），终于华盖（子）
  32: (c) => {
    if (!c.tianMa) return null;
    return {
      hit: c.sc.chu.zhi === c.tianMa && chuan3(c).includes('卯') && c.sc.mo.zhi === '子',
      why: `用起天马${c.tianMa}，传见车乘，终于华盖`,
      certainty: 'approx',
    };
  },
  // 33 斲輪織綬：用起车乘（卯），传见印绶（戌）
  33: (c) => ({ hit: c.sc.chu.zhi === '卯' && chuan3(c).includes('戌'), why: '用起车乘，传见印绶', certainty: 'approx' }),
  // 34 鑄印乘軒：用起太一（巳），传见河魁（戌），终大衝（卯）
  34: (c) => ({ hit: c.sc.chu.zhi === '巳' && chuan3(c).includes('戌') && c.sc.mo.zhi === '卯', why: '用起太一，传见河魁，终大衝', certainty: 'exact' }),
  // 35 斬關：魁罡与功曹并见三传
  35: (c) => {
    const t = chuan3(c);
    return { hit: (t.includes('辰') || t.includes('戌')) && t.includes('寅'), why: '魁罡发动而及功曹，越关梁之象', certainty: 'approx' };
  },
  // 36 天獄：用在囚死
  36: (c) => {
    if (!c.season) return null;
    const st = wangShuai(c.season, ZHI_WUXING[c.sc.chu.zhi]).state;
    return { hit: st === '囚' || st === '死', why: `初传${c.sc.chu.zhi}当令${st}气（忧系囚，吉将不能救）`, certainty: 'approx' };
  },
};

export function detectGua(ctx: GuaCtx): GuaHit[] {
  const hits: GuaHit[] = [];
  for (const g of gua36Data.guas) {
    const det = detectors[g.no];
    if (!det) continue;
    const r = det(ctx);
    if (r?.hit) {
      hits.push({ id: g.id, no: g.no, name: g.name, certainty: r.certainty, why: r.why });
    }
  }
  return hits;
}

/** 卦名/原文查询（UI 与 AI 用） */
export function guaText(id: string): { name: string; heading: string; text: string } | undefined {
  const g = gua36Data.guas.find((x) => x.id === id);
  return g ? { name: g.name, heading: g.heading, text: g.text } : undefined;
}
