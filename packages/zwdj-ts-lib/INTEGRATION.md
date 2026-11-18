# 接入 react-mcp

react-mcp 的文库检索（`src/corpus/adapters.ts`）以适配器调用各 `*-ts-lib` 的公共入口。本包接作 `zwdj` 适配器，并在 `src/corpus/coverage.ts` 把紫微系统的经典文库指向它。

## 依赖

本地联调先在 common-ts-lib 构建（`pnpm --filter zwdj-ts-lib build`），再：

```sh
npm install file:../common-ts-lib/packages/zwdj-ts-lib
```

本包数据约 0.3 MB（明文 JSON），从 `node_modules/zwdj-ts-lib/data/` 读文件。react-mcp 的 esbuild 用 `packages: 'external'`，不打进产物。

发布到 common-ts-lib Releases 后改用 `.tgz` 地址（`releases/download/zwdj-ts-lib-v0.1.0/zwdj-ts-lib-0.1.0.tgz`），与其他库一致；提交前恢复发布地址并刷新锁文件。

## 适配器示例

```ts
{
  id: 'zwdj', title: '紫微斗数典籍', version: '0.1.0', kinds: ['doc'],
  rights: '《紫微斗数全书》公有领域；卷一前十四篇整理自 ncc.com.tw，其余录入与标点取自维基文库（CC BY-SA 4.0）。',
  async list() {
    return (await import('zwdj-ts-lib')).getDocsManifest().map(d =>
      entry(d.path, d.title, d.bookId, { book: d.book, group: d.group, author: d.author, dynasty: d.dynasty, script: d.script, chars: d.chars }));
  },
  async read(_kind, key) { return markdown(await (await import('zwdj-ts-lib')).getDocMarkdown(key)); },
  async fold() { return (await import('zwdj-ts-lib')).foldText; },
  async searchText(query, collection, offset, limit) {
    const page = await (await import('zwdj-ts-lib')).searchEntries(query, { book: collection, scope: 'text', offset, limit });
    return { hits: page.items.map(h => ({ key: h.path, excerpt: h.excerpt })), total: page.total };
  },
}
```

`collection` 即书目 ID（`qs1`、`qs2`、`qs3`）。来源地址逐篇不同（卷一前十四篇为空），取 `getEntryMeta(bookId, entryId).sourceUrl`；所据来源仓库提交取 `getCatalog().origin.revision`。
