# common-ts-lib

独立 TypeScript 库与配套组件的统一源码仓库。各包保留自己的包名、版本、公开接口、子路径入口和许可，根目录不发布为 npm 包。

| 包 | 版本 | 内容 | 许可 |
| --- | --- | --- | --- |
| [lrdq-ts-lib](packages/lrdq-ts-lib) | 0.11.0 | 六壬典籍、毕法、课体与占例 | CC-BY-NC-4.0 |
| [mingli-cases-ts-lib](packages/mingli-cases-ts-lib) | 0.1.0 | 可扩展命例库；首批 BaziQA 比赛真题与名人案例，按来源/资料集/年份/原术数/题材归类 | 代码 MIT；原题权利见包内说明 |
| [mingli-cases-react](packages/mingli-cases-react) | 0.1.0 | React 18/19 共用命例浏览、练习与 AI 参考面板 | MIT |
| [nhx-ts-lib](packages/nhx-ts-lib) | 0.1.1 | 倪海厦教学语料与检索 | CC-BY-NC-4.0 |
| [qmdj-ts-lib](packages/qmdj-ts-lib) | 0.2.0 | 奇门典籍、克应与占目 | MIT（沿用原包声明） |
| [shj-ts-lib](packages/shj-ts-lib) | 0.1.0 | 山海经文、实体、地理与古图 | MIT |
| [tbss-ts-lib](packages/tbss-ts-lib) | 0.1.0 | 铁板神数条文与取数表 | CC-BY-NC-4.0 |
| [zslj-ts-lib](packages/zslj-ts-lib) | 0.1.0 | 占事略決排盘与典籍 | MIT |

## 开发

需要 Node.js 22.13+、pnpm 11.25.0。只在仓库根目录维护 `pnpm-lock.yaml`。

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm typecheck

# 单独开发、构建和测试一个包
pnpm --filter qmdj-ts-lib build
pnpm --filter qmdj-ts-lib test

# 完整检查，包括安装发布包后验证所有公开入口和数据
pnpm check
```

各包源码在 `packages/<包名>/`。原始资料、结构化数据和山海经图片保留在所属包内；已有数据生成脚本按包运行。构建不依赖旧的并排仓库。`dist` 和 `node_modules` 不进入主分支。

## 前端安装

每个包独立发布到本仓库 GitHub Releases，安装的是已经构建的 `.tgz`，不要求前端安装 pnpm、克隆整个源码仓库或在安装时重建语料。

```sh
npm install https://github.com/hackninety/common-ts-lib/releases/download/lrdq-ts-lib-v0.11.0/lrdq-ts-lib-0.11.0.tgz
```

```ts
import { detectBifa } from 'lrdq-ts-lib';
import { getDocsManifest } from 'lrdq-ts-lib/docs';
```

发布 URL 的规则为 `releases/download/<包名>-v<版本>/<包名>-<版本>.tgz`。前端提交自己的 `package.json` 和 `package-lock.json`，部署时执行 `npm ci`。不同包可独立升级，锁文件记录下载地址与完整性校验。山海经图片继续随 `shj-ts-lib` 分发，原有 `node_modules/shj-ts-lib/assets/images` 静态复制配置可继续使用。

本地联调可先构建包，再临时安装 `file:../common-ts-lib/packages/<包名>`；提交前恢复发布 URL 并刷新锁文件，避免云端依赖本机目录。

## 打包和发布

```sh
pnpm build
pnpm pack:libs
pnpm verify:packages

# 也可以只打包、验证一个库
pnpm pack:libs qmdj-ts-lib
pnpm verify:packages qmdj-ts-lib
```

产物在 `artifacts/`，清单含版本、公开入口、文件列表与 SHA-256 / SHA-512。验证在临时目录安装真实压缩包，加载全部公开入口、抽查异步语料，并核对图片文件。

发布前递增需要更新的包自己的版本并提交，再重新打包和验证。GitHub Actions 的 **Release packages** 工作流可以选择一个包或全部包，完成检查后创建对应版本 Release。也可设置 `GITHUB_TOKEN` 后运行 `pnpm release:libs [包名]`。发布脚本要求打包时源码干净、打包提交与当前提交相同且已存在于远端；先创建草稿、上传并校验压缩包，再发布。同版本资产不可覆盖，重复运行只接受内容相同且关联同一源码提交的已有资产。

CI 对主分支和 Pull Request 执行类型检查、构建、测试、打包与隔离安装验证。

## 迁移与许可

### 命例资料

`mingli-cases-ts-lib` 将题目、答案/已知生平、上游预排盘拆为独立懒加载载荷；轻量索引不包含答案。BaziQA 固定上游提交的原始文件、来源说明与许可保留在该包 `docs/upstream/`，增加其他命例来源的方法见包内 README。未知的术数、时辰、时区保持未知，预排盘仅作为带口径说明的上游参考。

`react-8char`、`react-iztro`（Storybook）和现在线上的 `react-zwds` 提供常驻命例库入口，展开才加载；`react-liuren`、`react-qimen`、`react-tieban` 必须显式开启算命模式并展开入口才加载。关闭模式或更换当前命盘会清除参考。命例不会覆盖当前出生资料，其已知经历只在用户明确选取时作为单独的 AI 参考资料。

### 原六库迁移

迁移来源、保留的提交和前端对应关系见 [MIGRATION.md](MIGRATION.md)。六个原库的历史通过 subtree merge 导入，历史提交哈希保留。原来的独立仓库与本机目录保留作为迁移备份；后续维护以本仓库为准。

各包继续适用自己的 LICENSE / package.json 许可声明及资料来源说明，根仓库不把所有语料统一改成同一种许可。
