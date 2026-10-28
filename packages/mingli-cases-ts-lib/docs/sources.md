# 固定来源与扩充规则

初始来源：[ChenJiangxi/BaziQA](https://github.com/ChenJiangxi/BaziQA/tree/3bad3deaa5aa3a191c9c68b4d8b17f46decff45e)，提交 `3bad3deaa5aa3a191c9c68b4d8b17f46decff45e`。源码内 `docs/upstream/baziqa/snapshot.json` 记录 156 个原始文件的字节数与 SHA-256；数据、参考排盘、README、LICENSE、来源网页转写及题图、逐题转写稿均从该提交的 Git blob 原字节保存。该目录禁止 Git 行尾转换。快照 SHA-256 在每次生成前重新检查。

原始数据共 18 个集合：`hkjfma_2010` 至 `hkjfma_2020`，`contest8_2021` 至 `contest8_2026`，`celebrity50_zh`。保留原 `person_id` 与 `question_id`，加来源及集合前缀后作为稳定 ID；2017、2018、2020、2021 等集合的出生资料条数可能因同一官方命例拆分而多于计分命例数。原始 `case_no`、`scoring`、`corrections` 仍可查快照；本库不擅自合并出生资料或改写题目。

整理层唯一做法是确定性的字段重排、稳定 ID 命名、显式术数映射，以及基于题干关键词的主题索引。公开题干、选项 `raw`、原始出生行、上下文、答案和接受的多答案均原样保留。上游已经进行过简体转换和校订，本库不再改字；上游原文与校订依据同时保存在快照中。

来源和授权边界：上游 MIT 仅涵盖代码、转写和元数据；比赛题目原文仍归协会及出题老师，研究用途与商业授权说明保存在 LICENSE/NOTICE。名人资料的 `source_file` 只是上游文件名，不能转换成不存在的出处 URL；所有名人题目的答案来源为 `unspecified`，原术数为 `unknown`。比赛中未明确的原术数也保留 `unknown`。

出生口径：保存原时间文本、是否近似、时区、当时 UTC 偏移与夏令时状态。缺失小时/时区保持 null。参考图谱保留上游原对象，独立注明 lunar-python 1.4.8 / iztro 2.5.8、默认 `stated`、23:00 换日及上游备选口径。没有运行上游 `eval/run_baseline.py`，没有发起模型请求或重新计算排盘。

新增来源时应先冻结来源版本并保存权利说明、出处和原始文件哈希，再填写下述已实现的 canonical 入口；仅遇到不同的批量上游格式时才需要另写导入器。新来源使用新 `sourceId`，集合 ID 与原人物 ID 都进入稳定 ID；不能按生日或人物姓名自动合并。自整理事件的原术数、时间、时区、来源未知时均应明示未知，主题若人工标注使用 `topicOrigin: manual`，不能冒充上游标注。每次导入必须验证 ID 唯一性、完整数量、原文一致性和答案边界。

当前 `scripts/import-baziqa.mjs` 是 BaziQA 专用固定版本导入器；从被忽略的根 `.cache/baziqa` 读取不可变 Git blob，后续正常构建只读已提交快照。`scripts/gen-data.mjs` 编译所有集合为三个互不混合的载荷类别：`cases-*`、`answers-*`、`charts-*`。

持续扩充采用已实现的规范化入口 `data/collections/*.json` 与 `scripts/canonical.mjs`：每个文件包含来源、集合及命例，自动合并注册，无须改 UI。模板和步骤在 `docs/templates/canonical-collection.json`、`data/collections/README.md`。支持无题叙述、只有四柱原文、未知公历日期和明确标为 `manual` 的人工主题；不把示例自动混入正式库。BaziQA 的 167/1043 只锚定其自身快照，不限制新来源条数。验证用 `MINGLI_CASES_INPUT_DIR` / `MINGLI_CASES_OUTPUT_DIR` 可把候选输入和生成物放在临时目录，正常构建不设置这两项。

`scripts/snapshot.mjs` 校验新来源已保存的原件：清单的来源、固定版本、全部原件路径、字节数和 SHA-256 必须对应；有原件但缺清单、清单漏文件或内容漂移都会中止构建。纯自写 canonical 数据没有外部原件时允许不建快照目录，但仍必须提供真实整理来源、版本、署名和权利说明。清单存在与否不会被当作授权是否成立的证明。
