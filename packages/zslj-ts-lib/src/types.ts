/**
 * 占事略決古法引擎 —— 领域模型
 *
 * 规范：docs/book/senji-ryakketsu.md（安倍晴明《占事略決》三十六法）
 * 引擎为纯函数层，禁止依赖 UI；所有结果字段可溯源到原文锚点（refs）。
 */

export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export type Gan = (typeof GAN)[number];
export type Zhi = (typeof ZHI)[number];
export type WuXing = '木' | '火' | '土' | '金' | '水';
export type DayNight = '旦' | '暮';
export type Season = '春' | '夏' | '季夏' | '秋' | '冬';

/** 引擎选项（原文存疑处的读法开关，默认按字面最直接读法） */
export interface ZsljOptions {
  /**
   * 伏吟末传：'chongOfChu' = 用神之冲（「其刑神為二傳,其衝神為三傳」两个「其」皆指用神，默认）；
   * 'chongOfZhong' = 中传之冲（链式读法）
   */
  fuyinMo?: 'chongOfChu' | 'chongOfZhong';
}

export interface ResolvedOptions {
  fuyinMo: 'chongOfChu' | 'chongOfZhong';
}

/** 起课参数（与历法解耦：假令课例直接以参数起课） */
export interface CastParams {
  dayGan: Gan;
  dayZhi: Zhi;
  hourZhi: Zhi;
  /** 月将（支） */
  yueJiang: Zhi;
  /** 旦/暮；缺省按占时寅~酉为旦、戌~丑为暮（senji03） */
  dayNight?: DayNight;
  /** 月建地支（王相/游神等季节派生用），可缺省 */
  monthZhi?: Zhi;
  /** 月序（正月=1，期法/天马用），可缺省 */
  monthNo?: number;
  /** 年支（大歲，行年/一人问五事用），可缺省 */
  yearZhi?: Zhi;
  options?: ZsljOptions;
}

/** 四课之一 */
export interface KeItem {
  name: '一課' | '二課' | '三課' | '四課';
  /** 上神（天盘支） */
  shang: Zhi;
  /** 下（一课为日干，余为地盘支） */
  xia: Gan | Zhi;
  /** 上神所临地盘支（涉害孟仲季即据此） */
  seat: Zhi;
  /** 克应：下贼上 / 上克下 / 无 */
  relation: '下賊上' | '上剋下' | null;
  /** 天将 */
  jiang: string;
}

/** 三传判定路径中的一步 */
export interface FaStep {
  fa: string;
  /** 原文锚点 id（如 senji02） */
  ref: string;
  note: string;
}

export interface ChuanItem {
  zhi: Zhi;
  jiang: string;
  /** 旬遁干（空亡无遁） */
  dunGan?: Gan;
  /** 对日干六亲（父母/兄弟/子孙/妻财/官鬼，通行称谓，供 AI 参考） */
  liuQin: string;
  /** 王相死囚老状态 */
  wangShuai?: string;
}

export interface SanChuanResult {
  chu: ChuanItem;
  zhong: ChuanItem;
  mo: ChuanItem;
  /** 课用九法之门（贼克/比用/涉害/先举/遥克/昴星/伏吟/返吟/八专） */
  method: string;
  /** 完整判定路径 */
  path: FaStep[];
  /** 八专「用起日辰上，唯有一传」标记 */
  singleChuan?: boolean;
}

/** 十二宫（0=子 … 11=亥，与 D:\WWW 系列项目索引约定一致） */
export interface GongInfo {
  diZhi: Zhi;
  tianZhi: Zhi;
  jiang: string;
  jiangLuck: '吉' | '凶';
  dunGan?: Gan;
  /** 天盘支为旬空 */
  isKong: boolean;
  /** 标注：日（干寄宫）/辰（日支）所在 */
  marks: string[];
}

export interface GuaHit {
  id: string;
  no: number;
  name: string;
  /** exact=条件完备可判 / approx=近似判定（文义有出入） / info=总论性归类 */
  certainty: 'exact' | 'approx' | 'info';
  why: string;
}

export interface DeriveResult {
  /** 旬首 */
  xun: string;
  kongWang: [Zhi, Zhi];
  season?: Season;
  /** 日干五行的王相死囚老（含原文色） */
  riWangShuai?: { state: string; color: string };
  riDe: { gan: Gan; note: string };
  /** 日财（我克之支） */
  riCai: Zhi[];
  /** 日鬼（克我之支） */
  riGui: Zhi[];
  /** 十二客（从月将起，前三客） */
  ke12: { name: string; zhi: Zhi }[];
  /** 十二筹（从发用起，前三筹） */
  chou12: { name: string; zhi: Zhi }[];
  /** 天马（依月序） */
  tianMa?: Zhi;
  /** 行年（需出生年支与性别） */
  xingNian?: Zhi;
  /** 氣類物归类（2601）：初传属气/类/物 */
  qiLeiWu?: { kind: '氣' | '類' | '物'; worry: string };
}

export interface ZhanDuanItem {
  /** 占类章节锚点（senji25、senji27~36） */
  ref: string;
  title: string;
  /** 机器可判的结论行 */
  verdicts: string[];
}

export interface ZsljChart {
  meta: {
    engine: 'zslj';
    school: '占事略決古法';
    version: string;
    options: ResolvedOptions;
  };
  input: {
    /** 公历时间（castByDate 提供） */
    solar?: string;
    /** 四柱（castByDate 提供） */
    bazi?: string;
    dayGanZhi: string;
    hourZhi: Zhi;
    yueJiang: Zhi;
    yueJiangName: string;
    dayNight: DayNight;
    gangRou: '罡日' | '柔日';
    monthZhi?: Zhi;
    monthNo?: number;
    yearZhi?: Zhi;
  };
  gong: GongInfo[];
  sike: [KeItem, KeItem, KeItem, KeItem];
  sanchuan: SanChuanResult;
  tianjiang: {
    guiZhi: Zhi;
    seat: Zhi;
    direction: '順' | '逆';
  };
  gua: GuaHit[];
  derive: DeriveResult;
  zhanduan: ZhanDuanItem[];
  /** 本盘涉及的原文锚点（AI 检索引用） */
  refs: string[];
}
