# bzdj-ts-lib

八字子平典籍原文库：七部书、三百余篇，原文照录，按书懒加载，简繁等价检索。仅适用于 Node（读包内 `data/` 文件）。

| 书目 ID | 书 | 收录 | 字形 |
| --- | --- | --- | --- |
| `dts` | 《滴天髓》輯要本（題劉基撰，陳之遴輯） | 全文 42 章，粗体为正文、其下为原注 | 繁 |
| `dtscw` | 《滴天髓阐微》（清任铁樵注） | 通神论 34 章、六亲论 29 章，含原注、任氏疏解与命例 | 简 |
| `zpzq` | 《子平真诠》（清沈孝瞻） | 原著 47 章，不含徐乐吾评注 | 简 |
| `yhzp` | 《渊海子平》 | 节选 17 节：论性情、十神诸篇、相心赋等 | 简 |
| `smth` | 《三命通会》（明万民英） | 节选 18 节：论性情相貌、十神诸论、驿马、学堂词馆等 | 简 |
| `smth-rishi` | 《三命通会》卷八、卷九 | 六十日时断全部 120 条 | 简 |
| `smth-siku` | 《三命通會》四庫全書本卷十至十二 | 看命口訣、氣象篇、六神篇、喜忌篇、繼善篇、元理賦等 26 篇 | 繁，无标点 |

## 用法

```ts
import { getBooks, getEntries, getEntry, getDocsManifest, getDocMarkdown, searchEntries, foldText } from 'bzdj-ts-lib';

getBooks();                                  // 书目（题名、作者、朝代、版本、字形、校记）
getEntries('dts');                           // 某书篇目（序号、篇名、卷名、字数、来源地址）
await getEntry('dts', '34');                 // 一篇全文
getDocsManifest();                           // 全库篇目目录，path = `<书目ID>/<篇序号>`
await getDocMarkdown('smth-rishi/076');      // 一篇的 Markdown（标题 + 出处行 + 正文）
await searchEntries('伤官见官', { book: 'yhzp' }); // 关键词 AND，简繁等价，篇名命中在前
```

检索不是语义排序：空格分隔的关键词须全部出现，篇名或卷名命中的排在正文命中前面。正文保持底本字形，简繁只在比对时折叠（`foldText`）。

## 数据来源

`data/` 由 `scripts/gen-data.mjs` 从来源仓库 react-8char 的 `docs/kb/*.md` 整理，书目配置在 `scripts/books.mjs`。来源仓库是私有的，生成只在维护者本机做；`data/` 随包提交，构建与发布不需要来源仓库。`getCatalog().origin` 记录所据的来源提交。

来源目录里的 `08-定时辰古诀.md` 出自《紫微斗数全书》卷三，已收入 zwdj-ts-lib，本库不重复收录。

## 权利

代码 MIT。原著均为清代及以前古籍，公有领域。《滴天髓》《渊海子平》《三命通会》《滴天髓阐微》的录入与标点取自维基文库（CC BY-SA 4.0），各篇带来源页地址；《子平真诠》取自 archive.org 公版书文本，并以殆知阁文本逐章比对（校记见 `getBook('zpzq').notes`）。各录入本未经逐字校勘，个别字有讹，照录未改。
