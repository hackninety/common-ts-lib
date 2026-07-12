# 语料模型（corpus model）

## 分层

```
docs/corpus/               规范底本（引入自 GitHub 源仓库，保留原始 frontmatter，不改一字）
   ↓ scripts/gen-data.mjs   （frontmatter 剥离归 meta、标题统一 H1、编号排序、结构化解析）
src/data/*.json            生成数据（manifest/索引 = 轻量同步；载荷 = 分包）
src/chunks/*.ts            载荷模块（动态 import 分包点，生成文件勿手改）
src/*.ts                   访问器（类型、注册表、繁简折叠检索、各子入口）
```

## 讲稿库（docs）

- 书目注册表在 gen-data 的 `BOOKS`：slug / 中文书名 / 系列 / 分组（groups）/ 保真度 / 源仓库。
- 篇目 path 规则：`<slug>/<group>/<NNN>-<title>.md`，NNN 为全书连续序号（分组内按
  文件名编号排序：数字前缀、`HT-` 编号、`第X部分`汉数字、`结尾/附录` 置后、README 为前言）。
- manifest 条目：`{ path, title, group, book, series, fidelity, date? }`；正文统一以 `# 标题` 开头。
- 正文载荷 `docs-<slug>.json` 按书分包，宿主打开某书才加载。

## 医案（cases）

- 分组注册表 `CASE_GROUPS`（11 组）；id 规则 `<group>/<NNN>`。
- 索引条目额外解析：`date`（文件名 6 位日期或正文「初诊日期」）、
  `summary`（「来诊原因」行或首个正文行，≤60 字）。
- 磁盘上 `docs/corpus/_cases/倪海厦08年医案959篇-按人名分类` 目录为 GBK 乱码残档
  且与其余分组重复，未收录（见 sources.md）。

## 结构化实体（herbs / acupoints / formulas）

- 底本为 qmzz 知识库 markdown（YAML frontmatter + 正文 + source_refs 原文引用）。
- frontmatter 破损时（约 168 个文件 quote 含未转义引号）走行级回退解析，
  source_refs 用状态机重建，quote 证据不丢失；名单见 `src/data/textual-issues.json`。
- 穴位字段合并策略：qmzz 总索引表（6 经 50 穴）优先，其余从正文结构行
  （`**归经：**`/`**定位：**`/`**功效：**`/`**别名：**`、H1 括号国际代码）补齐。
- 中药 `bencaoDoc` 互链：药名精确匹配《神农本草经》讲稿篇目（360+ 味命中）。
- qmzz 的 cases/concepts/diagnosis 三类含 AI 合成教学示例与 no_source_found 条目，
  **未收录**（保真度不足），仅在 sources.md 登记。

## 逐字稿（transcripts）

- 重黎数据集五个 JSON（书/章/段 + 上下文窗口 + 关键词 + 哈希）；
  本库保留 书/章/段 与文本（`paras: [段号, 文本]`），
  丢弃可再生字段（context_prev/next、content_hash、keywords）。
- 章目录进同步索引；正文按书分包（伤寒 1365 段、金匮 2310 段…共 6486 段）。

## 保真度（fidelity）

| 值 | 含义 | 典型分支 |
|---|---|---|
| first-party | 倪师亲笔 | 诊疗日志、专题文章、地纪遗稿 |
| lecture-notes | 听课整理稿（非逐字） | 人纪五部、天纪、64 卦 |
| transcript | 视频/录音逐字稿 | 人纪逐字稿、天纪字幕、讲座、录音坐诊 |
| attributed | 传为倪师所述、整理者自注存疑 | 汉唐方剂讲解（底本首篇明言配方系他人补全） |
| third-party | 第三方整理/补充 | 小编补充药物、整理者总结、神州医料库编档、qmzz 实体 |

## 再生成

```bash
npm run gen     # docs/corpus → src/data + src/chunks
npm run build   # gen + tsc + data 落盘 + ESM 修复
```

`scripts/ingest.mjs` 仅在从源仓库刷新底本时使用（需本地克隆源仓库，
路径经 NHX_SRC 指定；引入 commit 记录于 docs/corpus/_meta/sources.json）。
