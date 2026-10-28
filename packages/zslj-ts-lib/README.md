# zslj-ts-lib

《占事略決》（天文博士安倍晴明撰，约 983 年）六壬式占**古法排盘引擎**。TypeScript，零 UI 依赖，唯一运行时依赖 [tyme4ts](https://github.com/6tail/tyme4ts)（MIT）。

与通行（明清《六壬大全》系）大六壬不同，本库严格按原书三十六法实现——涉害只论孟深仲半季浅、贵人旦暮以寅~酉为界、九法无别责、伏吟刑冲取传、卅六卦课体——每个结果都携带原文锚点（`refs`），可溯源到条文。原书第廿六章「假令」课例即黄金测试用例（`npm test`，21 用例）。

```bash
npm install zslj-ts-lib   # 或本地 file: 依赖
```

## 快速上手

```ts
import { cast, castByDate, castBySiZhu } from 'zslj-ts-lib';

// 公历起课（默认中气过宫月将）
const chart = castByDate(new Date(), { birthYear: 1984, gender: '男' });

// 四柱直输（tyme4ts EightChar 反推公历）
const c2 = castBySiZhu('甲辰', '丙子', '庚午', '庚辰');

// 干支参数起课（复现古书假令：字面月将）
const c3 = cast({ dayGan: '甲', dayZhi: '子', hourZhi: '寅', yueJiang: '亥', monthNo: 1, monthZhi: '寅' });

chart.sanchuan.method        // 取传法门：賊剋/比用/涉害/先舉/遙剋/昴星/伏吟/返吟/八專
chart.sanchuan.path          // 判定路径（每步含原文锚点 ref）
chart.gua                    // 卅六卦命中（exact/approx/info 三级可信度）
chart.zhanduan               // 占断助手（占病祟/待人/盗失/雨晴…机器可判部分）
chart.refs                   // 本盘涉及的全部原文锚点
```

## API 一览

| 导出 | 说明 |
|---|---|
| `cast(params)` | 干支参数起课（`CastParams`：日干支/占时/月将/旦暮/月建…） |
| `castByDate(date, extra?)` | 公历起课；`extra.yueJiangMode: 'zhongqi' \| 'yuejian'`、`birthYear`、`gender` |
| `castBySiZhu(y, m, d, h, extra?)` | 四柱反推起课 |
| `toGenericChart(chart)` | 转为 react-liuren 统一模型形状（见 [INTEGRATION.md](INTEGRATION.md)） |
| `SYSTEM_PROMPT` / `buildUserPrompt` / `buildClipboardPrompt` / `collectRefs` | AI「依经断课」提示词组装（自动附命中原文条文） |
| `book` / `getBookEntry(id)` | 结构化原文数据（chapters / gua36 / tables）与锚点查询 |
| `calendarFromDate(date, mode)` | 历法层（四柱/月将/月建），可独立使用 |
| `GAN_WUXING` / `ZHI_WUXING` / `jiangInfo` / `yueJiangName` … | 展示辅助 |
| `ZsljOptions.fuyinMo` | 伏吟末传读法开关（原文存疑处，默认用神之冲） |

## 古法要点（与通行体系的差异）

| 规则 | 本库（占事略決 983） | 通行体系 |
|---|---|---|
| 涉害 | 孟深仲半季浅 | 归本家计克数 |
| 涉害俱等 | 先举（日先辰后阳先阴后） | 缀瑕 |
| 别责课 | 无此法 | 有 |
| 伏吟三传 | 初之刑为中、初之冲为末 | 自任/自信迤逦相刑 |
| 返吟无克 | 未日太一临亥用/丑日徵明临巳用 | 井栏射取驿马（结果一致，表述异） |
| 贵人旦暮界 | 寅~酉为旦 | 卯~申为昼 |
| 贵人歌诀 | 甲戊庚→丑/未（古歌） | 多用后世改订歌诀 |
| 课体 | 卅六卦 | 六十余课体 |

原文歧义处的取舍全部记录于 react-zslj 仓库 `docs/algorithm/textual-issues.md`（T01~T14），并尽量提供 options 开关，**不以后世规则暗补**。

## 数据即文献

`dist/data/*.json` 为《占事略決》结构化数据（36 法分条原文、36 卦文本与判定说明、全部数据表），提取自 [久遠の絆本](https://miko.org/~uraki/kuon/furu/explain/meisi/onmyouji/senji/senjiryakuketu.htm)（浦木裕注译，原文公有领域）。表格数据均标注原文锚点。

## 许可

MIT（引擎代码）。原文为公有领域；数据中浦木裕补注文本仅作研究引用，请保留出处。本库仅供文化研究。
