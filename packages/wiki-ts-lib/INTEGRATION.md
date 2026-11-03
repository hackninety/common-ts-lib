# 接入 react-mcp

react-mcp 的文库检索（`src/corpus/adapters.ts`）以适配器调用各 `*-ts-lib` 的公共入口。本包可按同样方式加一个 `wiki` 适配器；`corpusEntryId` 会拼成 `wiki-ts-lib/doc/<bookId>%2F<entryId>`。

## 依赖

本包在 `D:/WWW/common-ts-lib/packages/wiki-ts-lib`。本地联调先在 common-ts-lib 构建（`pnpm --filter wiki-ts-lib build`），再：

```sh
npm install file:../common-ts-lib/packages/wiki-ts-lib
```

本包数据约 16 MB（gzip 分片，运行时 `node:zlib` 解压），从 `node_modules/wiki-ts-lib/data/` 读文件。react-mcp 的 esbuild 用 `packages: 'external'`，包不会被打进 bundle，Dockerfile 复制整个 `node_modules`，不用额外处理。若以后改成内联打包，需要把 `data/` 一并复制并保持 `dist/../data/` 的相对位置。

发布到 common-ts-lib Releases 后改用 `.tgz` 地址（`releases/download/wiki-ts-lib-v0.1.0/wiki-ts-lib-0.1.0.tgz`），与其他库一致；提交前恢复发布 URL 并刷新锁文件。

## 适配器示例

```ts
{
  id: 'wiki', title: '古籍参考文库（志怪、子书、道经、佛典）', version: '0.1.0', kinds: ['doc'],
  rights: '古代原作公有领域；维基文库录入与校注 CC BY-SA 4.0，ctext、CBETA 等来源见各篇 source；仅作现实参考材料。',
  async list() {
    return (await import('wiki-ts-lib')).getDocsManifest().map(d =>
      entry(d.path, d.title, d.bookId, { book: d.book, group: d.group, author: d.author, dynasty: d.dynasty, kind: d.kind, layer: d.layer, ai: d.ai, chars: d.chars }));
  },
  async read(_kind, key) {
    const m = await import('wiki-ts-lib');
    const slash = key.indexOf('/');
    const e = await m.getEntry(key.slice(0, slash), key.slice(slash + 1));
    if (!e) return undefined;
    return { text: (await m.getDocMarkdown(key))!, format: 'markdown', provenance: {
      sourceUrl: e.sourceUrl ?? null, sourceRevision: e.source.revisionId ?? e.source.commit ?? null,
      licenseUrl: e.source.licenseUrl, contributorsUrl: e.source.contributorsUrl, uri: e.uri,
      contentLayer: e.layer === 'ai' ? 'ai-generated-translation' : e.layer === 'editorial' ? 'editorial-notes' : 'classical-transcription',
      kind: e.kind, ...(e.ai ? { aiProvider: e.ai.provider, aiRole: e.ai.role, segmentIds: e.ai.segmentIds } : {}),
    } };
  },
}
```

`collection` 用书目 ID（57 个），与 react-mcp “全文检索必须限定一个 collection”的规则相符。`provenance()` 里需要为 `wiki` 补一个分支，或直接返回 `common`，来源已在 `read` 的 `provenance` 中给出。

## 注意

- react-mcp 的通用全文检索逐条调用 `read`，单本大书（太平广记 7,021 篇）也能跑，但比 `searchEntries` 慢；要更快可在适配层对 `wiki` 改调 `searchEntries(query, { book: collection, scope: 'text' })`，它带简繁折叠。
- react-mcp 现有检索只做 NFKC + 小写，不做繁简折叠；古籍正文多为繁体，用简体关键词会搜不到。可在适配层先用 `foldText` 折叠，或直接走 `searchEntries`。
- `CorpusId` 类型和 `coverage.ts` 的 `SYSTEM_CORPORA` 需要相应增加 `wiki`。
- 正文字形保持底本，引用时保留书名、篇名、`uri` 与来源链接。
- `layer: 'ai'` 的 267 篇是 GPT／Gemini／Claude 写的现代译文、点评与总结，不是古籍也不是校注；MCP 返回时要让 AI 看得出这一层（`provenance.contentLayer`、`metadata.ai`），引用须注明是 AI 译注。react-mcp 通用检索默认会把它们和原文一起列出；若希望默认只给原文，在适配层按 `layer` 过滤或用 `searchEntries` 的 `layer` 参数。
