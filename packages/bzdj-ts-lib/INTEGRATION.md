# 接入 react-mcp

react-mcp 的文库检索（`src/corpus/adapters.ts`）以适配器调用各 `*-ts-lib` 的公共入口。本包接作 `bzdj` 适配器，并在 `src/corpus/coverage.ts` 把八字系统的经典文库指向它。

## 依赖

本地联调先在 common-ts-lib 构建（`pnpm --filter bzdj-ts-lib build`），再：

```sh
npm install file:../common-ts-lib/packages/bzdj-ts-lib
```

本包数据约 1.2 MB（明文 JSON），从 `node_modules/bzdj-ts-lib/data/` 读文件。react-mcp 的 esbuild 用 `packages: 'external'`，不打进产物。

发布到 common-ts-lib Releases 后改用 `.tgz` 地址（`releases/download/bzdj-ts-lib-v0.1.0/bzdj-ts-lib-0.1.0.tgz`），与其他库一致；提交前恢复发布地址并刷新锁文件。

## 适配器示例

```ts
{
  id: 'bzdj', title: '八字子平典籍', version: '0.1.0', kinds: ['doc'],
  rights: '原著公有领域；维基文库录入与标点 CC BY-SA 4.0，《子平真诠》取自 archive.org 公版书文本。',
  async list() {
    return (await import('bzdj-ts-lib')).getDocsManifest().map(d =>
      entry(d.path, d.title, d.bookId, { book: d.book, group: d.group, author: d.author, dynasty: d.dynasty, script: d.script, chars: d.chars }));
  },
  async read(_kind, key) { return markdown(await (await import('bzdj-ts-lib')).getDocMarkdown(key)); },
  async fold() { return (await import('bzdj-ts-lib')).foldText; },
  async searchText(query, collection, offset, limit) {
    const page = await (await import('bzdj-ts-lib')).searchEntries(query, { book: collection, scope: 'text', offset, limit });
    return { hits: page.items.map(h => ({ key: h.path, excerpt: h.excerpt })), total: page.total };
  },
}
```

`collection` 即书目 ID（`dts`、`dtscw`、`zpzq`、`yhzp`、`smth`、`smth-rishi`、`smth-siku`）。来源地址逐篇不同，取 `getEntryMeta(bookId, entryId).sourceUrl`；所据来源仓库提交取 `getCatalog().origin.revision`。
