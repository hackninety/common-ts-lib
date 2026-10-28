/**
 * 四课 —— senji01：
 * 「日上神為日之陽（一課）。日上神本位所得之神為日之陰（二課）。
 *   辰上神為辰之陽（三課）。辰上神本位所得之神為辰之陰（四課）。」
 *
 * 下位：一课为日干（克应以干五行论），二课下为一课上神，三课下为日支，四课下为三课上神。
 */
import { GAN_WUXING, ZHI_WUXING, jiGong, ke } from './constants';
import type { TianPan } from './tianpan';
import type { Gan, KeItem, Zhi } from './types';

const NAMES = ['一課', '二課', '三課', '四課'] as const;

export function buildSiKe(dayGan: Gan, dayZhi: Zhi, pan: TianPan): [KeItem, KeItem, KeItem, KeItem] {
  const ji = jiGong(dayGan);
  const k1s = pan.tianAt(ji);
  const k2s = pan.tianAt(k1s);
  const k3s = pan.tianAt(dayZhi);
  const k4s = pan.tianAt(k3s);

  const raw: { shang: Zhi; xia: Gan | Zhi; seat: Zhi }[] = [
    { shang: k1s, xia: dayGan, seat: ji },
    { shang: k2s, xia: k1s, seat: k1s },
    { shang: k3s, xia: dayZhi, seat: dayZhi },
    { shang: k4s, xia: k3s, seat: k3s },
  ];

  return raw.map((r, i) => {
    const shangWx = ZHI_WUXING[r.shang];
    const xiaWx = i === 0 ? GAN_WUXING[dayGan] : ZHI_WUXING[r.xia as Zhi];
    const relation = ke(xiaWx, shangWx) ? '下賊上' : ke(shangWx, xiaWx) ? '上剋下' : null;
    return { name: NAMES[i], shang: r.shang, xia: r.xia, seat: r.seat, relation, jiang: '' };
  }) as [KeItem, KeItem, KeItem, KeItem];
}
