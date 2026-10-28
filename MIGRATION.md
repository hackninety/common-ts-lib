# 2026-10-28 单仓库多包迁移

## 来源

| 包 | 原仓库 | 导入提交 | 包内版本 |
| --- | --- | --- | --- |
| lrdq-ts-lib | hackninety/lrdq-ts-lib | f3c3ff8206716ee856949714ce6ab5b9770b9767 | 0.11.0 |
| nhx-ts-lib | hackninety/nhx-ts-lib | fe5f469356419338144cd41aac47d6be80770cf0 | 0.1.1 |
| qmdj-ts-lib | hackninety/qmdj-ts-lib | 449b26a0df72da779ff026dd5b1b471592517257 | 0.2.0 |
| shj-ts-lib | hackninety/shj-ts-lib | b750f222369d302f4238116b59ce752cf0fa1551 | 0.1.0 |
| tbss-ts-lib | hackninety/tbss-ts-lib | 738116066194a221f0150071870ada4b68065777 | 0.1.0 |
| zslj-ts-lib | hackninety/zslj-ts-lib | 36c2175fd643465e385c3192d52caf8cc9a411fa | 0.1.0 |

导入时全部原库工作树干净，远端 main 与表中提交相同。各库以非 squash subtree merge 放入 `packages/<包名>`，原历史可在当前 Git 对象库查询。没有嵌套 Git 仓库。

`zslj-ts-lib` 原有标签 v0.2.1 与包内版本 0.1.0 不一致。本次沿用包内版本；前端旧锁文件中的 d813cbaf 是该 annotated tag 对象，解析到上述 36c2175 提交，没有因此回退源码。

## 消费方

| 前端 | 使用的包 |
| --- | --- |
| react-gxdq | lrdq-ts-lib、nhx-ts-lib、qmdj-ts-lib、zslj-ts-lib |
| react-liuren | lrdq-ts-lib、zslj-ts-lib |
| react-qimen | qmdj-ts-lib |
| react-shj | shj-ts-lib |
| react-tieban | tbss-ts-lib |
| react-zslj | zslj-ts-lib |

前端继续使用 npm，依赖改为本仓库各包的版本化 Release 压缩包。代码中的包名和子路径导入保持原样，锁文件同步更新。`react-zslj` 原本没有 Git 仓库，其文件在本地更新。

`react-gxdq` 原来使用的 qmdj 标签 v0.1.1 对应较旧语料，本次统一使用导入的 0.2.0，增加原库已有的续册内容。`react-shj` 同步采用导入 main 的版本。其余包沿用原消费者对应源码。

## 维护方式变化

- 根目录 pnpm workspace、共享 TypeScript 默认配置和单一锁文件。
- 各包保留名称、版本、公开 exports、数据生成逻辑、图片与许可。
- 发布包已包含 dist，前端安装时无需获取完整原始语料或运行编译工具。
- 旧 qmdj 跟踪的 dist 改为生成产物。直接在包目录执行 npm pack 时 prepack 会构建；统一发布必须先 pnpm build，再由 pack:libs 使用 npm pack --ignore-scripts 归档已有 dist，随后 verify:packages 隔离安装验证。消费已发布 tgz 不会调用 prepack。
- 包内机器专用 .claude 启动配置移除，旧路径不进入统一开发配置。
- react-qimen 语料更新脚本按显式版本包地址安装，支持 dry-run。
- react-zslj 提取脚本改为同步到 common-ts-lib/packages/zslj-ts-lib，并允许 ZSLJ_LIB_DIR 覆盖。
- zslj 内置文档图片地址指向本仓库对应包版本标签下的 docs，避免依赖旧仓库的 main。
- 统一文本为 LF，保留图片二进制内容，避免 Windows checkout 转换影响摘要解析和图片字节数。NHX 18 个生成 JSON 中 646 个文本值仅将 CRLF 规范为 LF，逐值比较确认内容相同；其余生成数据除 zslj 版本化图片地址外与迁入内容一致。

## 回退与追溯

原来的六个本机目录与远端仓库保留。迁移前后的前端依赖可通过各前端 Git 提交比较；恢复旧 package.json / package-lock.json 后执行 npm ci 即可恢复旧安装来源。统一仓库中可通过上述原始提交读取旧源码。

原始历史查询以表中的导入提交为准，例如 git show <导入提交>:src/index.ts。subtree 导入之前的文件位于原仓库路径，git log --follow 不保证跨 subtree 合并自动连通整个历史。旧仓库保留为历史来源，后续开发和发布移至 common-ts-lib。

2026-10-28 修订：zslj-ts-lib 0.1.1 将发布白名单收窄到 dist、docs/book、docs/algorithm 与集成说明；原始 HTML、图片和全部公开接口保留，内部 plan/research 只保留在源码仓库。旧版本 Release 不修改。
