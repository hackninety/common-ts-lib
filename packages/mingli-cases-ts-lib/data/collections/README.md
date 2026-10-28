# 新增规范化来源/集合

本目录的每个 `.json` 会由 `scripts/gen-data.mjs` 自动注册，不需要改宿主 UI 或主入口代码。模板在 `docs/templates/canonical-collection.json`，是仅含四柱原文、没有公历日期或选择题的虚构格式示例；留在模板目录时不会进入题库。

1. 先确认来源和内容可用范围，填写 `source.url`、固定 `revision`、署名和 `license.code/content/notice`；不要把未知授权写成 MIT。有外部原件时按原字节放进 `docs/upstream/<sourceId>/` 并建立下述清单。只有作者自己编写的 canonical JSON、没有外部原件时可不建立该目录；此时 JSON 自身是原始输入，`revision` 使用自己的整理版本，`snapshotPath` 是将来存放外部原件清单的约定位置，不表示已经拥有该快照。
2. 复制模板为本目录 `<sourceId>--<collectionId>.json`，填写真实来源、集合、稳定 `personId`、原始出生精度/时区及资料。只有四柱时保留 `birth.raw`，未知公历年月日/小时/分钟/时区均用 null，不推算补齐。未知原术数必须 `method: unknown`、`methodRaw: null`。
3. 同一来源的所有文件使用完全一致的 `source` 对象。不同来源可以使用相同集合名，最终 ID 仍为 `sourceId/collectionId/personId/questionId`。不要按人物姓名或生日合并不同命例，也不要改已有 ID 来美化显示名称。
4. 人工主题填写 `topics` 并标记 `topicOrigin: manual`；原来源明确标注的主题使用 `source`。未分类填 `["unknown"]`。本适配器不会从答案或生平自动推断主题。
5. 题前明确提供的条件放 `context`。叙述案例使用 `questions: []`。有选择题时每项包含 `sourceQuestionId`、`number`（可为 null）、`prompt`、`options: [{label,text,raw}]` 及 `topics`。答案、事后生平、原注与整理备注只放 `answerData`；缺少已知结果时整个 `answerData` 可以省略。答案通过独立分块加载。
6. `answerData.answers` 的每项包含 `sourceQuestionId`、`primaryAnswer`、`acceptedAnswers` 和可为 null 的 `note`。无题叙述案例留空数组，以 `knownEvents` / `notes` 保存事验与原注。可选 `referenceCharts` 需按公开 `ReferenceCharts` 的引擎、口径、原对象字段填写，不能把重排结果冒充上游预排盘。
7. 运行本包 `pnpm gen`、`pnpm typecheck`、`pnpm build`、`pnpm test`。生成器检查 ID 冲突、选项与答案、时间空值及来源一致性，并校验已有原件目录。分块采用长度前缀，`a--b/c` 与 `a/b--c` 等合法来源/集合组合不会相互覆盖。全仓打包验证后由宿主更新包版本。

有原件时，`source.snapshotPath` 指向 `docs/upstream/<sourceId>/snapshot.json`。清单内文件路径相对此目录，必须覆盖所有原件（清单自身除外），包括原版权或许可说明；`collection.rawPath` 必须指向其中一个文件。生成器逐一检查字节数及 SHA-256，拒绝版本/来源不一致、未列原件和越界路径；原件目录非空但缺清单也会失败。清单格式如下，字节数和摘要须根据原文件实际计算，不能照抄示例：

```json
{
  "schemaVersion": 1,
  "sourceId": "my-source",
  "sourceUrl": "https://example.invalid/my-source",
  "revision": "edition-1",
  "files": [
    { "path": "cases/person-001.txt", "bytes": 123, "sha256": "填写原文件的64位小写SHA-256" },
    { "path": "LICENSE.txt", "bytes": 456, "sha256": "填写许可说明文件的64位小写SHA-256" }
  ]
}
```

构建只验证明确填写的授权信息与原件一致性，不代替确认内容使用许可。保留未知、未授权或待确认的原始权利状态，不应从代码许可证推导文本许可。

`scripts/canonical.mjs` 是已实现的通用规范化适配器。BaziQA 的专用适配器与快照锚点独立存在，新增规范化集合不会改变 BaziQA 的 167 / 1043 完整性要求。

出生注记可放在可选 birth.birthNotes 字符串数组中，只允许客观出生、时间和来源说明；任何事验、答案或论断必须仍放 answerData。精度另支持 interval-midpoint（区间中点）、unverified-clock（钟点未核实）和 placeholder（原件明确说明占位）；原始钟点可保留但不得冒充真实时刻。
