/**
 * 天地盘 —— 「常以月將加占時」（senji01 四課三傳法）
 *
 * 月将置于地盘占时之位，余支顺布。offset = 月将 - 占时。
 */
import { zhiAt, zhiIdx } from './constants';
import type { Zhi } from './types';

export interface TianPan {
  /** 天盘支 - 地盘支的环差 */
  offset: number;
  /** 地盘支 → 天盘支 */
  tianAt(di: Zhi): Zhi;
  /** 天盘支 → 所临地盘支 */
  seatOf(tian: Zhi): Zhi;
  /** 伏吟（天地各居其位） */
  isFuYin: boolean;
  /** 返吟（天地神反其位） */
  isFanYin: boolean;
}

export function buildTianPan(yueJiang: Zhi, hourZhi: Zhi): TianPan {
  const offset = ((zhiIdx(yueJiang) - zhiIdx(hourZhi)) % 12 + 12) % 12;
  return {
    offset,
    tianAt: (di) => zhiAt(zhiIdx(di) + offset),
    seatOf: (tian) => zhiAt(zhiIdx(tian) - offset),
    isFuYin: offset === 0,
    isFanYin: offset === 6,
  };
}
