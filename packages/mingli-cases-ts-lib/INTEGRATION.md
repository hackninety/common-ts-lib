# 集成接口

主入口提供 `getSources`、`getCollections`、`getMethods`、`getTopics`、`getStats`、`getCaseIndex`、`loadCase`、`loadCaseAnswers`、`loadReferenceCharts` 与 `buildCasePrompt`。公开类型见 `src/types.ts`；提示词构造也可从 `mingli-cases-ts-lib/prompt` 单独导入。

`getCaseIndex({ sourceId, collectionId, year, method, topic, query })` 同步筛选轻量目录。集合 ID 在来源内唯一，命例稳定 ID 为 `source/collection/person`，题目 ID 进一步追加原题 ID。跨来源筛选集合时应同时传入 `sourceId`，不能假定人物姓名、生日或上游短题号在不同集合间唯一。

```ts
const library = await import('mingli-cases-ts-lib');
const candidates = library.getCaseIndex({ method: 'bazi' });
const study = await library.loadCase(candidates[0].id);
if (!study) throw new Error('案例不存在');

// 练习：不会自动读取答案。
const practicePrompt = library.buildCasePrompt(study);

// 用户明确点击揭晓以后才调用。
const answers = await library.loadCaseAnswers(study.meta.id);

// 用户明确选择“作为独立案例参考”以后再传给当前分析。
const referencePrompt = library.buildCasePrompt(study, { mode: 'reference', answers });
```

`practice` 是默认模式，即使误传入 `answers` 也不会输出答案、生平或整理者备注。`reference` 模式必须显式提供答案对象才包含答案，答案的 `caseId` 必须与命例匹配。输出固定声明独立命主的经历不能迁移为当前求测人的事实或预测。引用字段采用白名单，宿主追加的 `notes`、`knownEvents` 等不会被练习模式意外序列化。`maxChars` 默认 24000，最小 512；较小限制截断正文并保留开头的使用边界。

不得把缺失时区替换为 UTC+8、把时辰中点自动当成准确分钟，也不得默认扣夏令时或改换晚子时规则。宿主决定重排时应先展示原始出生资料、精度和已知时区；未知字段由用户核实。参考盘和宿主盘应分别标明引擎版本及时间口径。

`CaseStudy.answerVisibility` 为 `hidden`；`CaseAnswers.answerVisibility` 为 `included`。答案采用 `acceptedAnswers` 数组，2015 年第 18 题允许 B 或 D，不能仅比较单个 `primaryAnswer`。Celebrity50 的 `knownEvents` 是上游记载且缺少逐事件来源，不能包装成已独立核实的事实。

八字和紫微应用可在案例入口动态加载整库；其他工具只在用户进入算命模式并打开案例入口时加载。这个时机属于宿主 UI；数据包不会自行加载、发请求或把案例注入模型。
