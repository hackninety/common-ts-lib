# wiki-ts-lib

古籍参考文库。数据整理自 `D:/Ai/Novel/novel-wiki/references/`（Novel Web“参考材料”与 novel-wiki MCP 共用的现实参考材料库），共 57 部书、17,655 篇、约 968 万字，分三层：

| `layer` | 内容 | 篇数 |
| --- | --- | --- |
| `source` | 古籍原文、底本自带的古注与校注 | 17,366 |
| `editorial` | 入库时写的版本与整理说明（非古籍原文） | 22 |
| `ai` | react-scripture 藏经楼的 GPT／Gemini／Claude 逐段现代译文、点评与全文总结（《中论》《十二门论》《观空篇》，共 267 篇） | 267 |

**不收**：`novel-wiki/wiki/` 里的小说 Canon、人物设定、世界观；novel-wiki 本机的原始快照路径、react-scripture 的本机仓库路径、Novel Web 的修订时间戳。

正文与 novel-wiki 逐字相同。繁体、异体字保持底本字形，`〈…〉` 是原站小字注，`[^source-N]` 脚注是底本校注；检索时简繁等价，正文不转换。AI 层正文为简体，每篇对应一品（章），`### 对应原文 <segment id>` 小节与原文段落对齐，`ai.segmentIds` 列出对齐的段；Claude 译注按块级对齐，小节标题是块标题。

## 书目

| 类别 | 书目 |
| --- | --- |
| 志怪笔记、小说 | 太平广记（7,021 篇）、夷坚志（2,735）、阅微草堂笔记、酉阳杂俎、子不语（附续子不语）、聊斋志异、搜神记、博物志、幽明录、拾遗记、夜雨秋灯录、神仙传、列仙传、玄怪录、续玄怪录、剪灯新话、续齐谐记；西游记、封神演义 |
| 其他典籍 | 山海经、黄帝内经、墨子、鬼谷子（陶弘景注）、五行大义、天地阴阳交欢大乐赋（节选本；另一部只有文献说明，无正文） |
| 儒 | 论语、孟子、易传、大戴礼记、太玄经、皇极经世书（黄畿注） |
| 道 | 老子河上公章句、道德经纯阳真人释义、南华真经注疏、列子、文子、关尹子、文始真经言外旨、淮南鸿烈解、太一生水、周易参同契、参同契分章注、悟真篇、悟真篇（殆知阁传本）、太乙金华宗旨、性命圭旨、大丹直指、黄帝阴符经集注、黄帝阴符经注（张果）、观空篇、正易心法注 |
| 释 | 金刚经（鸠摩罗什译）、心经（玄奘译）、中论、十二门论、俱舍论（玄奘译） |

带 AI 译注（`aiProviders`）：中论、十二门论、观空篇。

完整书目、作者、时代、版本、来源与剔除记录见 `getBooks()` 或 `data/catalog.json`。

## 用法

需要 Node.js 22.13+，只在 Node 下运行（读包内 `data/` 文件）。

```ts
import { getBooks, getEntries, getEntry, searchEntries, getDocsManifest, getDocMarkdown } from 'wiki-ts-lib';

getBooks({ tradition: '道' });                   // 书目
getEntries('liaozhai-zhiyi');                     // 某书篇目（不含正文）
await getEntry('liaozhai-zhiyi', 'v006-028');     // 一篇全文 + 来源记录
await getEntryByUri('reference://shanhai-jing/p002-s001');  // novel-wiki 引用地址

// 空格分隔多词 AND，简繁等价；篇名命中排前；默认只搜 source 层
await searchEntries('雷公', { book: ['taiping-guangji', 'liaozhai-zhiyi'], limit: 20 });
await searchEntries('东王公', { scope: 'text', offset: 20 });
await searchEntries('自性', { book: 'zhonglun', layer: 'ai', aiProvider: 'Claude' });   // 只搜 Claude 译注

// 与 qmdj-ts-lib/docs、lrdq-ts-lib/docs 同形：path = '<bookId>/<entryId>'
getDocsManifest();
await getDocMarkdown('liaozhai-zhiyi/v006-028');
```

| 接口 | 说明 |
| --- | --- |
| `getCatalog()` | 来源修订、生成时间、许可说明、总数、剔除记录 |
| `getBooks(opts?)` / `getBook(id)` / `searchBooks(q)` | 书目；可按 `tradition`（儒释道其他）、`category` 过滤 |
| `getEntries(bookId)` / `getEntryMeta(bookId, id)` | 篇目元数据，按卷次、顺序排好 |
| `getEntry(bookId, id)` / `getEntryByUri(uri)` | 全文、`contentSha256`、`source`（提供方、页面、修订号、许可、贡献者页等）、`note`（入库说明） |
| `searchEntries(q, opts)` | `book`、`scope`（title/text/all）、`kinds`、`layer`（默认 source；`ai`／`editorial`／`all`）、`aiProvider`、`limit`（≤200）、`offset` |
| `getDocsManifest()` / `getDocMarkdown(path)` | docs 同形接口 |
| `foldText(s)` | 检索用的繁→简、小写折叠 |

篇目字段 `kind`：`original` 原文、`commentary` 古注／点评、`translation` 译文、`excerpt` 节录；`layer` 见上表；`ai`：`{ provider, role }`，`role` 为 `translation`（逐段译文）、`commentary`（逐段点评）、`summary`（全文总结）。`getDocMarkdown` 的出处行会写明「… AI 现代译文（非古籍原文）」，引用时不要当作古籍或古注。

全库首次全文检索约 1 秒（读入全部分片），之后约 60 毫秒；常驻内存约 250 MB。限定 `book` 只读该书分片。

## 数据结构

```
data/
  catalog.json                    书目总表（含各文件解压后的 SHA-256）
  fold.json                       简繁折叠表（逐字，OpenCC）
  books/<bookId>/index.json.gz    篇目元数据
  books/<bookId>/text-NNN.json.gz 正文分片，每片约 40 万字，{ entryId: { content, contentSha256, source, note?, ai? } }
```

索引与分片 gzip 存放（约 16 MB，明文约 53 MB），运行时用 `node:zlib` 解压；总表与折叠表明文。

书目 ID、篇目 ID 与 novel-wiki 相同，`uri` 即 novel-wiki 的 `reference://<bookId>/<entryId>`。

## 更新数据

本包在 common-ts-lib 工作区里，发布到该仓库 GitHub Releases（见仓库 README）。novel-wiki 新入库或修订古籍后，在本目录：

```sh
pnpm gen               # 重新整理 data/（默认读 D:/Ai/Novel/novel-wiki，可传目录或设 NOVEL_WIKI_ROOT）
pnpm typecheck && pnpm build && pnpm verify:data && pnpm test
```

`verify:data` 核对总表哈希、分片完整、字数、层标记，并在找得到 novel-wiki 时逐篇比对正文。

react-scripture 的三本书及译注是 novel-wiki `import-20260927-2` 批次从 `D:/WWW/react-scripture/.resource` 导入的（仓库修订 e3a6f2cd，与当前 HEAD 相同），本包不直接读 react-scripture。以后新译一本书，走 novel-wiki 的 classics 导入入库，再在这里 `npm run gen`。

## 许可

代码 MIT。古代原作属公有领域；维基文库的录入、标点、校注按 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 署名并以相同方式共享；ctext、CBETA 等来源见各篇 `source.rights`、`source.rightsNote`、`source.licenseUrl`。AI 层译注由 GPT／Gemini／Claude 生成，CBETA 底本原文按其版权声明使用。代码许可不覆盖材料自身许可。仅作现实参考材料，不是任何小说的设定。
