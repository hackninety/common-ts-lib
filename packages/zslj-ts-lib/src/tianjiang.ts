/**
 * 十二天将布盘 —— 天一治法（senji03）+ 十二將所主法（senji04）
 *
 * 贵人支：日干分组取旦暮贵（甲戊庚丑/未，乙己子/申，丙丁亥/酉，辛午/寅，壬癸巳/卯）
 * 旦暮界：占时寅~酉为旦、戌~丑为暮（古法，非通行卯酉界）
 * 顺逆：「常背天門向地戶」，贵人临地盘亥子丑寅卯辰顺布、巳午未申酉戌逆布
 * 环序：贵→虵→雀→合→陣→龍→空→虎→裳→玄→陰→后
 */
import { JIANG_RING, guiRenZhi, tables, zhiAt, zhiIdx } from './constants';
import type { TianPan } from './tianpan';
import type { DayNight, Gan, Zhi } from './types';

export interface TianJiangResult {
  guiZhi: Zhi;
  seat: Zhi;
  direction: '順' | '逆';
  /** 地盘支 → 天将名 */
  atSeat: Record<Zhi, string>;
  /** 天盘支 → 天将名（同一环，索引不同） */
  atTian: Record<Zhi, string>;
}

export function dayNightOf(hourZhi: Zhi): DayNight {
  const i = zhiIdx(hourZhi);
  return i >= 2 && i <= 9 ? '旦' : '暮';
}

export function buildTianJiang(dayGan: Gan, dayNight: DayNight, pan: TianPan): TianJiangResult {
  const guiZhi = guiRenZhi(dayGan, dayNight);
  const seat = pan.seatOf(guiZhi);
  const shun = (tables.guiRen.direction.shun as string[]).includes(seat);
  const dir = shun ? 1 : -1;

  const atSeat = {} as Record<Zhi, string>;
  const atTian = {} as Record<Zhi, string>;
  JIANG_RING.forEach((name, k) => {
    const s = zhiAt(zhiIdx(seat) + dir * k);
    atSeat[s] = name;
    atTian[pan.tianAt(s)] = name;
  });

  return { guiZhi, seat, direction: shun ? '順' : '逆', atSeat, atTian };
}
