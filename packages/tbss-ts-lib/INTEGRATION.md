# INTEGRATION —— React 宿主接入指南

本库为纯数据 + 访问器库（ESM、零运行时依赖），Vite / Next.js / CRA / 纯 Node 均可直接用。
条文载荷（约 0.8MB 文本）已按十二集拆分为 12 个 chunk + 年龄倒排 1 个 chunk，
只要走 `tbss-ts-lib/verses` 的异步函数，打包器自动 code-split，
宿主首屏只引入轻量索引（卷册清单 + 注册表，不足 5KB）。

```bash
npm install github:hackninety/tbss-ts-lib
# 本地并排开发（如 D:\WWW\react-tieban）：
npm install file:../tbss-ts-lib
```

## 1. 条文阅读器（十二集抽屉 + 条文视图）

```tsx
import { useEffect, useState } from 'react';
import { getVolumes, type VolumeInfo } from 'tbss-ts-lib';
import { getVolumeVerses, type Verse } from 'tbss-ts-lib/verses';

// 侧栏：十二集清单（同步，无网络/无大载荷）
const volumes = getVolumes(); // [{ slug:'zi', name:'子集', start:1001, end:2000 } …]

function VolumeView({ vol }: { vol: VolumeInfo }) {
  const [verses, setVerses] = useState<Verse[]>();
  useEffect(() => { getVolumeVerses(vol.slug).then(setVerses); }, [vol.slug]);
  if (!verses) return <Spinner />;   // 首次打开某集才拉取该集 chunk
  return (
    <ol start={vol.start}>
      {verses.map((v) => (
        <li key={v.n}>
          {v.text}
          {v.ages.length > 0 && <em>（{v.ages.join('、')}岁）</em>}
        </li>
      ))}
    </ol>
  );
}
```

## 2. 检索框（全文 + 年龄倒排）

```tsx
import { searchVerses, getVersesByAge } from 'tbss-ts-lib/verses';

// 断语全文（繁简折叠：输入「殘花」命中「残花」；按集渐进加载，命中即止）
const hits = await searchVerses('姻缘', { limit: 30 });

// 流年视图：某岁应验的全部条文（年龄倒排索引单独一包）
const at47 = await getVersesByAge(47);
```

检索为 onSubmit 级异步（首查会拉分包）；若做 onChange 即时过滤，
先 `loadAllVerses()` 预热再在宿主态内存中过滤。

## 3. 排盘结果渲染（条文号 → 断语）

上游考刻推演产出条文号序列（本命/六亲/1–108 岁流年），批量取条直接渲染：

```tsx
import { getVerses } from 'tbss-ts-lib/verses';
import { citeVerse } from 'tbss-ts-lib/prompt';

const liunian = await getVerses([2408, 8151, 3188 /* …每岁一条 */]);
// 未命中号位为 undefined（如校正数无断语），渲染时占位「未找到断语」
liunian.map((v, i) => v
  ? <tr key={i}><td>{i + 1}岁</td><td>{v.text}</td><td>{v.ages.join('，')}</td></tr>
  : <tr key={i}><td>{i + 1}岁</td><td colSpan={2}>—</td></tr>);
```

## 4. 取数表面板（十四考 15 张直接渲染）

```tsx
import { getTables, getTable, EIGHT_QUARTERS, CORE_FORMULA } from 'tbss-ts-lib/tables';

// 通用表格形态，columns + rows 直进 <table>；多值单元格以 \n 分隔
function KaokeTable({ id }: { id: string }) {
  const t = getTable(id)!;
  return (
    <table>
      <caption>{t.title} — {t.description}</caption>
      <thead><tr>{t.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>
        {t.rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j}>{c.split('\n').map((x) => <div key={x}>{x}</div>)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}
```

八刻细分（`EIGHT_QUARTERS`）与核心公式（`CORE_FORMULA`）适合排盘页头部常驻展示。

## 5. 注解精选卡片 + 方法文献抽屉

```tsx
import { getAnnotated, getAnnotatedCategories, getAnnotatedMeta } from 'tbss-ts-lib/annotated';
import { getMethodDocs, getDocMarkdown } from 'tbss-ts-lib/docs';

// 精选卡片（同步小载荷）：分类 tab + 原文/今注/标签
const byCat = Object.groupBy(getAnnotated(), (a) => a.category);

// 方法文献：与姊妹库典籍抽屉同形（manifest 同步 + markdown 懒加载）
function MethodDoc({ slug }: { slug: string }) {
  const [md, setMd] = useState<string>();
  useEffect(() => { getDocMarkdown(slug).then(setMd); }, [slug]);
  return md ? <Markdown source={md} /> : <Spinner />;
}
```

注解精选渲染时建议一并展示 `getAnnotatedMeta().note`（节录声明）。

## 6. AI 述评（RAG 上下文）

```ts
import { searchVerses } from 'tbss-ts-lib/verses';
import { buildVerseContext } from 'tbss-ts-lib/prompt';

const ctx = buildVerseContext(await searchVerses('功名', { limit: 12 }), { maxChars: 3000 });
// 【《铁板神数》×集 第 n 条（年龄注记 …）】断语…（尾注保真度声明）
```

## 7. 免责声明与保真度

条文展示页建议常驻 `DISCLAIMER`（仅供研究娱乐）；引用/导出场景带上
`FIDELITY_NOTE`（社区转录未经校勘）。两者均从根入口导出。

```ts
import { DISCLAIMER, FIDELITY_NOTE, getSources } from 'tbss-ts-lib';
```

## 体积与分包预算

实测未压缩体积（gzip 后远小）：

| 入口 | 首包 | 懒加载 |
|---|---|---|
| tbss-ts-lib（根） | <6KB（卷册/注册表/折叠表） | — |
| /verses | <3KB | 12 集包各 ~47KB + 年龄倒排 ~59KB |
| /tables | ~140KB（15 表全量，入口级分割） | — |
| /annotated | ~12KB | — |
| /docs | <2KB | 正文一包 ~9KB |
| /prompt | <1KB | — |
