# shj-ts-lib —— 《山海经》语料库

十八卷经文（繁/简对照、逐条结构化）、**183 个实体百科**（异兽/奇鸟/鳞介/蛇虺/龙属/神祇/奇人/方国/神木）、**120 处山川地望坐标**（今地考据 + 置信度分级）、**220+ 幅历代名家古图**（明蒋应镐绘图本、明胡文焕本、清汪绂本、《古今图书集成》、日本《怪奇鳥獣図巻》、鸟山石燕等，全部公有领域）的深度结构化 TypeScript 库。

为地图 + 百科类宿主（如 react-shj）设计：**实体索引/地望坐标同步可用，经文与实体正文按需分包懒加载，GeoJSON 一行导出**。

```bash
npm install github:hackninety/shj-ts-lib
```

## 数据总览

| 分支 | 规模 | 加载方式 |
|---|---|---|
| `shj-ts-lib/text` | 十八卷 839 条 3.8 万字，繁简对照 | 卷目同步；正文按卷 18 个 chunk |
| `shj-ts-lib/entities` | 183 个实体：原文引文（底本逐字校验）+ 白话简介 + 特性标签 | 索引同步；正文 1 个 chunk |
| `shj-ts-lib/locations` | 120 处地望：坐标 + 今地 + 考据依据 + 置信度 | 同步 |
| `shj-ts-lib/images` | 220+ 幅古图元数据；文件在包内 `assets/images/` | 元数据同步 |
| `shj-ts-lib/geo` | 实体/地望 → GeoJSON FeatureCollection | 同步 |

## 快速上手

```ts
import { getEntitiesIndex, findEntities, getLocations, CONFIDENCE_LABELS } from 'shj-ts-lib';
import { getEntity } from 'shj-ts-lib/entities';
import { entitiesToGeoJSON } from 'shj-ts-lib/geo';
import { getImagesByEntity, imageUrl } from 'shj-ts-lib/images';

// 地图打点：一行拿到全部有地望实体的 GeoJSON
const fc = entitiesToGeoJSON();               // 183 枚 Point，属性含名称/类别/简介/主图/置信度
const real = entitiesToGeoJSON({ confidence: ['identified'] }); // 只看今地较可考的

// 点击图标 → 卡片：懒加载原文出处
const qq = await getEntity('qiongqi');
qq.brief;                    // 白话简介
qq.occurrences[0].quoteTrad; // 「其上有獸焉，其狀如牛，蝟毛，名曰窮奇…」（底本原文，逐字校验命中）
qq.occurrences[0].quote;     // 简体引文
getImagesByEntity('qiongqi');// 汪绂本 + 图书集成 两幅古图（含出处/许可）

// 搜索（繁简折叠，同步，适合 onChange）
findEntities('九尾狐');
findEntities('饕餮');        // 别名命中 → 狍鸮
```

## 经文语料

```ts
import { getChapters, getChapterEntries, searchText } from 'shj-ts-lib/text';

getChapters();                          // 十八卷卷目（分组：五臧山经/海外经/海内经/大荒经）
const entries = await getChapterEntries('xishan'); // 该卷 82 条，{ t 繁体, s 简体, head 条目主名 }
await searchText('凤皇', { limit: 20 });  // 全书检索，返回卷/条/命中片段
```

## 地望置信度（重要）

《山海经》地理不可尽考，坐标分三级（`CONFIDENCE_LABELS` 有中文标签，`DISCLAIMER` 有免责全文）：

- **identified** 今地较可考：泰山、华山、恒山、发鸠山、邽山（穷奇所在，甘肃天水）、青要山、洞庭君山、三危山、长白山（不咸山）、羽山等
- **disputed** 诸说取常见一说：招摇山、雷泽、都广之野、巴陵、疏属山等
- **legendary** 神话地名：坐标按经文方位在真实世界的对应方向排布（海外南经诸国列于南海一线、大荒北经诸神置于极北），仅作可视化示意

## 数据管线（再生成）

```bash
npm run fetch:text     # ctext.org 抓取十八卷底本 → docs/corpus/text
npm run fetch:images   # Commons 下载古图 → assets/images + 元数据
npm run gen            # docs/corpus → src/data + src/chunks（引文逐字校验，未命中即报错）
npm run build          # gen + tsc + ESM 修复 → dist/
npm test               # 语料完整性/引文可溯源/坐标合法/图像落盘/GeoJSON
```

实体引文由生成管线在底本内**去句读繁简折叠后逐字定位**，再回采带原句读的繁体原文——所有 `quoteTrad` 均保证是底本的连续子串，语料可溯源。

## 数据来源与许可

- 经文底本：ctext.org（中國哲學書電子化計劃）章节 API，先秦典籍公有领域
- 古图：Wikimedia Commons 公有领域扫描/矢量化文件，每幅记录来源页/作者/许可（见 `docs/sources.md`）
- 实体白话简介/地望考据汇编：本库整理，MIT

详见 [docs/sources.md](docs/sources.md)；React 接入示例见 [INTEGRATION.md](INTEGRATION.md)。
