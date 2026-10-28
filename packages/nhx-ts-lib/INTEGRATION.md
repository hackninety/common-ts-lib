# INTEGRATION —— React 宿主接入指南

本库为纯数据 + 访问器库（ESM、零运行时依赖），Vite / Next.js / CRA / 纯 Node 均可直接用。
重载荷（约 30MB 文本）已按 36 个 chunk 拆分，只要走各子入口的异步函数，
打包器会自动 code-split，宿主首屏只引入轻量索引（约 300KB，gzip 后远小）。

```bash
npm install https://github.com/hackninety/common-ts-lib/releases/download/nhx-ts-lib-v0.1.1/nhx-ts-lib-0.1.1.tgz
```

## 1. 典籍抽屉（与 lrdq-ts-lib/zslj-ts-lib 同形）

```tsx
import { useEffect, useState } from 'react';
import { getBooks } from 'nhx-ts-lib';
import { getDocsManifest, getDocMarkdown, type DocMeta } from 'nhx-ts-lib/docs';

// 侧栏：系列 → 书 → 分组 → 篇目（manifest 同步，无网络/无大载荷）
const bySeries = Object.groupBy(getBooks(), (b) => b.series);
const manifest = getDocsManifest();

function DocViewer({ meta }: { meta: DocMeta }) {
  const [md, setMd] = useState<string>();
  useEffect(() => { getDocMarkdown(meta.path).then(setMd); }, [meta.path]);
  if (!md) return <Spinner />;
  return <Markdown source={md} />; // 首次打开某书才拉取该书 chunk
}
```

抽屉分组建议：`series`（人纪/天纪/地纪/讲演/文集）为一级，`book` 为二级，
`BookInfo.groups`（携 `title/count/fidelity`）为三级。
**保真度提示**：`fidelity !== 'first-party'` 时建议在阅读器头部渲染标签
（`FIDELITY_LABELS[meta.fidelity]`），尤其 `attributed`（汉唐方剂讲解）与 `third-party`。

## 2. 方药穴查询面板

```tsx
import { findHerbs, getHerb } from 'nhx-ts-lib/herbs';
import { findAcupoints, getMeridians, getAcupointsByMeridian } from 'nhx-ts-lib/acupoints';
import { findFormulas, getFormula } from 'nhx-ts-lib/formulas';

// 搜索框（同步、繁简折叠，适合 onChange 即时过滤）
findHerbs('止血');        // 名称/功效/主治/分类/性味/归经
findAcupoints('湧泉');    // 繁体输入命中「涌泉」
findFormulas('桂枝');

// 详情页（异步取正文 + 人纪原文引用）
const herb = await getHerb('艾叶');
herb.refs;        // [{ file, page, quote }] —— 指向人纪原版讲义页码，可做「查证」跳转
herb.bencaoDoc;   // 《神农本草经》讲稿 path → getDocMarkdown() 深链
```

穴位铜人/经络图宿主：`getMeridians()` 列经络（穴数），`getAcupointsByMeridian('胃经')`
取该经全部穴（含 `location/code/aliases`）。

## 3. 医案列表与阅读

```tsx
import { getCaseGroups, getCaseIndex, getCaseMarkdown, findCases } from 'nhx-ts-lib/cases';

getCaseGroups();            // 11 组（携 fidelity/count）：日志组为倪师亲笔
getCaseIndex('riji2005');   // 索引含 date + summary（来诊提要），适合列表直接渲染
await getCaseMarkdown('riji2005/001'); // 正文按组分包
findCases('乳癌');          // 索引级检索（不触发载荷）
```

## 4. RAG / AI 场景（接 LLM）

逐字稿分支即开即用的段落级语料（书/章/段 + 出处）：

```ts
import { searchTranscripts } from 'nhx-ts-lib/transcripts';
import { searchDocsFull } from 'nhx-ts-lib/docs';
import { searchCasesFull } from 'nhx-ts-lib/cases';
import { buildTranscriptContext, buildDocContext, citeDoc } from 'nhx-ts-lib/prompt';

// 检索层：逐字稿（段落粒度）+ 讲稿（篇粒度）+ 医案（篇粒度）
const [tr, docs, cases] = await Promise.all([
  searchTranscripts(query, { limit: 8 }),
  searchDocsFull(query, { books: ['shanghan', 'jingui'], limit: 4 }),
  searchCasesFull(query, { groups: ['riji2005', 'riji2006'], limit: 4 }),
]);

// 组装层：带出处与保真度声明，防止逐字稿被误当倪师亲笔引用
const context = [
  buildTranscriptContext(tr, { maxChars: 3000 }),
  ...docs.map((d) => buildDocContext(d.meta, d.snippet)),
].join('\n\n');
```

建议系统提示词加入 `DISCLAIMER`（`import { DISCLAIMER } from 'nhx-ts-lib'`），
并要求模型回答时保留【出处】行。

## 5. 打包注意

- **Vite/Next**：无需配置，动态 import 自动分包；SSR 下所有 API 均可在服务端调用。
- **Next.js App Router**：索引类同步 API 可在 Server Component 直接用；
  `getDocMarkdown` 等异步 API 在两端均可。
- **纯 Node**：`dist` 已修复 ESM 扩展名与 JSON import attributes，
  `node --input-type=module -e "import('nhx-ts-lib/docs')"` 直接可用（Node ≥ 20.10）。
- **体积**：安装包约 31MB（文本语料）；运行时首屏仅加载所 import 入口的索引。
  若宿主只需部分分支（如仅天纪），import 对应子入口即可，其余 chunk 不会进 bundle。

## 6. 与姊妹库的一致性

`getDocsManifest()/getDocMarkdown(path)` 与 lrdq-ts-lib、zslj-ts-lib 的典籍库接口同形
（manifest 同步、markdown 异步、path 带书 slug 前缀），宿主的典籍抽屉组件可直接复用，
按 `manifest[].book`/`series` 分组即可并册展示多库。
