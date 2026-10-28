# mingli-cases-ts-lib

可追溯的命理案例与选择题库，供八字、紫微及其他命理应用在需要时接入。浏览器可用，无 UI、排盘引擎、网络请求或模型 SDK 运行时依赖。

初始固定来源为 BaziQA `3bad3deaa5aa3a191c9c68b4d8b17f46decff45e`（上游数据版本 v2.3.0）：18 个集合、167 份出生资料、1043 道题。其中 17 届比赛有 117 份出生资料、555 题，Celebrity50 有 50 份资料、488 题。命主条目数与官方计分命例数不总相同，例如 `7a`、`7b` 是分别保存的出生资料；本包不实现官方比赛计分。

原题明确注明的术数按题数统计：八字 290、紫微 130、奇门 11、未注明 612。所有名人案例及比赛中未注明的原术数均保留 `unknown`，不会因为附带八字参考盘就被重新归类。

```ts
import { getCaseIndex, loadCase, buildCasePrompt } from 'mingli-cases-ts-lib';

const item = getCaseIndex({ method: 'bazi', year: 2026 })[0];
const study = await loadCase(item.id);
if (study) {
  console.log(study.questions);       // 题干与原选项，没有答案
  console.log(buildCasePrompt(study)); // 默认练习模式
}
```

`loadCaseAnswers(id)` 是单独的显式揭晓接口。正文、答案、参考排盘按集合或年份分成独立延迟加载块；调用 `loadCase` 不会加载答案块。浏览器交互上的隐藏不构成考试安全边界，公开包仍然包含可主动下载的答案。

BaziQA 主题由题干关键词推导，`topicOrigin` 明示这个来源；规则不读取选项正确性、名人生平或答案。没有命中时为 `unknown`。检索只使用标题、出生地和题干。`official` / `secondary` / `unspecified` 分别表示上游注明官方、转载或未说明的答案来源，数量为 365 / 190 / 488。

出生信息保留原写法与精度。时辰中点不是精确出生分钟；58 份资料没有时区，1 份没有出生小时，均不猜补。上游预排盘通过 `loadReferenceCharts` 单独读取，标记为 `upstream-reference`，保留 lunar-python 1.4.8、iztro 2.5.8 和 `stated` 等口径；不会替代宿主自己的盘。

接口及安全集成示例见 [INTEGRATION.md](INTEGRATION.md)。固定来源、权利边界和扩充规则见 [docs/sources.md](docs/sources.md)。原始文件与每文件 SHA-256 保存在源码仓库 `docs/upstream/baziqa/`，不进入发布包；构建不访问上游网络，也不运行上游评测基线。

新增自整理或古籍案例可直接把规范化 JSON 放入 `data/collections/` 自动注册；完整模板为 `docs/templates/canonical-collection.json`，注册和校验说明见 [data/collections/README.md](data/collections/README.md)。支持人工主题、只有四柱而没有公历年月日的资料，以及 `questions: []` 的叙述案例；事验与原注仍只放在显式揭晓的数据中。模板是虚构示例，默认不计入真实案例数。

许可证必须分别理解：库代码及上游转写/元数据采用 MIT；比赛题目原文版权仍归香港青年術數家協會及各出题老师。上游以研究用途收录，商业使用题目原文须联系主办方。完整说明见 LICENSE 与 NOTICE。

## 0.1.1 出生精度与公开注记

可选的 birth.birthNotes 仅保存经审核的出生、时间和出处说明，可在练习前显示；答案、已知生平和原始完整 notes 仍只由 loadCaseAnswers 揭晓。原件与其哈希不变。4 例时间区间中点标为 interval-midpoint；44 例 Celebrity50 的 12:00 标为 unverified-clock（钟点未核实），这是本库审计标注，并非上游声明这些时间一定是占位。原 hour/minute/raw/approximate 均保留。placeholder 仅供来源明确为占位的新增资料使用。不得由上述钟点推断精确出生分钟或确定时柱。

reference 模式本身不读取答案；只有调用方显式传入 answers 时才包含答案。practice 模式即使误传 answers 也会忽略它们。
