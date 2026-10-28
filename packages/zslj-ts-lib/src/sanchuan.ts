/**
 * 三传 —— 課用九法（senji02），严格依《占事略決》古法：
 *
 *   第一 賊剋：下贼上优先，无则上克下
 *   第二 比用：罡日取阳神（与日比）、柔日取阴神（与辰比）
 *   第三 涉害：加孟为深、加仲为半、加季为浅（不用后世归本家计克法）
 *   第四 先擧：涉害俱等，日先辰后、阳先阴后（按课序一→四取先）
 *   第五 遙剋：神遥克日优先于日遥克神；复用比、涉害
 *   第六 昴星：罡日取酉上神（中传辰上、末传日上）；柔日取从魁临下神（中传日上、末传辰上）
 *   第七 伏吟：有克取克；无克罡日日上、柔日辰上；中传=用之刑、末传=用之冲（默认读法）
 *   第八 返吟：有克取克（中末如常）；无克依专条（未日太一临亥用、丑日徵明临巳用），传辰上、终日上
 *   第九 五柔（八专）：有克如常；无克罡日自日上顺数三神、柔日自辰上阴神逆数三神，中末俱日辰上
 *
 * 中末通例（senji01）：「發用神為一傳,用神之本位所得二傳.二傳之神,本位所得神為三傳也.」
 */
import {
  ZHI_WUXING, GAN_WUXING, chong, isGangGan, isYangZhi, jiGong, ke,
  sheHaiDepth, tables, xing, yueJiangName, zhiAt, zhiIdx,
} from './constants';
import type { TianPan } from './tianpan';
import type { FaStep, Gan, KeItem, SanChuanResult, ResolvedOptions, Zhi } from './types';

interface Candidate {
  shang: Zhi;
  seat: Zhi;
  /** 所属课序（1-4，先举用；重复课取最小课序） */
  keNo: number;
}

interface Ctx {
  dayGan: Gan;
  dayZhi: Zhi;
  gang: boolean;
  pan: TianPan;
  sike: KeItem[];
  opts: ResolvedOptions;
  path: FaStep[];
}

/**
 * 去重四课（八专/伏吟时同神同位课合并），保留最小课序。
 * key 含克应：丁未/癸丑等干支五行不同的八专日，一课（下为干）与三课（下为支）
 * 虽同神同位而克应可异，不得合并。
 */
function distinctKe(sike: KeItem[]): Candidate[] {
  const seen = new Map<string, Candidate>();
  sike.forEach((k, i) => {
    const key = `${k.shang}|${k.seat}|${k.relation ?? '無'}`;
    if (!seen.has(key)) seen.set(key, { shang: k.shang, seat: k.seat, keNo: i + 1 });
  });
  return [...seen.values()];
}

/** 与日比（senji02 第二）：罡日取阳神、柔日取阴神 */
function isBi(gang: boolean, z: Zhi): boolean {
  return gang ? isYangZhi(z) : !isYangZhi(z);
}

/**
 * 多候选裁决：比用（第二）→ 涉害（第三）→ 先举（第四）。
 * 单候选直接返回。返回值携带最终选用之法名。
 */
function resolveMulti(ctx: Ctx, cands: Candidate[], baseFa: string): { pick: Candidate; fa: string } {
  if (cands.length === 1) return { pick: cands[0], fa: baseFa };

  // 第二 比用
  const bi = cands.filter((c) => isBi(ctx.gang, c.shang));
  if (bi.length === 1) {
    ctx.path.push({
      fa: '比用', ref: 'senji02',
      note: `${cands.map((c) => c.shang).join('、')}多神竞用，${ctx.gang ? '罡日比日取阳神' : '柔日比辰取阴神'}，得${bi[0].shang}`,
    });
    return { pick: bi[0], fa: '比用' };
  }
  const pool = bi.length > 1 ? bi : cands;
  ctx.path.push({
    fa: '比用', ref: 'senji02',
    note: bi.length > 1 ? `${pool.map((c) => c.shang).join('、')}俱比，转涉害` : '俱不比，转涉害',
  });

  // 第三 涉害（孟深仲半季浅）
  const maxDepth = Math.max(...pool.map((c) => sheHaiDepth(c.seat)));
  const deep = pool.filter((c) => sheHaiDepth(c.seat) === maxDepth);
  if (deep.length === 1) {
    ctx.path.push({
      fa: '涉害', ref: 'senji02',
      note: `加孟为深、仲半、季浅：${pool.map((c) => `${c.shang}临${c.seat}`).join('、')}，取${deep[0].shang}`,
    });
    return { pick: deep[0], fa: '涉害' };
  }

  // 第四 先举：日先辰后、阳先阴后 → 课序一→四取先
  const first = [...deep].sort((a, b) => a.keNo - b.keNo)[0];
  ctx.path.push({
    fa: '先舉', ref: 'senji02',
    note: `涉害俱等（${deep.map((c) => c.shang).join('、')}），日先辰后、阳先阴后，取${['一', '二', '三', '四'][first.keNo - 1]}課${first.shang}`,
  });
  return { pick: first, fa: '先舉' };
}

/** 通例中末：用之本位所得为二传，二传本位所得为三传 */
function chainZhongMo(pan: TianPan, chu: Zhi): [Zhi, Zhi] {
  const zhong = pan.tianAt(chu);
  return [zhong, pan.tianAt(zhong)];
}

/** 贼克流程（第一~四法），返回 null 表示四课无上下克 */
function zeiKe(ctx: Ctx): { chu: Zhi; fa: string } | null {
  const cands = distinctKe(ctx.sike);
  const zei = cands.filter((c) => ctx.sike[c.keNo - 1].relation === '下賊上');
  const keArr = cands.filter((c) => ctx.sike[c.keNo - 1].relation === '上剋下');
  if (zei.length === 0 && keArr.length === 0) return null;

  const use = zei.length > 0 ? zei : keArr;
  const kind = zei.length > 0 ? '下贼上' : '上剋下';
  ctx.path.push({
    fa: '賊剋', ref: 'senji02',
    note: `四课${kind}${use.length}处（${use.map((c) => `${c.shang}/${ctx.sike[c.keNo - 1].xia}`).join('、')}）${zei.length > 0 ? '，下贼上为深先取' : ''}`,
  });
  const { pick, fa } = resolveMulti(ctx, use, '賊剋');
  return { chu: pick.shang, fa };
}

/** 第五 遥克 */
function yaoKe(ctx: Ctx): { chu: Zhi; fa: string } | null {
  const dayWx = GAN_WUXING[ctx.dayGan];
  // 一课上神与日干的克应属上下克，遥克只论二三四课上神
  const cands = distinctKe(ctx.sike).filter((c) => c.keNo !== 1);
  const shenKeRi = cands.filter((c) => ke(ZHI_WUXING[c.shang], dayWx));
  const riKeShen = cands.filter((c) => ke(dayWx, ZHI_WUXING[c.shang]));
  if (shenKeRi.length === 0 && riKeShen.length === 0) return null;

  const use = shenKeRi.length > 0 ? shenKeRi : riKeShen;
  ctx.path.push({
    fa: '遙剋', ref: 'senji02',
    note: `四课无上下克，${shenKeRi.length > 0 ? '神遥克日' : '日遥克神'}（${use.map((c) => c.shang).join('、')}）`,
  });
  const { pick } = resolveMulti(ctx, use, '遙剋');
  return { chu: pick.shang, fa: '遙剋' };
}

/** 第六 昴星 */
function maoXing(ctx: Ctx): { chu: Zhi; zhong: Zhi; mo: Zhi } {
  const riShang = ctx.sike[0].shang;
  const chenShang = ctx.sike[2].shang;
  if (ctx.gang) {
    const chu = ctx.pan.tianAt('酉');
    ctx.path.push({ fa: '昴星', ref: 'senji02', note: `无上下克亦无遥克，罡日仰视酉上得${chu}，中传辰上${chenShang}、末传日上${riShang}` });
    return { chu, zhong: chenShang, mo: riShang };
  }
  const chu = ctx.pan.seatOf('酉');
  ctx.path.push({ fa: '昴星', ref: 'senji02', note: `无上下克亦无遥克，柔日取从魁（酉）所临下神${chu}，中传日上${riShang}、末传辰上${chenShang}` });
  return { chu, zhong: riShang, mo: chenShang };
}

export function buildSanChuan(
  dayGan: Gan, dayZhi: Zhi, pan: TianPan, sike: KeItem[], opts: ResolvedOptions,
): Omit<SanChuanResult, 'chu' | 'zhong' | 'mo'> & { chu: Zhi; zhong: Zhi; mo: Zhi } {
  const gang = isGangGan(dayGan);
  const ctx: Ctx = { dayGan, dayZhi, gang, pan, sike, opts, path: [] };
  const dayGanZhi = `${dayGan}${dayZhi}`;

  // ---- 第七 伏吟 ----
  if (pan.isFuYin) {
    ctx.path.push({ fa: '伏吟', ref: 'senji02', note: '天地伏吟，天神地各居其位' });
    let chu: Zhi;
    let fa = '伏吟';
    const zk = zeiKe(ctx);
    if (zk) {
      chu = zk.chu;
    } else {
      chu = gang ? sike[0].shang : sike[2].shang;
      ctx.path.push({ fa: '伏吟', ref: 'senji02', note: `无相克，${gang ? '罡日以日上神' : '柔日以辰上神'}${chu}为用` });
    }
    const zhong = xing(chu);
    const mo = opts.fuyinMo === 'chongOfZhong' ? chong(zhong) : chong(chu);
    if (zhong === chu) {
      ctx.path.push({ fa: '伏吟', ref: 'senji02', note: `用神${chu}自刑，中传同初（原文未及自刑之例，按字面）` });
    }
    ctx.path.push({ fa: '伏吟', ref: 'senji02', note: `其刑神${zhong}为二传，其冲神${mo}为三传` });
    return finish(ctx, chu, zhong, mo, fa);
  }

  // ---- 第八 返吟 ----
  if (pan.isFanYin) {
    ctx.path.push({ fa: '返吟', ref: 'senji02', note: '天地反吟，天地神反其位' });
    const zk = zeiKe(ctx);
    if (zk) {
      const [zhong, mo] = chainZhongMo(pan, zk.chu);
      return finish(ctx, zk.chu, zhong, mo, '返吟');
    }
    const fy = tables.fanYinNoKe;
    let chu: Zhi;
    if (fy.weiDays.includes(dayGanZhi)) {
      chu = fy.weiYong as Zhi;
      ctx.path.push({ fa: '返吟', ref: 'senji02', note: `无相克，${dayGanZhi}日太一（巳）临亥为用` });
    } else if (fy.chouDays.includes(dayGanZhi)) {
      chu = fy.chouYong as Zhi;
      ctx.path.push({ fa: '返吟', ref: 'senji02', note: `无相克，${dayGanZhi}日徵明（亥）临巳为用` });
    } else {
      chu = gang ? chong(jiGong(dayGan)) : chong(dayZhi);
      ctx.path.push({ fa: '返吟', ref: 'senji02', note: `无相克，${gang ? '罡日以日之冲' : '柔日以辰之冲'}${chu}为用（此例不在原文专条，存疑）` });
    }
    const zhong = sike[2].shang;
    const mo = sike[0].shang;
    ctx.path.push({ fa: '返吟', ref: 'senji02', note: `传辰上${zhong}，终日上${mo}` });
    return finish(ctx, chu, zhong, mo, '返吟');
  }

  // ---- 第九 五柔（八专） ----
  if (tables.wuRouDays.days.includes(dayGanZhi)) {
    ctx.path.push({ fa: '八專', ref: 'senji02', note: `${dayGanZhi}为五柔（八专）日，干支同宫，四课只二课` });
    const zk = zeiKe(ctx);
    if (zk) {
      const [zhong, mo] = chainZhongMo(pan, zk.chu);
      ctx.path.push({ fa: '八專', ref: 'senji02', note: '有相克，其三传如常' });
      return finish(ctx, zk.chu, zhong, mo, '八專');
    }
    const riShang = sike[0].shang;
    let chu: Zhi;
    if (gang) {
      chu = zhiAt(zhiIdx(riShang) + 2);
      ctx.path.push({ fa: '八專', ref: 'senji02', note: `无相克，罡日从日上神${riShang}顺数及三神得${chu}为用` });
    } else {
      const siKeShang = sike[3].shang; // 辰上神本位所得神（四课上神）
      chu = zhiAt(zhiIdx(siKeShang) - 2);
      ctx.path.push({ fa: '八專', ref: 'senji02', note: `无相克，柔日从辰上阴神${siKeShang}逆数及三神得${chu}为用` });
    }
    const single = chu === riShang;
    ctx.path.push({
      fa: '八專', ref: 'senji02',
      note: single ? `用起日辰上（${riShang}），唯有一传` : `中末俱终日辰上${riShang}`,
    });
    return { ...finish(ctx, chu, riShang, riShang, '八專'), singleChuan: single };
  }

  // ---- 第一~四 贼克/比用/涉害/先举 ----
  const zk = zeiKe(ctx);
  if (zk) {
    const [zhong, mo] = chainZhongMo(pan, zk.chu);
    return finish(ctx, zk.chu, zhong, mo, zk.fa);
  }

  // ---- 第五 遥克 ----
  const yk = yaoKe(ctx);
  if (yk) {
    const [zhong, mo] = chainZhongMo(pan, yk.chu);
    return finish(ctx, yk.chu, zhong, mo, '遙剋');
  }

  // ---- 第六 昴星 ----
  const mx = maoXing(ctx);
  return finish(ctx, mx.chu, mx.zhong, mx.mo, '昴星');
}

function finish(ctx: Ctx, chu: Zhi, zhong: Zhi, mo: Zhi, method: string) {
  return { chu, zhong, mo, method, path: ctx.path } as Omit<SanChuanResult, 'chu' | 'zhong' | 'mo'> & {
    chu: Zhi; zhong: Zhi; mo: Zhi;
  };
}

/** 供 UI/AI 显示的取传法门中文注解 */
export function methodDescription(method: string): string {
  const map: Record<string, string> = {
    賊剋: '下贼上为深、上克下为浅，取克者为用（senji02 第一）',
    比用: '多克竞用，取与今日比者（senji02 第二）',
    涉害: '俱比俱不比，加孟为深仲半季浅（senji02 第三）',
    先舉: '涉害俱等，日先辰后阳先阴后（senji02 第四）',
    遙剋: '四课无克，取遥克，神克日先（senji02 第五）',
    昴星: '无克无遥，罡日视酉上、柔日从魁临下（senji02 第六）',
    伏吟: '天地伏吟，用刑冲取传（senji02 第七）',
    返吟: '天地反吟，传辰上终日上（senji02 第八）',
    八專: '五柔日顺逆数三神，中末终日辰上（senji02 第九）',
  };
  return map[method] ?? method;
}

/** 月将名辅助（转出供外部拼提示词） */
export { yueJiangName };
